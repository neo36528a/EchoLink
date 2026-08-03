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
  const allUsers = selfInfo
    ? [selfInfo, ...participants.filter((p) => p.socketId !== selfInfo.socketId)]
    : participants;

  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {allUsers.map((p) => {
          const isSelf = selfInfo ? p.socketId === selfInfo.socketId : false;
          return (
            <ParticipantCard
              key={p.socketId || p.guestId}
              participant={p}
              isSelf={isSelf}
              isDeafenedGlobal={isDeafenedGlobal}
              localStream={localStream}
              onKick={onKick}
              isHostSelf={selfInfo?.isHost || false}
            />
          );
        })}
      </div>
    </div>
  );
};
