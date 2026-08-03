import React, { useEffect, useRef } from 'react';
import { Participant } from '../../types';
import { MicOff, VolumeX, Crown, UserX } from 'lucide-react';
import { clsx } from 'clsx';
import { useAudioVisualizer } from '../../hooks/useAudioVisualizer';

interface ParticipantCardProps {
  participant: Participant;
  isSelf: boolean;
  isDeafenedGlobal: boolean;
  localStream: MediaStream | null;
  onKick?: (socketId: string) => void;
  isHostSelf?: boolean;
}

export const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  isSelf,
  isDeafenedGlobal,
  localStream,
  onKick,
  isHostSelf = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Attach remote stream to HTML audio tag
  useEffect(() => {
    if (!isSelf && audioRef.current && participant?.audioStream) {
      audioRef.current.srcObject = participant.audioStream;
    }
  }, [participant?.audioStream, isSelf]);

  // Use Audio visualizer for volume detection
  const streamToMonitor = isSelf ? localStream : participant?.audioStream || null;
  const { volume, isSpeaking } = useAudioVisualizer(streamToMonitor, Boolean(participant?.isMuted));

  const safeName = participant?.displayName || 'Guest';
  const initial = safeName.charAt(0).toUpperCase();

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center justify-center p-6 rounded-2xl glass-card transition-all duration-200 group border',
        isSpeaking && !participant?.isMuted
          ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/20'
          : 'border-white/10'
      )}
    >
      {/* Remote Audio Track Player */}
      {!isSelf && (
        <audio
          ref={audioRef}
          autoPlay
          muted={isDeafenedGlobal || Boolean(participant?.isDeafened)}
        />
      )}

      {/* Host Crown & Control Options */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {participant?.isHost ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3 text-amber-400" />
            Host
          </span>
        ) : (
          <span />
        )}

        {isHostSelf && !isSelf && onKick && (
          <button
            onClick={() => onKick(participant.socketId)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            title="Kick participant"
          >
            <UserX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Avatar Container */}
      <div className="relative mb-4">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold text-slate-950 shadow-xl transition-transform duration-200"
          style={{ backgroundColor: participant?.avatarColor || '#00f2fe' }}
        >
          {initial}
        </div>

        {/* Dynamic Speaking Pulse Ring */}
        {isSpeaking && !participant?.isMuted && (
          <span
            className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75"
            style={{ animationDuration: `${Math.max(0.4, 1.5 - volume / 50)}s` }}
          />
        )}
      </div>

      {/* Display Name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-sm text-slate-100 max-w-[140px] truncate">
          {safeName} {isSelf && <span className="text-cyan-400 text-xs font-medium">(You)</span>}
        </span>
      </div>

      {/* Mic & Deafen Status Badges */}
      <div className="flex items-center gap-1.5">
        {participant?.isMuted && (
          <span className="p-1 rounded-md bg-rose-500/20 text-rose-400" title="Muted">
            <MicOff className="w-3.5 h-3.5" />
          </span>
        )}
        {participant?.isDeafened && (
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-400" title="Deafened">
            <VolumeX className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
};
