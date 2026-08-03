import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { Participant, AudioSettings } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC(roomCode: string, displayName: string, avatarColor: string) {
  const [participantsMap, setParticipantsMap] = useState<Map<string, Participant>>(new Map());
  const [selfInfo, setSelfInfo] = useState<Participant | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    selectedMic: 'default',
    selectedSpeaker: 'default',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });

  const socket = getSocket();
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize Local Microphone Stream
  const initLocalAudio = useCallback(async (settings: AudioSettings) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: settings.selectedMic !== 'default' ? { exact: settings.selectedMic } : undefined,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
        },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Replace audio track on existing peer connections
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        peersRef.current.forEach((pc) => {
          try {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(audioTrack);
            } else {
              pc.addTrack(audioTrack, stream);
            }
          } catch (e) {
            console.warn('Track addition warning:', e);
          }
        });
      }

      return stream;
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      return null;
    }
  }, []);

  // Create Peer Connection for remote user
  const createPeerConnection = useCallback((targetSocketId: string) => {
    if (peersRef.current.has(targetSocketId)) {
      return peersRef.current.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(targetSocketId, pc);

    // Add local tracks to PC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch (e) {
          console.warn('Failed to add track:', e);
        }
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Track Handler
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setParticipantsMap((prev) => {
        const next = new Map(prev);
        const peer = next.get(targetSocketId);
        if (peer) {
          next.set(targetSocketId, { ...peer, audioStream: remoteStream });
        }
        return next;
      });
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        try {
          pc.restartIce();
        } catch (e) {
          console.warn('ICE restart warning:', e);
        }
      }
    };

    return pc;
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (!roomCode) return;

    initLocalAudio(audioSettings).then(() => {
      socket.emit('join_room', {
        roomCode,
        displayName: displayName || 'Guest',
        isMicOn: !isMuted,
        isCamOn: false,
      });
    });

    // 1. Successfully joined room
    socket.on('room_joined', (data: any) => {
      const participantList: any[] = data?.participants || [];
      const yourSocketId: string = data?.yourSocketId || socket.id;

      const initialMap = new Map<string, Participant>();
      let self: Participant | null = null;

      participantList.forEach((p: any) => {
        const sid = p.socketId || p.userId || p.id;
        const normalizedParticipant: Participant = {
          socketId: sid,
          userId: sid,
          displayName: p.displayName || 'Guest',
          avatarColor: p.avatarColor || '#00f2fe',
          isHost: Boolean(p.isHost),
          isMuted: Boolean(p.isMuted || p.isMicOn === false),
          isDeafened: Boolean(p.isDeafened),
          isSpeaking: Boolean(p.isSpeaking),
          audioStream: p.audioStream,
        };

        if (sid === yourSocketId || sid === socket.id) {
          self = normalizedParticipant;
        } else {
          initialMap.set(sid, normalizedParticipant);
          // Create peer connection and send offer to existing participants
          const pc = createPeerConnection(sid);
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              socket.emit('webrtc_offer', {
                targetSocketId: sid,
                offer: pc.localDescription,
              });
            })
            .catch((e) => console.warn('Failed to create offer:', e));
        }
      });

      if (!self) {
        self = {
          socketId: yourSocketId || socket.id || 'local_user',
          userId: yourSocketId || socket.id || 'local_user',
          displayName: displayName || 'Guest',
          avatarColor: avatarColor || '#00f2fe',
          isHost: true,
          isMuted,
          isDeafened: false,
          isSpeaking: false,
        };
      }

      setSelfInfo(self);
      setParticipantsMap(initialMap);
    });

    // 2. New user joined room
    socket.on('user_joined', ({ participant }: { participant: any }) => {
      if (!participant) return;
      const sid = participant.socketId || participant.userId || participant.id;
      const normalizedParticipant: Participant = {
        socketId: sid,
        userId: sid,
        displayName: participant.displayName || 'Guest',
        avatarColor: participant.avatarColor || '#7f00ff',
        isHost: Boolean(participant.isHost),
        isMuted: Boolean(participant.isMuted || participant.isMicOn === false),
        isDeafened: Boolean(participant.isDeafened),
        isSpeaking: Boolean(participant.isSpeaking),
      };

      setParticipantsMap((prev) => {
        const next = new Map(prev);
        next.set(sid, normalizedParticipant);
        return next;
      });
      createPeerConnection(sid);
    });

    // 3. WebRTC signaling events safely wrapped
    socket.on('webrtc_offer', async ({ senderSocketId, offer }: { senderSocketId: string; offer: RTCSessionDescriptionInit }) => {
      try {
        const pc = createPeerConnection(senderSocketId);
        if (pc.signalingState !== 'stable') return;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', {
          targetSocketId: senderSocketId,
          answer: pc.localDescription,
        });
      } catch (e) {
        console.warn('WebRTC offer error handled:', e);
      }
    });

    socket.on('webrtc_answer', async ({ senderSocketId, answer }: { senderSocketId: string; answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peersRef.current.get(senderSocketId);
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (e) {
        console.warn('WebRTC answer error handled:', e);
      }
    });

    socket.on('webrtc_candidate', async ({ senderSocketId, candidate }: { senderSocketId: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peersRef.current.get(senderSocketId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.warn('ICE candidate error handled:', e);
      }
    });

    // 4. Media & Speaking state changes
    socket.on('user_media_changed', ({ socketId, isMicOn: mic, isCamOn: cam, isHandRaised: hand }: { socketId: string; isMicOn: boolean; isCamOn: boolean; isHandRaised?: boolean }) => {
      setParticipantsMap((prev) => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) {
          next.set(socketId, { ...peer, isMuted: !mic, isMicOn: mic, isCamOn: cam, isHandRaised: Boolean(hand) });
        }
        return next;
      });
    });

    socket.on('user_speaking_changed', ({ socketId, isSpeaking: speaking }: { socketId: string; isSpeaking: boolean }) => {
      setParticipantsMap((prev) => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) {
          next.set(socketId, { ...peer, isSpeaking: speaking });
        }
        return next;
      });
    });

    // 5. User left or kicked
    socket.on('user_left', ({ socketId }: { socketId: string }) => {
      const pc = peersRef.current.get(socketId);
      if (pc) {
        try {
          pc.close();
        } catch (e) {
          console.warn('PC close warning:', e);
        }
        peersRef.current.delete(socketId);
      }
      setParticipantsMap((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on('kicked_from_room', () => {
      alert('You were removed from the room.');
      window.location.href = '/';
    });

    return () => {
      socket.emit('leave_room', { roomCode });
      socket.off('room_joined');
      socket.off('user_joined');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_candidate');
      socket.off('user_media_changed');
      socket.off('user_speaking_changed');
      socket.off('user_left');
      socket.off('kicked_from_room');

      peersRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch (e) {
          console.warn('PC cleanup warning:', e);
        }
      });
      peersRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomCode, displayName, avatarColor, socket, createPeerConnection, initLocalAudio, audioSettings, isMuted]);

  // Mute / Unmute local mic
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // Toggle enablement
        setIsMuted(!isMuted);
        socket.emit('media_state_change', {
          isMicOn: isMuted,
          isCamOn: false,
        });
      }
    }
  };

  // Deafen / Undeafen output
  const toggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    socket.emit('media_state_change', {
      isMicOn: !isMuted,
      isCamOn: false,
    });
  };

  // Emit local speaking state
  const notifySpeakingState = useCallback((isSpeaking: boolean) => {
    socket.emit('speaking_state', { isSpeaking });
  }, [socket]);

  // Host Kick user
  const kickParticipant = (targetSocketId: string) => {
    socket.emit('kick_participant', { targetSocketId });
  };

  const updateAudioSettings = (newSettings: AudioSettings) => {
    setAudioSettings(newSettings);
    initLocalAudio(newSettings);
  };

  return {
    localStream,
    participants: Array.from(participantsMap.values()),
    selfInfo,
    isMuted,
    isDeafened,
    audioSettings,
    toggleMute,
    toggleDeafen,
    notifySpeakingState,
    kickParticipant,
    updateAudioSettings,
  };
}
