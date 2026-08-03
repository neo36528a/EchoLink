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
    if (!isSelf && audioRef.current && participant.audioStream) {
      audioRef.current.srcObject = participant.audioStream;
    }
  }, [participant.audioStream, isSelf]);

  // Use Audio visualizer for volume detection
  const streamToMonitor = isSelf ? localStream : participant.audioStream || null;
  const { volume, isSpeaking } = useAudioVisualizer(streamToMonitor, participant.isMuted);

  const initial = participant.displayName.charAt(0).toUpperCase();

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center justify-center p-6 rounded-2xl glass-card transition-all duration-200 group border',
        isSpeaking && !participant.isMuted
          ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/20'
          : 'border-white/10'
      )}
    >
      {/* Remote Audio Track Player */}
      {!isSelf && (
        <audio
          ref={audioRef}
          autoPlay
          muted={isDeafenedGlobal || participant.isDeafened}
        />
      )}

      {/* Host Crown & Control Options */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {participant.isHost ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> HOST
          </span>
        ) : (
          <div />
        )}

        {isHostSelf && !isSelf && onKick && (
          <button
            onClick={() => onKick(participant.socketId)}
            title="Kick participant"
            className="p-1 rounded-lg bg-rose-500/10 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 transition-all"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Avatar Container with Speaking Ring */}
      <div className="relative mb-4 mt-2">
        {/* Animated Speaking Ring */}
        <div
          className={clsx(
            'absolute -inset-2.5 rounded-full transition-all duration-200',
            isSpeaking && !participant.isMuted
              ? 'bg-emerald-400/30 animate-pulse-glow border border-emerald-400/60 scale-105'
              : 'opacity-0'
          )}
        />

        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-slate-950 shadow-inner border border-white/20 select-none"
          style={{ backgroundColor: participant.avatarColor || '#00f2fe' }}
        >
          {initial}
        </div>

        {/* Muted / Deafened Indicators */}
        <div className="absolute -bottom-1 -right-1 flex gap-1">
          {participant.isMuted && (
            <div className="p-1.5 rounded-full bg-rose-600 text-white shadow-md">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          )}
          {participant.isDeafened && (
            <div className="p-1.5 rounded-full bg-amber-600 text-white shadow-md">
              <VolumeX className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* Display Name */}
      <div className="flex items-center gap-1.5 max-w-full">
        <span className="text-sm font-semibold text-white truncate max-w-[130px]">
          {participant.displayName}
        </span>
        {isSelf && <span className="text-[10px] text-cyan-400 font-medium">(You)</span>}
      </div>

      {/* Voice Level Bar */}
      <div className="w-full bg-slate-900/60 rounded-full h-1.5 mt-3 overflow-hidden border border-white/5">
        <div
          className={clsx(
            'h-full transition-all duration-75',
            participant.isMuted
              ? 'bg-slate-700 w-0'
              : isSpeaking
              ? 'bg-emerald-400'
              : 'bg-cyan-500/40'
          )}
          style={{ width: participant.isMuted ? '0%' : `${volume}%` }}
        />
      </div>
    </div>
  );
};
