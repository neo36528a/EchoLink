import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Lock, Sparkles } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, password?: string, autoDelete?: boolean) => Promise<void>;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [autoDelete, setAutoDelete] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      await onCreate(name.trim(), password.trim() || undefined, autoDelete);
      setName('');
      setPassword('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Connecting to server... If Render is starting up, please try again in a few seconds.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Instant Private Room">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Room Name"
          placeholder="e.g. Valorant Squad / Study Lounge"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Password (Optional)"
          type="password"
          placeholder="Leave blank for public guest access"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
        />

        <div className="flex items-center justify-between p-3 rounded-xl glass-card border border-white/5">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Auto-delete when empty</span>
            <span className="text-[11px] text-slate-400">Destroys room automatically after all users leave</span>
          </div>
          <input
            type="checkbox"
            checked={autoDelete}
            onChange={(e) => setAutoDelete(e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-400 bg-slate-900 cursor-pointer"
          />
        </div>

        {error && (
          <div className="p-3 text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-medium leading-relaxed">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading} icon={<Sparkles className="w-4 h-4" />}>
            Create & Launch
          </Button>
        </div>
      </form>
    </Modal>
  );
};
