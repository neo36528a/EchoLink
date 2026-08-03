import React, { useState, useEffect } from 'react';
import { Room, AudioSettings } from './types';
import { createRoom, getRoom, verifyRoomPassword } from './services/api';
import { useWebRTC } from './hooks/useWebRTC';
import { HeroSection } from './components/landing/HeroSection';
import { CreateRoomModal } from './components/landing/CreateRoomModal';
import { JoinRoomModal } from './components/landing/JoinRoomModal';
import { RoomHeader } from './components/room/RoomHeader';
import { ParticipantGrid } from './components/room/ParticipantGrid';
import { ControlsBar } from './components/room/ControlsBar';
import { AudioSettingsModal } from './components/room/AudioSettingsModal';
import { QRCodeModal } from './components/common/QRCodeModal';
import { ChatDrawer } from './components/chat/ChatDrawer';

const AVATAR_COLORS = ['#00f2fe', '#7f00ff', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#ec4899'];

export function App() {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [displayName, setDisplayName] = useState<string>(
    localStorage.getItem('echolink_display_name') || ''
  );
  const [avatarColor] = useState<string>(() => {
    const saved = localStorage.getItem('echolink_avatar_color');
    if (saved) return saved;
    const picked = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    localStorage.setItem('echolink_avatar_color', picked);
    return picked;
  });

  // Modal visibility states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(window.innerWidth >= 1024);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [initialJoinCode, setInitialJoinCode] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  // Check URL pathname for direct room link (e.g. /room/echo-4892-x9)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/room/')) {
      const code = path.split('/room/')[1];
      if (code) {
        getRoom(code)
          .then((room) => {
            setInitialJoinCode(room.roomCode);
            setRequiresPassword(!!room.hasPassword);
            setIsJoinOpen(true);
          })
          .catch((err) => {
            console.warn('Room not found from URL:', err);
            window.history.replaceState(null, '', '/');
          });
      }
    }
  }, []);

  // WebRTC Audio Engine Hook (Active inside room)
  const {
    localStream,
    participants,
    selfInfo,
    isMuted,
    isDeafened,
    audioSettings,
    toggleMute,
    toggleDeafen,
    kickParticipant,
    updateAudioSettings,
  } = useWebRTC(
    activeRoom?.roomCode || '',
    displayName || 'Guest',
    avatarColor
  );

  // Handlers
  const handleCreateRoom = async (name: string, password?: string, autoDelete?: boolean) => {
    const room = await createRoom({ name, password, autoDelete });
    const userDisplayName = displayName || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    setDisplayName(userDisplayName);
    localStorage.setItem('echolink_display_name', userDisplayName);

    setActiveRoom(room);
    window.history.pushState(null, '', `/room/${room.roomCode}`);
  };

  const handleJoinRoom = async (code: string, userDisplayName: string, password?: string) => {
    const room = await getRoom(code);
    if (room.hasPassword) {
      if (!password) {
        setRequiresPassword(true);
        throw new Error('Password required for this room.');
      }
      const verified = await verifyRoomPassword(code, password);
      if (!verified) throw new Error('Incorrect room password.');
    }

    setDisplayName(userDisplayName);
    localStorage.setItem('echolink_display_name', userDisplayName);
    setActiveRoom(room);
    window.history.pushState(null, '', `/room/${room.roomCode}`);
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
    window.history.pushState(null, '', '/');
  };

  const currentGuestId = localStorage.getItem('echolink_guest_id') || 'guest_user';

  return (
    <div className="relative min-h-screen flex flex-col bg-[#090d16] text-white overflow-hidden">
      {/* View 1: Room Workspace */}
      {activeRoom ? (
        <div className="relative flex flex-col flex-1 h-screen overflow-hidden">
          {/* Header */}
          <RoomHeader
            room={activeRoom}
            participantCount={participants.length + (selfInfo ? 1 : 0)}
            unreadChatCount={unreadChatCount}
            isChatOpen={isChatOpen}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenQR={() => setIsQROpen(true)}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Main Participant Grid */}
          <main className="flex-1 flex overflow-hidden">
            <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'mr-0 sm:mr-96' : 'mr-0'}`}>
              <ParticipantGrid
                participants={participants}
                selfInfo={selfInfo}
                isDeafenedGlobal={isDeafened}
                localStream={localStream}
                onKick={kickParticipant}
              />
            </div>

            {/* Sliding Text Chat Drawer */}
            <ChatDrawer
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              roomCode={activeRoom.roomCode}
              currentUserId={selfInfo?.socketId || currentGuestId}
              displayName={displayName}
              avatarColor={avatarColor}
              onUnreadCountChange={(count) => setUnreadChatCount(count)}
            />
          </main>

          {/* Voice Controls Bar */}
          <ControlsBar
            isMuted={isMuted}
            isDeafened={isDeafened}
            isChatOpen={isChatOpen}
            unreadChatCount={unreadChatCount}
            onToggleMute={toggleMute}
            onToggleDeafen={toggleDeafen}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Audio Settings Modal */}
          <AudioSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={audioSettings}
            onSave={updateAudioSettings}
            localStream={localStream}
          />

          {/* QR Code Modal */}
          <QRCodeModal
            isOpen={isQROpen}
            onClose={() => setIsQROpen(false)}
            roomCode={activeRoom.roomCode}
          />
        </div>
      ) : (
        /* View 2: Landing Hero Page */
        <main className="flex-1">
          <HeroSection
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenJoin={() => {
              setInitialJoinCode('');
              setRequiresPassword(false);
              setIsJoinOpen(true);
            }}
          />

          <CreateRoomModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onCreate={handleCreateRoom}
          />

          <JoinRoomModal
            isOpen={isJoinOpen}
            onClose={() => setIsJoinOpen(false)}
            initialRoomCode={initialJoinCode}
            requiresPassword={requiresPassword}
            onJoin={handleJoinRoom}
          />
        </main>
      )}
    </div>
  );
}
