import { Room, Message, Attachment } from '../types';

function getBackendUrl(): string {
  let rawUrl = ((import.meta as any).env?.VITE_BACKEND_URL || '').trim();
  if (!rawUrl) return '';
  rawUrl = rawUrl.replace(/\/+$/, '');
  // Auto-upgrade http to https when on secure page
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && rawUrl.startsWith('http://')) {
    rawUrl = rawUrl.replace('http://', 'https://');
  }
  return rawUrl;
}

const BACKEND_URL = getBackendUrl();
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export async function createRoom(data: { name: string; password?: string; autoDelete?: boolean }): Promise<Room> {
  try {
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
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to backend server. Make sure VITE_BACKEND_URL in Vercel is set to your Render URL (https://...).`);
    }
    throw err;
  }
}

export async function getRoom(roomCode: string): Promise<Room> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Room not found');
    }
    return json.room;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to backend server. Check VITE_BACKEND_URL setting on Vercel.`);
    }
    throw err;
  }
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
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/messages`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      return [];
    }
    return json.messages;
  } catch {
    return [];
  }
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
