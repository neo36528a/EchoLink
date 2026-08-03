import React from 'react';
import { Message } from '../../types';
import { Reply, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onReply,
  onDelete,
}) => {
  const isOwn = message.userId === currentUserId;
  const initial = message.displayName.charAt(0).toUpperCase();

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={clsx('flex gap-3 group px-2 py-1.5 rounded-xl hover:bg-white/[0.02] transition-colors', isOwn && 'flex-row-reverse')}>
      {/* User Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 shrink-0 shadow-md"
        style={{ backgroundColor: message.avatarColor || '#00f2fe' }}
      >
        {initial}
      </div>

      {/* Message Bubble Container */}
      <div className={clsx('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Author Name & Time Header */}
        <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">{message.displayName}</span>
          <span>{formatTime(message.createdAt)}</span>
        </div>

        {/* Reply Reference Preview */}
        {message.replyToAuthor && (
          <div className="mb-1.5 px-3 py-1 rounded-lg bg-white/5 border-l-2 border-cyan-400 text-xs text-slate-400">
            <span className="text-cyan-400 font-semibold">{message.replyToAuthor}: </span>
            <span className="italic">{message.replyToContent}</span>
          </div>
        )}

        {/* Text Content Bubble */}
        <div
          className={clsx(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-lg',
            isOwn
              ? 'bg-cyan-500 text-slate-950 rounded-tr-xs font-medium'
              : 'glass-card border border-white/10 text-slate-100 rounded-tl-xs'
          )}
        >
          {message.isDeleted ? <span className="italic text-slate-400 text-xs">This message was deleted.</span> : message.content}
        </div>

        {/* Message Actions (Reply & Delete) */}
        {!message.isDeleted && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 transition-opacity">
            <button
              onClick={() => onReply(message)}
              className="p-1 text-slate-400 hover:text-cyan-400 rounded-md hover:bg-white/5"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {isOwn && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-white/5"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
