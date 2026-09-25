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
export type VolumeChangeCallback = (volumePercent: number) => void;

interface VoiceSignalPayload {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// Servidores STUN y TURN de alta disponibilidad (Soporte universal para operadoras móviles CGNAT / NAT Simétrico)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:staticauth.openrelay.metered.ca:80' },
    {
      urls: 'turn:staticauth.openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayprojectsecret',
    },
    {
      urls: 'turn:staticauth.openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayprojectsecret',
    },
    {
      urls: 'turn:staticauth.openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayprojectsecret',
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

  // Puente de audio PCM ultraligero por SignalR (Red a prueba de operadoras móviles CGNAT / NAT Simétrico)
  private pcmProcessor: ScriptProcessorNode | null = null;
  private pcmSource: MediaStreamAudioSourceNode | null = null;
  private pcmSilenceGain: GainNode | null = null;
  private nextChunkPlayTimes: Map<number, number> = new Map();

  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private isSpeaking: boolean = false;
  private hasMicPermission: boolean = false;
  private isRequestingMic: boolean = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private speakingTimeout: any = null;

  // Estados y Callbacks
  public peerStates: Record<number, VoicePeerState> = {};
  public onStateChange: VoiceStateChangeCallback | null = null;
  public onLocalMuteChange: LocalMuteChangeCallback | null = null;
  public onSpeakingChange: SpeakingChangeCallback | null = null;
  public onLocalVolumeChange: VolumeChangeCallback | null = null;

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

  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext && AudioCtx) {
        this.audioContext = new AudioCtx();
      }
      return this.audioContext;
    } catch (e) {
      return null;
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

    // 1. Escuchar señales y eventos de voz desde SignalR (P2P + Puente de audio)
    this.setupSignalRListeners();

    // 2. Intentar solicitar micrófono de inmediato
    const micGranted = await this.requestMicrophone();
    if (!micGranted) {
      console.log('[WebRTCVoice] Micrófono en espera de activación del usuario.');
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

  /**
   * Prueba interactiva de altavoces / cornetas
   * Emite una campanada de 3 notas y desbloquea el AudioContext en el navegador
   */
  public async testSpeakers(): Promise<boolean> {
    try {
      const audioCtx = this.getAudioContext();
      if (!audioCtx) return false;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      // Tríada melodiosa mayor Do5 - Mi5 - Sol5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });

      this.resumeAllAudio();
      return true;
    } catch (err) {
      console.warn('[WebRTCVoice] Error en testSpeakers:', err);
      return false;
    }
  }

  public async requestMicrophone(): Promise<boolean> {
    if (this.isRequestingMic) return false;
    this.isRequestingMic = true;

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.resumeAllAudio();

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

          // Adjuntar track a todas las conexiones P2P activas
          this.peerConnections.forEach(async (pc, seatIdx) => {
            try {
              const senders = pc.getSenders();
              const audioSender = senders.find((s) => s.track?.kind === 'audio' || !s.track);
              if (audioSender) {
                await audioSender.replaceTrack(audioTrack);
              } else {
                pc.addTrack(audioTrack, this.localStream!);
              }

              if (this.mySeatIndex < seatIdx && pc.signalingState === 'stable') {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                this.sendSignal(seatIdx, {
                  type: 'offer',
                  sdp: offer,
                });
              }
            } catch (err) {
              console.warn(`[WebRTCVoice] Error asociando track con peer ${seatIdx}:`, err);
            }
          });
        }

        // Inicializar analizador de audio (Vúmetro)
        this.setupAudioAnalysis();

        // Inicializar puente de voz PCM ultraligero por SignalR
        this.setupPcmBridge();

        this.resumeAllAudio();
        this.notifyState();
        this.isRequestingMic = false;
        return true;
      }
    } catch (err: any) {
      console.warn('[WebRTCVoice] Acceso al micrófono rechazado o pendiente:', err?.message || err);
      this.hasMicPermission = false;
      this.isMuted = true;
      if (this.onLocalVolumeChange) this.onLocalVolumeChange(0);
      this.notifyState();
      this.isRequestingMic = false;
      return false;
    }

    this.isRequestingMic = false;
    return false;
  }

  public resumeAllAudio() {
    try {
      const audioCtx = this.getAudioContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      this.remoteAudioElements.forEach((audioEl) => {
        if (audioEl && audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      });
    } catch (e) {}
  }

  private setupPcmBridge() {
    if (!this.localStream) return;

    try {
      const audioCtx = this.getAudioContext();
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      if (this.pcmProcessor) {
        try {
          this.pcmProcessor.disconnect();
          this.pcmSource?.disconnect();
          this.pcmSilenceGain?.disconnect();
        } catch (_) {}
      }

      this.pcmSource = audioCtx.createMediaStreamSource(this.localStream);
      // Fragmentos de 2048 muestras (~43ms de latencia, 4KB por fragmento)
      this.pcmProcessor = audioCtx.createScriptProcessor(2048, 1, 1);

      this.pcmProcessor.onaudioprocess = (e) => {
        if (this.isMuted || !this.isSpeaking || !this.connection || !this.roomName) return;

        const input = e.inputBuffer.getChannelData(0);
        const len = input.length;
        const int16 = new Int16Array(len);
        for (let i = 0; i < len; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const uint8 = new Uint8Array(int16.buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8.length; i += chunkSize) {
          const sub = uint8.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, sub as any);
        }
        const base64 = btoa(binary);

        this.connection.invoke('SendVoiceChunk2v2', this.roomName, this.mySeatIndex, -1, base64).catch(() => {});
      };

      this.pcmSource.connect(this.pcmProcessor);
      this.pcmSilenceGain = audioCtx.createGain();
      this.pcmSilenceGain.gain.value = 0;
      this.pcmProcessor.connect(this.pcmSilenceGain);
      this.pcmSilenceGain.connect(audioCtx.destination);
    } catch (err) {
      console.warn('[WebRTCVoice] PCM bridge no inicializado:', err);
    }
  }

  private setupSignalRListeners() {
    if (!this.connection) return;

    // 1. Recibir señales de WebRTC P2P (offer, answer, candidate)
    this.connection.off('VoiceSignalReceived2v2');
    this.connection.on('VoiceSignalReceived2v2', async (fromSeat: number, toSeat: number, signalJson: string) => {
      if (toSeat !== -1 && toSeat !== this.mySeatIndex) return;
      if (fromSeat === this.mySeatIndex) return;

      try {
        const payload: VoiceSignalPayload = JSON.parse(signalJson);
        await this.handleIncomingSignal(fromSeat, payload);
      } catch (err) {
        console.error('[WebRTCVoice] Error procesando señal de voz:', err);
      }
    });

    // 2. Recibir fragmentos de voz directos por SignalR (Puente Infalible contra NAT Simétrico)
    this.connection.off('VoiceChunkReceived2v2');
    this.connection.on('VoiceChunkReceived2v2', async (fromSeat: number, toSeat: number, base64Data: string) => {
      if (fromSeat === this.mySeatIndex) return;
      if (toSeat !== -1 && toSeat !== this.mySeatIndex) return;
      if (this.isDeafened) return;

      // Si WebRTC P2P ya está conectado y fluyendo directamente con ese asiento, usar P2P
      const pc = this.peerConnections.get(fromSeat);
      const isP2PConnected = pc && pc.connectionState === 'connected';
      if (isP2PConnected) return;

      // Reproducir mediante puente directo de Web Audio
      this.playAudioChunk(fromSeat, base64Data);
    });

    // 3. Actualización de estado de habla y muteo
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
   * Reproduce un fragmento de audio PCM recibido por el puente de SignalR
   */
  private playAudioChunk(fromSeat: number, base64Data: string) {
    try {
      const audioCtx = this.getAudioContext();
      if (!audioCtx || audioCtx.state === 'closed') return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const sampleCount = int16.length;
      const float32 = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = audioCtx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      const nextTime = this.nextChunkPlayTimes.get(fromSeat) || now;
      const startTime = Math.max(now, nextTime);
      source.start(startTime);
      this.nextChunkPlayTimes.set(fromSeat, startTime + audioBuffer.duration);
    } catch (err) {}
  }

  /**
   * Conectar con un compañero o rival cuando entra a la sala
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

    let pc = this.peerConnections.get(targetSeatIndex);

    if (pc) {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        try { pc.close(); } catch (e) {}
        this.peerConnections.delete(targetSeatIndex);
        pc = undefined;
      } else {
        return;
      }
    }

    pc = this.createPeerConnection(targetSeatIndex);
    this.peerConnections.set(targetSeatIndex, pc);

    const isInitiator = this.mySeatIndex < targetSeatIndex;
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

    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch (e) {}

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

    // Re-negociación automática cuando cambian los tracks
    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== 'stable') return;
        const isInitiator = this.mySeatIndex < targetSeatIndex;
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.sendSignal(targetSeatIndex, {
            type: 'offer',
            sdp: offer,
          });
        }
      } catch (err) {
        console.warn(`[WebRTCVoice] Error en renegotiationneeded con peer ${targetSeatIndex}:`, err);
      }
    };

    // Manejo de ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetSeatIndex, {
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Manejo de recepción de audio del peer directo
    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);

      let audioEl = this.remoteAudioElements.get(targetSeatIndex);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        audioEl.setAttribute('playsinline', 'true');
        audioEl.setAttribute('webkit-playsinline', 'true');
        audioEl.style.position = 'fixed';
        audioEl.style.top = '-9999px';
        audioEl.style.left = '-9999px';
        audioEl.style.opacity = '0';
        audioEl.style.pointerEvents = 'none';
        document.body.appendChild(audioEl);
        this.remoteAudioElements.set(targetSeatIndex, audioEl);
      }

      audioEl.srcObject = stream;
      audioEl.muted = this.isDeafened;
      audioEl.volume = 1.0;

      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn(`[WebRTCVoice] Reproducción remota bloqueada por navegador para peer ${targetSeatIndex}. Reintentando con interacción...`, err);
          const retryOnInteraction = () => {
            audioEl?.play().catch(() => {});
            window.removeEventListener('click', retryOnInteraction);
            window.removeEventListener('touchstart', retryOnInteraction);
          };
          window.addEventListener('click', retryOnInteraction, { once: true });
          window.addEventListener('touchstart', retryOnInteraction, { once: true });
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

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        try {
          (pc as any).restartIce?.();
        } catch (e) {}
      }
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
        } catch (err) {}
      }
    }
  }

  private async handleIncomingSignal(fromSeat: number, payload: VoiceSignalPayload) {
    let pc = this.peerConnections.get(fromSeat);

    if (payload.type === 'offer' && payload.sdp) {
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
        } catch (err) {}
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
      this.connection.invoke('SendVoiceSignal2v2', this.roomName, this.mySeatIndex, toSeat, JSON.stringify(payload)).catch(() => {});
    } catch (err) {
      console.warn('[WebRTCVoice] Error enviando señal:', err);
    }
  }

  private setupAudioAnalysis() {
    if (!this.localStream) return;

    try {
      const audioCtx = this.getAudioContext();
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const source = audioCtx.createMediaStreamSource(this.localStream);
      this.analyser = audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || this.isMuted) {
          if (this.isSpeaking) {
            this.setSpeaking(false);
          }
          if (this.onLocalVolumeChange) {
            this.onLocalVolumeChange(0);
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

        // Medidor de volumen en porcentaje (0 a 100)
        const volumePercent = Math.min(100, Math.round((average / 80) * 100));
        if (this.onLocalVolumeChange) {
          this.onLocalVolumeChange(volumePercent);
        }

        // Umbral de detección de voz (>8)
        if (average > 8) {
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
        this.connection.invoke('BroadcastVoiceState2v2', this.roomName, this.mySeatIndex, speaking, this.isMuted).catch(() => {});
      } catch (e) {}
    }
  }

  public async toggleMute(): Promise<boolean> {
    this.resumeAllAudio();

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

    if (this.isMuted && this.onLocalVolumeChange) {
      this.onLocalVolumeChange(0);
    }

    if (this.onLocalMuteChange) {
      this.onLocalMuteChange(this.isMuted);
    }

    if (this.connection && this.roomName) {
      try {
        this.connection.invoke('BroadcastVoiceState2v2', this.roomName, this.mySeatIndex, false, this.isMuted).catch(() => {});
      } catch (e) {}
    }

    this.notifyState();
    return this.isMuted;
  }

  public toggleDeafen(): boolean {
    this.resumeAllAudio();
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

  private echoAudioEl: HTMLAudioElement | null = null;

  /**
   * Prueba interactiva de micrófono:
   * Captura el micrófono y reproduce la propia voz en vivo en los altavoces
   * para verificar que hardware, permisos y volumen funcionan al 100%.
   */
  public async startEchoTest(): Promise<boolean> {
    const granted = await this.requestMicrophone();
    if (!granted || !this.localStream) return false;

    if (!this.echoAudioEl) {
      this.echoAudioEl = document.createElement('audio');
      this.echoAudioEl.autoplay = true;
      (this.echoAudioEl as any).playsInline = true;
      this.echoAudioEl.setAttribute('playsinline', 'true');
      this.echoAudioEl.style.position = 'fixed';
      this.echoAudioEl.style.top = '-9999px';
      document.body.appendChild(this.echoAudioEl);
    }

    this.echoAudioEl.srcObject = this.localStream;
    this.echoAudioEl.muted = false;
    this.echoAudioEl.volume = 1.0;
    try {
      await this.echoAudioEl.play();
      return true;
    } catch (e) {
      console.warn('[WebRTCVoice] Error en eco de prueba:', e);
      return false;
    }
  }

  public stopEchoTest() {
    if (this.echoAudioEl) {
      this.echoAudioEl.pause();
      this.echoAudioEl.srcObject = null;
      try { this.echoAudioEl.remove(); } catch (_) {}
      this.echoAudioEl = null;
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

    if (this.pcmProcessor) {
      try {
        this.pcmProcessor.disconnect();
        this.pcmSource?.disconnect();
        this.pcmSilenceGain?.disconnect();
      } catch (_) {}
      this.pcmProcessor = null;
      this.pcmSource = null;
      this.pcmSilenceGain = null;
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
    this.nextChunkPlayTimes.clear();

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
      this.connection.off('VoiceChunkReceived2v2');
      this.connection.off('VoiceStateUpdated2v2');
    }
  }
}
