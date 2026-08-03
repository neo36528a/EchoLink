import React, { useState, useEffect, useRef } from 'react';
import { Message, Attachment } from '../../types';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { fetchRoomMessages } from '../../services/api';
import { getSocket } from '../../services/socket';
import { X, Search, MessageSquare, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  currentUserId: string;
  displayName: string;
  avatarColor: string;
  onUnreadCountChange: (count: number) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  roomCode,
  currentUserId,
  displayName,
  avatarColor,
  onUnreadCountChange,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const socket = getSocket();
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const isDrawerOpenRef = useRef(isOpen);
  isDrawerOpenRef.current = isOpen;

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  };

  // Fetch initial message history
  useEffect(() => {
    if (!roomCode) return;
    setLoading(true);
    fetchRoomMessages(roomCode)
      .then((history) => {
        setMessages(history);
        setTimeout(scrollToBottom, 100);
      })
      .finally(() => setLoading(false));
  }, [roomCode]);

  // Socket event listeners for real-time text chat
  useEffect(() => {
    if (!roomCode) return;

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(scrollToBottom, 50);

      if (!isDrawerOpenRef.current) {
        setMessages((currentMsgs) => {
          onUnreadCountChange(currentMsgs.length);
          return currentMsgs;
        });
      }
    });

    socket.on('user_typing', ({ displayName: user, isTyping }: { displayName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(user);
        else next.delete(user);
        return next;
      });
    });

    socket.on('message_edited', (editedMsg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === editedMsg.id ? editedMsg : m)));
    });

    socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('message_edited');
      socket.off('message_deleted');
    };
  }, [roomCode, socket, onUnreadCountChange]);

  // Reset unread count when opening drawer
  useEffect(() => {
    if (isOpen) {
      onUnreadCountChange(0);
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, onUnreadCountChange]);

  const handleSendMessage = (content: string, replyTarget?: Message | null) => {
    socket.emit('send_message', {
      roomCode,
      userId: currentUserId,
      displayName,
      avatarColor,
      content,
      replyTo: replyTarget ? { id: replyTarget.id, displayName: replyTarget.displayName, content: replyTarget.content } : null,
    });
  };

  const handleTyping = (isTyping: boolean) => {
    socket.emit('typing_indicator', { roomCode, displayName, isTyping });
  };

  const handleDeleteMessage = (messageId: string) => {
    socket.emit('delete_message', { roomCode, messageId });
  };

  // Filter messages by search query
  const filteredMessages = messages.filter(
    (m) =>
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={clsx(
        'fixed top-0 right-0 bottom-0 w-full sm:w-96 glass-panel border-l border-white/10 z-40 flex flex-col transition-transform duration-300 shadow-2xl',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Room Text Chat</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Message List */}
      <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 text-center p-4">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <span className="text-xs">No messages yet. Send a message to start chatting!</span>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              onReply={(m) => setReplyTo(m)}
              onDelete={handleDeleteMessage}
            />
          ))
        )}
      </div>

      {/* Typing Indicator Banner */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1 text-[11px] text-cyan-400 italic bg-cyan-500/5">
          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input Form */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};
