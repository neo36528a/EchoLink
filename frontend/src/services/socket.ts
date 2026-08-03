import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocketUrl(): string {
  let rawUrl = ((import.meta as any).env?.VITE_BACKEND_URL || '').trim();
  if (!rawUrl) return typeof window !== 'undefined' ? window.location.origin : '';
  rawUrl = rawUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && rawUrl.startsWith('http://')) {
    rawUrl = rawUrl.replace('http://', 'https://');
  }
  return rawUrl;
}

export function getSocket(): Socket {
  if (!socket) {
    const URL = getSocketUrl();
    socket = io(URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
