import React from 'react';

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🙌', '🚀', '😎', '🎮', '🎙️', '⚡', '💯', '👏', '💩', '👀', '✨'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div className="absolute bottom-14 right-4 z-40 p-3 glass-panel rounded-2xl shadow-2xl border border-white/10 grid grid-cols-4 gap-2 w-52 animate-in fade-in zoom-in-95">
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="text-xl p-2 rounded-xl hover:bg-white/10 transition-colors text-center"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
