import { HubConnection } from '@microsoft/signalr';

export interface VoicePeerState {
  seatIndex: number;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isConnected: boolean;
}

export type VoiceStateChangeCallback = (states: Record<number, VoicePeerState>) => void;
export type LocalMuteChangeCallback = (isMuted: boolean) => void;
export type SpeakingChangeCallback = (seatIndex: number, isSpeaking: boolean) => void;

interface VoiceSignalPayload {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// Configuración robusta de STUN y TURN (OpenRelay público + Google STUN)
// Imprescindible en Venezuela para conexiones móviles 4G/5G y NAT simétrico/CGNAT (CANTV, Movistar, Digitel, etc.)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCVoiceManager {
  private roomName: string = '';
  private mySeatIndex: number = -1;
  private myName: string = '';
  private connection: HubConnection | null = null;

  private localStream: MediaStream | null = null;
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<number, HTMLAudioElement> = new Map();
  private candidateQueues: Map<number, RTCIceCandidateInit[]> = new Map();

  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private isSpeaking: boolean = false;
  private hasMicPermission: boolean = false;
  private isRequestingMic: boolean = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private speakingTimeout: any = null;

  // Estados
  public peerStates: Record<number, VoicePeerState> = {};
  public onStateChange: VoiceStateChangeCallback | null = null;
  public onLocalMuteChange: LocalMuteChangeCallback | null = null;
  public onSpeakingChange: SpeakingChangeCallback | null = null;

  private boundInteractionHandler: () => void;

  constructor() {
    this.boundInteractionHandler = () => {
      this.resumeAllAudio();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', this.boundInteractionHandler, { passive: true });
      window.addEventListener('touchstart', this.boundInteractionHandler, { passive: true });
      window.addEventListener('keydown', this.boundInteractionHandler, { passive: true });
    }
  }

  public async init(
    roomName: string,
    mySeatIndex: number,
    myName: string,
    connection: HubConnection
  ): Promise<boolean> {
    this.roomName = roomName;
    this.mySeatIndex = mySeatIndex;
    this.myName = myName;
    this.connection = connection;

    this.peerStates[mySeatIndex] = {
      seatIndex: mySeatIndex,
      name: myName,
      isSpeaking: false,
      isMuted: this.isMuted,
      isConnected: true,
    };

    // Escuchar señales y eventos de voz desde SignalR
    this.setupSignalRListeners();

    // Intentar solicitar micrófono
    const micGranted = await this.requestMicrophone();
    if (!micGranted) {
      console.warn('[WebRTCVoice] Iniciado en modo oyente (micrófono apagado o pendiente de permiso)');
    }

    this.notifyState();
    return micGranted;
  }

  public updateSession(
    roomName: string,
    mySeatIndex: number,
    myName: string,
    connection: HubConnection
  ) {
    this.roomName = roomName;
    this.mySeatIndex = mySeatIndex;
    this.myName = myName;
    this.connection = connection;
    this.setupSignalRListeners();
  }

