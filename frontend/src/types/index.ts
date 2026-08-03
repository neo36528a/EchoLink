export interface Room {
  id: string;
  roomCode: string;
  name: string;
  isPrivate: boolean;
  hasPassword?: boolean;
  maxParticipants: number;
  autoDelete: boolean;
  createdAt: string;
}

export interface Participant {
  socketId: string;
  guestId?: string;
  userId?: string;
  displayName: string;
  avatarColor?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isMicOn?: boolean;
  isCamOn?: boolean;
  isDeafened?: boolean;
  isHandRaised?: boolean;
  isSpeaking?: boolean;
  joinedAt?: string;
  audioStream?: MediaStream;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface Message {
  id: string;
  roomId?: string;
  roomCode?: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  content: string;
  replyToId?: string | null;
  replyToAuthor?: string | null;
  replyToContent?: string | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  attachments?: Attachment[];
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface AudioSettings {
  selectedMic: string;
  selectedSpeaker: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}
