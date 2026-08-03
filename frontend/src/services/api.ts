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

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error('Server returned an empty response. Please try again in a few seconds.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Backend server is warming up on Render. Please click Create & Launch again in 5 seconds.');
  }
}

export async function createRoom(data: { name: string; password?: string; autoDelete?: boolean }): Promise<Room> {
  try {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create room');
    }
    return json.room;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to backend server at ${API_BASE}. Make sure VITE_BACKEND_URL is saved and redeployed on Vercel.`);
    }
    throw err;
  }
}

export async function getRoom(roomCode: string): Promise<Room> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}`);
    const json = await parseJsonResponse(res);
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Room not found');
    }
    return json.room;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to backend server.`);
    }
    throw err;
  }
}

export async function verifyRoomPassword(roomCode: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await parseJsonResponse(res);
    return res.ok && json.verified;
  } catch {
    return false;
  }
}

export async function fetchRoomMessages(roomCode: string): Promise<Message[]> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/messages`);
    const json = await parseJsonResponse(res);
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
  const json = await parseJsonResponse(res);
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'File upload failed');
  }
  return json.attachment;
}
