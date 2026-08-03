import React, { useState, useRef } from 'react';
import { Message } from '../../types';
import { Send, Smile, X } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

interface MessageInputProps {
  onSendMessage: (content: string, replyTo?: Message | null) => void;
  onTyping: (isTyping: boolean) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  replyTo,
  onCancelReply,
}) => {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Typing notification trigger
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSendMessage(content.trim(), replyTo);
    setContent('');
    onCancelReply();
    onTyping(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="relative p-3 border-t border-white/10 bg-slate-900/80 backdrop-blur-md">
      {/* Reply Banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs">
          <div className="truncate">
            <span className="text-cyan-400 font-semibold">Replying to {replyTo.displayName}: </span>
            <span className="text-slate-300 italic">{replyTo.content}</span>
          </div>
          <button onClick={onCancelReply} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmoji && (
        <div className="absolute bottom-16 right-4 z-50">
          <EmojiPicker onSelect={handleSelectEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
          title="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Input Text Box */}
        <input
          type="text"
          placeholder="Type a message..."
          value={content}
          onChange={handleTextChange}
          className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!content.trim()}
          className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
