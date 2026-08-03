import React, { useState } from 'react';
import { Room } from '../../types';
import { Button } from '../common/Button';
import { Copy, QrCode, Settings, MessageSquare, Users, Check, PhoneOff, Radio } from 'lucide-react';

interface RoomHeaderProps {
  room: Room;
  participantCount: number;
  unreadChatCount: number;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onOpenSettings: () => void;
  onOpenQR: () => void;
  onLeaveRoom: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  room,
  participantCount,
  unreadChatCount,
  isChatOpen,
  onToggleChat,
  onOpenSettings,
  onOpenQR,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const copyInvite = () => {
    const inviteUrl = `${window.location.origin}/room/${room.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full glass-panel border-b border-white/10 px-4 py-3 flex items-center justify-between z-20">
      {/* Left Brand & Room Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-lg tracking-wider">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">EchoLink</span>
        </div>

        <div className="h-5 w-px bg-white/10 hidden sm:block" />

        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-white leading-none truncate max-w-[150px] sm:max-w-[250px]">
            {room.name}
          </h2>
          <span className="text-[10px] text-cyan-400 font-mono mt-0.5">#{room.roomCode}</span>
        </div>
      </div>

      {/* Right Controls & Actions */}
      <div className="flex items-center gap-2">
        {/* Copy Invite Link */}
        <Button
          onClick={copyInvite}
          variant="glass"
          size="sm"
          icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        >
          <span className="hidden md:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
        </Button>

        {/* QR Code Modal Trigger */}
        <button
          onClick={onOpenQR}
          title="Show Room QR Code"
          className="p-2 rounded-xl glass-card text-slate-300 hover:text-cyan-400 transition-colors"
        >
          <QrCode className="w-4 h-4" />
        </button>

        {/* Participant Count */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-card text-xs text-slate-300 font-medium">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{participantCount}</span>
        </div>

        {/* Audio Settings */}
        <button
          onClick={onOpenSettings}
          title="Audio & Device Settings"
          className="p-2 rounded-xl glass-card text-slate-300 hover:text-cyan-400 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Chat Toggle with Unread Badge */}
        <button
          onClick={onToggleChat}
          title="Toggle Text Chat"
          className={`relative p-2 rounded-xl glass-card transition-colors ${
            isChatOpen ? 'text-cyan-400 border-cyan-400/40' : 'text-slate-300 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {!isChatOpen && unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-slate-950 bg-cyan-400 rounded-full px-1">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Leave Room Button */}
        <Button onClick={onLeaveRoom} variant="danger" size="sm" icon={<PhoneOff className="w-3.5 h-3.5" />}>
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>
    </header>
  );
};