  public async requestMicrophone(): Promise<boolean> {
    if (this.isRequestingMic) return false;
    this.isRequestingMic = true;

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Detener stream anterior si existía
        if (this.localStream) {
          this.localStream.getTracks().forEach((t) => t.stop());
          this.localStream = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        this.localStream = stream;
        this.hasMicPermission = true;
        this.isMuted = false;

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;

          // Adjuntar track a todas las conexiones P2P activas sin romper la negociación
          this.peerConnections.forEach((pc, seatIdx) => {
            try {
              const senders = pc.getSenders();
              const audioSender = senders.find((s) => s.track?.kind === 'audio' || !s.track);
              if (audioSender) {
                audioSender.replaceTrack(audioTrack);
              } else {
                pc.addTrack(audioTrack, this.localStream!);
              }
            } catch (err) {
              console.warn(`[WebRTCVoice] Error asociando track con peer ${seatIdx}:`, err);
            }
          });
        }

        this.setupAudioAnalysis();
        this.resumeAllAudio();
        this.notifyState();
        this.isRequestingMic = false;
        return true;
      }
    } catch (err: any) {
      console.warn('[WebRTCVoice] No se pudo acceder al micrófono:', err?.message || err);
      this.hasMicPermission = false;
      this.isMuted = true;
      this.notifyState();
      this.isRequestingMic = false;
      return false;
    }

    this.isRequestingMic = false;
    return false;
  }

  public resumeAllAudio() {
    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.remoteAudioElements.forEach((audioEl) => {
        if (audioEl && audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      });
    } catch (e) {}
  }

  private setupSignalRListeners() {
    if (!this.connection) return;

    // Recibir señales de WebRTC (offer, answer, candidate)
    this.connection.off('VoiceSignalReceived2v2');
    this.connection.on('VoiceSignalReceived2v2', async (fromSeat: number, toSeat: number, signalJson: string) => {
      // Filtrar señales que no son para este asiento ni broadcast
      if (toSeat !== -1 && toSeat !== this.mySeatIndex) return;
      if (fromSeat === this.mySeatIndex) return;

      try {
        const payload: VoiceSignalPayload = JSON.parse(signalJson);
        await this.handleIncomingSignal(fromSeat, payload);
      } catch (err) {
        console.error('[WebRTCVoice] Error procesando señal de voz:', err);
      }
    });

    // Actualización de estado de habla y muteo
    this.connection.off('VoiceStateUpdated2v2');
    this.connection.on('VoiceStateUpdated2v2', (seatIndex: number, speaking: boolean, muted: boolean) => {
      if (seatIndex === this.mySeatIndex) return;

      if (!this.peerStates[seatIndex]) {
        this.peerStates[seatIndex] = {
          seatIndex,
          name: `Jugador ${seatIndex + 1}`,
          isSpeaking: speaking,
          isMuted: muted,
          isConnected: true,
        };
      } else {
        this.peerStates[seatIndex].isSpeaking = speaking;
        this.peerStates[seatIndex].isMuted = muted;
      }

      if (this.onSpeakingChange) {
        this.onSpeakingChange(seatIndex, speaking);
      }
      this.notifyState();
    });
  }

  /**
   * Conectar con un compañero o rival cuando entra al asiento
   */
  public async connectToPeer(targetSeatIndex: number, targetName: string) {
    if (targetSeatIndex === this.mySeatIndex) return;
    if (targetSeatIndex < 0 || targetSeatIndex > 3) return;

    if (!this.peerStates[targetSeatIndex]) {
      this.peerStates[targetSeatIndex] = {
        seatIndex: targetSeatIndex,
        name: targetName,
        isSpeaking: false,
        isMuted: false,
        isConnected: false,
      };
    }

    // Regla de cortesía WebRTC: el asiento de menor índice crea la Offer inicial
    const isInitiator = this.mySeatIndex < targetSeatIndex;
    let pc = this.peerConnections.get(targetSeatIndex);

    if (pc) {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        try { pc.close(); } catch (e) {}
        this.peerConnections.delete(targetSeatIndex);
        pc = undefined;
      } else {
        // Ya existe una conexión en proceso o conectada
        return;
      }
    }

    pc = this.createPeerConnection(targetSeatIndex);
    this.peerConnections.set(targetSeatIndex, pc);

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);

        this.sendSignal(targetSeatIndex, {
          type: 'offer',
          sdp: offer,
        });
      } catch (err) {
        console.error(`[WebRTCVoice] Error creando offer para asiento ${targetSeatIndex}:`, err);
      }
    }
  }

  private createPeerConnection(targetSeatIndex: number): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Siempre añadir un transceiver de audio en sendrecv
    // Así el SDP inicial reserva el canal de audio aunque el micrófono tarde unos segundos en activarse
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch (e) {
      // Fallback para navegadores antiguos
    }

    // Si ya disponemos de micrófono, asociar el track inmediatamente
    if (this.localStream) {
      const track = this.localStream.getAudioTracks()[0];
      if (track) {
        const senders = pc.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio' || !s.track);
        if (audioSender) {
          audioSender.replaceTrack(track);
        } else {
          pc.addTrack(track, this.localStream);
        }
      }
    }

    // Manejo de ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetSeatIndex, {
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Manejo de recepción de audio del peer
    pc.ontrack = (event) => {
      let audioEl = this.remoteAudioElements.get(targetSeatIndex);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        // Posicionamiento invisible fuera de pantalla en vez de display:none para evitar throttling en WebKit/iOS
        audioEl.style.position = 'fixed';
        audioEl.style.top = '-9999px';
        audioEl.style.left = '-9999px';
        audioEl.style.opacity = '0';
        audioEl.style.pointerEvents = 'none';
        document.body.appendChild(audioEl);
        this.remoteAudioElements.set(targetSeatIndex, audioEl);
      }

      if (event.streams && event.streams[0]) {
        audioEl.srcObject = event.streams[0];
      } else {
        const inboundStream = new MediaStream([event.track]);
        audioEl.srcObject = inboundStream;
      }

      audioEl.muted = this.isDeafened;
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Autoplay policy bloqueado; se reactivará al primer clic
          console.log(`[WebRTCVoice] Autoplay pendiente de interacción de usuario para asiento ${targetSeatIndex}`);
        });
      }
    };

    // Cambios de estado de conexión P2P
    pc.onconnectionstatechange = () => {
      const isConnected = pc.connectionState === 'connected';
      if (this.peerStates[targetSeatIndex]) {
        this.peerStates[targetSeatIndex].isConnected = isConnected;
      }
      this.notifyState();
    };

    return pc;
  }

  private async drainCandidateQueue(targetSeatIndex: number, pc: RTCPeerConnection) {
    const queue = this.candidateQueues.get(targetSeatIndex);
    if (!queue || queue.length === 0) return;

    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Ignorar error seguro de candidato desactualizado
        }
      }
    }
  }

  private async handleIncomingSignal(fromSeat: number, payload: VoiceSignalPayload) {
    let pc = this.peerConnections.get(fromSeat);

    if (payload.type === 'offer' && payload.sdp) {
      // Si ya existía una conexión en estado no estable, recrearla limpiamente
      if (pc && pc.signalingState !== 'stable') {
        try { pc.close(); } catch (e) {}
        pc = undefined;
      }

      if (!pc) {
        pc = this.createPeerConnection(fromSeat);
        this.peerConnections.set(fromSeat, pc);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.drainCandidateQueue(fromSeat, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignal(fromSeat, {
        type: 'answer',
        sdp: answer,
      });
      return;
    }

    if (!pc) {
      pc = this.createPeerConnection(fromSeat);
      this.peerConnections.set(fromSeat, pc);
    }

    if (payload.type === 'answer' && payload.sdp) {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await this.drainCandidateQueue(fromSeat, pc);
      }
    } else if (payload.type === 'candidate' && payload.candidate) {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          // Ignorar seguro
        }
      } else {
        if (!this.candidateQueues.has(fromSeat)) {
          this.candidateQueues.set(fromSeat, []);
        }
        this.candidateQueues.get(fromSeat)!.push(payload.candidate);
      }
    }
  }

  private sendSignal(toSeat: number, payload: VoiceSignalPayload) {
    if (!this.connection || !this.roomName) return;
    try {
      this.connection.invoke('SendVoiceSignal2v2', this.roomName, this.mySeatIndex, toSeat, JSON.stringify(payload));
    } catch (err) {
      console.warn('[WebRTCVoice] Error enviando señal de voz:', err);
    }
  }

  private setupAudioAnalysis() {
    if (!this.localStream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || this.isMuted) {
          if (this.isSpeaking) {
            this.setSpeaking(false);
          }
          this.animFrameId = requestAnimationFrame(checkVolume);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Umbral de detección de voz (>10)
        if (average > 10) {
          this.setSpeaking(true);
          if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
          this.speakingTimeout = setTimeout(() => {
            this.setSpeaking(false);
          }, 450);
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      checkVolume();
    } catch (err) {
      console.warn('[WebRTCVoice] Análisis de audio no disponible:', err);
    }
  }

  private setSpeaking(speaking: boolean) {
    if (this.isSpeaking === speaking) return;
    this.isSpeaking = speaking;

    if (this.peerStates[this.mySeatIndex]) {
      this.peerStates[this.mySeatIndex].isSpeaking = speaking;
    }

    if (this.onSpeakingChange) {
      this.onSpeakingChange(this.mySeatIndex, speaking);
    }

    // Transmitir cambio de voz a la sala
    if (this.connection && this.roomName) {
      try {
        this.connection.invoke('BroadcastVoiceState2v2', this.roomName, this.mySeatIndex, speaking, this.isMuted);
      } catch (e) {}
    }
  }

  public async toggleMute(): Promise<boolean> {
    // Si no tiene micrófono o permiso, solicitarlo al hacer clic
    if (!this.localStream || !this.hasMicPermission) {
      const granted = await this.requestMicrophone();
      if (!granted) {
        this.isMuted = true;
        this.notifyState();
        return true;
      }
      this.isMuted = false;
      this.notifyState();
      return false;
    }

    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });

    if (this.peerStates[this.mySeatIndex]) {
      this.peerStates[this.mySeatIndex].isMuted = this.isMuted;
    }

    if (this.isMuted && this.isSpeaking) {
      this.setSpeaking(false);
    }

    if (this.onLocalMuteChange) {
      this.onLocalMuteChange(this.isMuted);
    }

    if (this.connection && this.roomName) {
      try {
        this.connection.invoke('BroadcastVoiceState2v2', this.roomName, this.mySeatIndex, false, this.isMuted);
      } catch (e) {}
    }

    this.notifyState();
    return this.isMuted;
  }

  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    this.remoteAudioElements.forEach((audioEl) => {
      audioEl.muted = this.isDeafened;
    });
    return this.isDeafened;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  public getHasMicPermission(): boolean {
    return this.hasMicPermission;
  }

  public setPeerVolume(seatIndex: number, volume: number) {
    const audioEl = this.remoteAudioElements.get(seatIndex);
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.peerStates });
    }
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', this.boundInteractionHandler);
      window.removeEventListener('touchstart', this.boundInteractionHandler);
      window.removeEventListener('keydown', this.boundInteractionHandler);
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    this.peerConnections.clear();
    this.candidateQueues.clear();

    this.remoteAudioElements.forEach((audioEl) => {
      try {
        audioEl.srcObject = null;
        audioEl.remove();
      } catch (e) {}
    });
    this.remoteAudioElements.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
    }

    if (this.connection) {
      this.connection.off('VoiceSignalReceived2v2');
      this.connection.off('VoiceStateUpdated2v2');
    }
  }
}
