import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, PhoneOff } from 'lucide-react';
import { clsx } from 'clsx';

interface ControlsBarProps {
  isMuted: boolean;
  isDeafened: boolean;
  isChatOpen: boolean;
  unreadChatCount: number;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleChat: () => void;
  onOpenSettings: () => void;
  onLeaveRoom: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMuted,
  isDeafened,
  isChatOpen,
  unreadChatCount,
  onToggleMute,
  onToggleDeafen,
  onToggleChat,
  onOpenSettings,
  onLeaveRoom,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 p-2.5 rounded-2xl glass-panel shadow-2xl border border-white/10">
      {/* Microphone Mute Toggle */}
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        className={clsx(
          'p-3.5 rounded-xl transition-all duration-200 shadow-md flex items-center justify-center',
          isMuted
            ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/30'
            : 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-cyan-500/30 glow-border-cyan'
        )}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Speaker Deafen Toggle */}
      <button
        onClick={onToggleDeafen}
        title={isDeafened ? 'Undeafen Speaker' : 'Deafen Speaker'}
        className={clsx(
          'p-3.5 rounded-xl transition-all duration-200 shadow-md flex items-center justify-center',
          isDeafened
            ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-amber-600/30'
            : 'glass-card text-slate-200 hover:text-white hover:border-white/20'
        )}
      >
        {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      <div className="h-6 w-px bg-white/10 mx-1" />

      {/* Settings Modal Button */}
      <button
        onClick={onOpenSettings}
        title="Audio & Device Settings"
        className="p-3.5 rounded-xl glass-card text-slate-300 hover:text-cyan-400 hover:border-cyan-400/40 transition-colors"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Toggle Chat Drawer Button */}
      <button
        onClick={onToggleChat}
        title="Toggle Chat Drawer"
        className={clsx(
          'relative p-3.5 rounded-xl transition-colors',
          isChatOpen
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
            : 'glass-card text-slate-300 hover:text-white'
        )}
      >
        <MessageSquare className="w-5 h-5" />
        {!isChatOpen && unreadChatCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] text-[10px] font-bold text-slate-950 bg-cyan-400 rounded-full px-1">
            {unreadChatCount}
          </span>
        )}
      </button>

      <div className="h-6 w-px bg-white/10 mx-1" />

      {/* Leave Room Button */}
      <button
        onClick={onLeaveRoom}
        title="Leave Room"
        className="p-3.5 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all shadow-md"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
};
