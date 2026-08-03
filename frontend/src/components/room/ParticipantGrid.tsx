import React from 'react';
import { Participant } from '../../types';
import { ParticipantCard } from './ParticipantCard';

interface ParticipantGridProps {
  participants: Participant[];
  selfInfo: Participant | null;
  isDeafenedGlobal: boolean;
  localStream: MediaStream | null;
  onKick?: (socketId: string) => void;
}

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  selfInfo,
  isDeafenedGlobal,
  localStream,
  onKick,
}) => {
  // Always provide a guaranteed fallback self participant so the grid is never blank
  const defaultSelf: Participant = {
    socketId: 'local_user',
    displayName: localStorage.getItem('echolink_display_name') || 'Guest',
    avatarColor: localStorage.getItem('echolink_avatar_color') || '#00f2fe',
    isHost: true,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
  };

  const currentUser = selfInfo || defaultSelf;
  const currentSocketId = currentUser.socketId;

  // Filter out duplicate self from remote participants list
  const remoteUsers = participants.filter((p) => {
    const sid = p.socketId || p.userId;
    return sid && sid !== currentSocketId && sid !== 'local_user';
  });

  const allUsers = [currentUser, ...remoteUsers];

  return (
    <div className="w-full h-full p-4 sm:p-6 overflow-y-auto flex flex-col justify-center items-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl w-full mx-auto">
        {allUsers.map((p, index) => {
          const sid = p.socketId || p.userId || p.guestId || `user_${index}`;
          const isSelf = sid === currentSocketId || (sid === 'local_user' && index === 0);
          return (
            <ParticipantCard
              key={sid}
              participant={p}
              isSelf={isSelf}
              isDeafenedGlobal={isDeafenedGlobal}
              localStream={localStream}
              onKick={onKick}
              isHostSelf={currentUser.isHost || false}
            />
          );
        })}
      </div>
    </div>
  );
};
