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
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
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
          const senders = pc.getSenders();
          const sender = senders.find((s) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack);
          } else {
            pc.addTrack(audioTrack, stream);
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
        pc.addTrack(track, localStreamRef.current!);
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
      setParticipants((prev) => {
        const next = new Map(prev);
        const peer = next.get(targetSocketId);
        if (peer) {
          next.set(targetSocketId, { ...peer, audioStream: remoteStream });
        }
        return next;
      });
    };

    // Connection state logging & cleanup on failure
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        pc.restartIce();
      }
    };

    return pc;
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (!roomCode) return;

    // Join room
    const guestId = localStorage.getItem('echolink_guest_id') || `guest_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('echolink_guest_id', guestId);

    initLocalAudio(audioSettings).then(() => {
      socket.emit('join_room', {
        roomCode,
        guestId,
        displayName,
        avatarColor,
      });
    });

    // 1. Initial participants list received
    socket.on('room_users', ({ users, selfInfo: me }: { users: Participant[]; selfInfo: Participant }) => {
      setSelfInfo(me);
      const initialMap = new Map<string, Participant>();
      users.forEach((u) => {
        initialMap.set(u.socketId, u);
        // Create peer connection and offer to each existing user
        const pc = createPeerConnection(u.socketId);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('webrtc_offer', {
              targetSocketId: u.socketId,
              offer: pc.localDescription,
              callerInfo: me,
            });
          })
          .catch((e) => console.error('Failed to create offer:', e));
      });
      setParticipants(initialMap);
    });

    // 2. New user joined
    socket.on('user_joined', (user: Participant) => {
      setParticipants((prev) => new Map(prev).set(user.socketId, user));
      createPeerConnection(user.socketId);
    });

    // 3. WebRTC signaling events
    socket.on('webrtc_offer', async ({ callerSocketId, offer, callerInfo }) => {
      if (callerInfo) {
        setParticipants((prev) => new Map(prev).set(callerSocketId, callerInfo));
      }
      const pc = createPeerConnection(callerSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', {
        targetSocketId: callerSocketId,
        answer: pc.localDescription,
      });
    });

    socket.on('webrtc_answer', async ({ responderSocketId, answer }) => {
      const pc = peersRef.current.get(responderSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('webrtc_candidate', async ({ senderSocketId, candidate }) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    });

    // 4. Media & Speaking events
    socket.on('user_media_state_changed', ({ socketId, isMuted: muted, isDeafened: deafened }) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) {
          next.set(socketId, { ...peer, isMuted: muted, isDeafened: deafened });
        }
        return next;
      });
    });

    socket.on('user_speaking', ({ socketId, isSpeaking: speaking }) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) {
          next.set(socketId, { ...peer, isSpeaking: speaking });
        }
        return next;
      });
    });

    // 5. User left
    socket.on('user_left', ({ socketId }: { socketId: string }) => {
      const pc = peersRef.current.get(socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketId);
      }
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    // 6. Host changed
    socket.on('host_changed', ({ newHostSocketId }: { newHostSocketId: string }) => {
      if (socket.id === newHostSocketId) {
        setSelfInfo((prev) => (prev ? { ...prev, isHost: true } : null));
      }
      setParticipants((prev) => {
        const next = new Map(prev);
        next.forEach((p, sid) => {
          next.set(sid, { ...p, isHost: sid === newHostSocketId });
        });
        return next;
      });
    });

    return () => {
      socket.emit('leave_room', { roomCode });
      socket.off('room_users');
      socket.off('user_joined');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_candidate');
      socket.off('user_media_state_changed');
      socket.off('user_speaking');
      socket.off('user_left');
      socket.off('host_changed');

      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomCode, displayName, avatarColor, socket, createPeerConnection, initLocalAudio, audioSettings]);

  // Mute / Unmute local mic
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // Toggle enablement
        setIsMuted(!isMuted);
        socket.emit('media_state_change', {
          roomCode,
          isMuted: !isMuted,
          isDeafened,
        });
      }
    }
  };

  // Deafen / Undeafen output
  const toggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    socket.emit('media_state_change', {
      roomCode,
      isMuted,
      isDeafened: nextDeafen,
    });
  };

  // Emit local speaking state
  const notifySpeakingState = useCallback((isSpeaking: boolean, level: number) => {
    socket.emit('speaking_state', {
      roomCode,
      isSpeaking,
      level,
    });
  }, [socket, roomCode]);

  // Host Kick user
  const kickParticipant = (targetSocketId: string) => {
    socket.emit('kick_participant', { roomCode, targetSocketId });
  };

  const updateAudioSettings = (newSettings: AudioSettings) => {
    setAudioSettings(newSettings);
    initLocalAudio(newSettings);
  };

  return {
    localStream,
    participants: Array.from(participants.values()),
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
