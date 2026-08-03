import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { User, LogIn, Lock } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomCode?: string;
  onJoin: (roomCode: string, displayName: string, password?: string) => Promise<void>;
  requiresPassword?: boolean;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  initialRoomCode = '',
  onJoin,
  requiresPassword = false,
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [displayName, setDisplayName] = useState(localStorage.getItem('echolink_display_name') || '');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(requiresPassword);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialRoomCode) setRoomCode(initialRoomCode);
    if (requiresPassword) setShowPasswordInput(true);
  }, [initialRoomCode, requiresPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !displayName.trim()) return;
    setError('');
    setLoading(true);

    try {
      // Clean up room code if user pasted full URL
      let cleanInput = roomCode.trim();
      if (cleanInput.includes('/room/')) {
        cleanInput = cleanInput.split('/room/').pop() || cleanInput;
      }

      localStorage.setItem('echolink_display_name', displayName.trim());
      await onJoin(cleanInput, displayName.trim(), password.trim() || undefined);
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to join room.';
      setError(msg);
      if (msg.toLowerCase().includes('password')) {
        setShowPasswordInput(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Private Lounge">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Display Name (Guest)"
          placeholder="e.g. Guest User"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          icon={<User className="w-4 h-4" />}
          required
          autoFocus
        />

        <Input
          label="Room Code, Room Name, or Invite Link"
          placeholder="e.g. zone-8394-kt or Lounge Name"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          required
        />

        {showPasswordInput && (
          <Input
            label="Room Password"
            type="password"
            placeholder="Enter room password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />
        )}

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading} icon={<LogIn className="w-4 h-4" />}>
            Join Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};
