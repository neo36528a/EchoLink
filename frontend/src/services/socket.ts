import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const rawUrl = ((import.meta as any).env?.VITE_BACKEND_URL || '').trim();
    const URL = rawUrl ? rawUrl.replace(/\/+$/, '') : window.location.origin;
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
