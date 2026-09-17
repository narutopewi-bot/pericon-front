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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
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
  private isDeafened: boolean = false; // Mute all incoming audio
  private isSpeaking: boolean = false;
  private hasMicPermission: boolean = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private speakingTimeout: any = null;

  // States
  public peerStates: Record<number, VoicePeerState> = {};
  public onStateChange: VoiceStateChangeCallback | null = null;
  public onLocalMuteChange: LocalMuteChangeCallback | null = null;
  public onSpeakingChange: SpeakingChangeCallback | null = null;

  constructor() {}

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
      isMuted: false,
      isConnected: true,
    };

    // Listen to incoming voice signals from SignalR
    this.setupSignalRListeners();

    // Try to obtain microphone stream
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        this.hasMicPermission = true;
        this.setupAudioAnalysis();
      }
    } catch (err: any) {
      console.warn('[WebRTCVoice] Micrófono no concedido o no disponible (Modo Oyente activado):', err?.message);
      this.hasMicPermission = false;
      this.isMuted = true;
    }

    this.notifyState();
    return this.hasMicPermission;
  }

  private setupSignalRListeners() {
    if (!this.connection) return;

    // Handle VoiceSignalReceived2v2
    this.connection.off('VoiceSignalReceived2v2');
    this.connection.on('VoiceSignalReceived2v2', async (fromSeat: number, toSeat: number, signalJson: string) => {
      // If signal is specifically addressed to me, or broadcast (-1)
      if (toSeat !== -1 && toSeat !== this.mySeatIndex) return;
      if (fromSeat === this.mySeatIndex) return;

      try {
        const payload: VoiceSignalPayload = JSON.parse(signalJson);
        await this.handleIncomingSignal(fromSeat, payload);
      } catch (err) {
        console.error('[WebRTCVoice] Error procesando señal:', err);
      }
    });

    // Handle VoiceStateUpdated2v2
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
   * Called when a peer joins or when seats are refreshed
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

    // Politeness rule: the peer with LOWER seatIndex creates the Offer
    const isInitiator = this.mySeatIndex < targetSeatIndex;
    let pc = this.peerConnections.get(targetSeatIndex);

    if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) {
      try { pc.close(); } catch (e) {}
      this.peerConnections.delete(targetSeatIndex);
      pc = undefined;
    }

    if (pc) {
      // Ya conectado o en proceso de conexión
      return;
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

    // Add local audio track if available
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate event
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetSeatIndex, {
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Remote Track event (incoming audio from peer)
    pc.ontrack = (event) => {
      let audioEl = this.remoteAudioElements.get(targetSeatIndex);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.style.display = 'none';
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
      audioEl.play().catch(() => {
        // Autoplay policy: user interaction will resume
      });
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (this.peerStates[targetSeatIndex]) {
        this.peerStates[targetSeatIndex].isConnected = pc.connectionState === 'connected';
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
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(`[WebRTCVoice] Error aplicando candidate encolado:`, err);
        }
      }
    }
  }

  private async handleIncomingSignal(fromSeat: number, payload: VoiceSignalPayload) {
    let pc = this.peerConnections.get(fromSeat);
    if (!pc) {
      pc = this.createPeerConnection(fromSeat);
      this.peerConnections.set(fromSeat, pc);
    }

    if (payload.type === 'offer' && payload.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.drainCandidateQueue(fromSeat, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignal(fromSeat, {
        type: 'answer',
        sdp: answer,
      });
    } else if (payload.type === 'answer' && payload.sdp) {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await this.drainCandidateQueue(fromSeat, pc);
      }
    } else if (payload.type === 'candidate' && payload.candidate) {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          // Safe ignore candidate errors
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
      console.warn('[WebRTCVoice] Error enviando señal:', err);
    }
  }

  private setupAudioAnalysis() {
    if (!this.localStream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
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

        // Threshold for speaking detection (approx 12 on 0-255 scale)
        if (average > 14) {
          this.setSpeaking(true);
          if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
          this.speakingTimeout = setTimeout(() => {
            this.setSpeaking(false);
          }, 450);
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

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

    // Broadcast voice state to room via SignalR
    if (this.connection && this.roomName) {
      try {
        this.connection.invoke('BroadcastVoiceState2v2', this.roomName, this.mySeatIndex, speaking, this.isMuted);
      } catch (e) {}
    }
  }

  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;

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
