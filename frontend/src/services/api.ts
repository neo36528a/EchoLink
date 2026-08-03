import { Room, Message, Attachment } from '../types';

const rawUrl = ((import.meta as any).env?.VITE_BACKEND_URL || '').trim();
const BACKEND_URL = rawUrl.replace(/\/+$/, '');
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export async function createRoom(data: { name: string; password?: string; autoDelete?: boolean }): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to create room');
  }
  return json.room;
}

export async function getRoom(roomCode: string): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Room not found');
  }
  return json.room;
}

export async function verifyRoomPassword(roomCode: string, password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json = await res.json();
  return res.ok && json.verified;
}

export async function fetchRoomMessages(roomCode: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/rooms/${roomCode}/messages`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    return [];
  }
  return json.messages;
}

export async function uploadFileAttachment(file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'File upload failed');
  }
  return json.attachment;
}
