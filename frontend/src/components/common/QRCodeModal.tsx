import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Modal } from './Modal';
import { Button } from './Button';
import { Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, roomCode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = React.useState(false);
  const inviteUrl = `${window.location.origin}/room/${roomCode}`;

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, inviteUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#00f2fe',
          light: '#0f172a',
        },
      });
    }
  }, [isOpen, inviteUrl]);

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room QR Code & Invite" maxWidth="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs text-slate-300">
          Scan this QR code with a phone camera to join instantly!
        </p>

        <div className="p-3 bg-slate-900/90 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <canvas ref={canvasRef} className="rounded-lg" />
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="text-xs font-mono text-cyan-400 bg-slate-900/80 py-2 px-3 rounded-lg border border-white/10 select-all truncate">
            {inviteUrl}
          </div>

          <Button
            onClick={copyLink}
            variant="primary"
            className="w-full"
            icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied Invite Link!' : 'Copy Invite Link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
