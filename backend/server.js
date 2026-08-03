const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api/uploads', express.static(uploadsDir));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// In-Memory Data Store (Persistent across runtime)
const rooms = new Map();     // roomCode -> roomObject
const messages = new Map();  // roomCode -> Array of messageObjects
const activeRooms = new Map(); // roomCode -> Map(socketId -> userInfo)

// Helper: Generate random room code
function generateRoomCode() {
  const words = ['echo', 'link', 'pulse', 'wave', 'beam', 'vibe', 'zone', 'node', 'sync', 'flow'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const tag = Math.random().toString(36).substring(2, 4);
  return `${word}-${num}-${tag}`;
}

// Helper: Sanitize inputs
function sanitize(str, maxLen = 128) {
  if (!str) return '';
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, maxLen).trim();
}

// Helper: Smart Room Lookup (by code, name, normalized string, or URL)
function findRoomByQuery(queryStr) {
  if (!queryStr) return null;
  const raw = String(queryStr).trim();
  if (rooms.has(raw)) return rooms.get(raw);

  const lower = raw.toLowerCase();
  const normalized = lower.replace(/[^a-z0-9]/g, '');

  for (const [code, room] of rooms.entries()) {
    if (code.toLowerCase() === lower) return room;
    if (code.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) return room;
    if (room.name && room.name.toLowerCase() === lower) return room;
    if (room.name && room.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) return room;
  }
  return null;
}

// --- REST API ENDPOINTS ---

// 1. Create Room
app.post('/api/rooms', (req, res) => {
  try {
    const { name, password, autoDelete = true, maxParticipants = 25 } = req.body || {};
    const roomCode = generateRoomCode();
    const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

    const room = {
      id: uuidv4(),
      roomCode,
      name: sanitize(name || 'Voice Lounge', 64),
      isPrivate: Boolean(password),
      hasPassword: Boolean(password),
      passwordHash,
      autoDelete: Boolean(autoDelete),
      maxParticipants: Number(maxParticipants) || 25,
      createdAt: new Date().toISOString()
    };

    rooms.set(roomCode, room);
    messages.set(roomCode, []);

    const { passwordHash: _, ...publicRoom } = room;
    res.status(201).json({ success: true, room: publicRoom });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Room Info
app.get('/api/rooms/:roomCode', (req, res) => {
  const room = findRoomByQuery(req.params.roomCode);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found. Check room code or name.' });
  }
  const { passwordHash: _, ...publicRoom } = room;
  res.json({ success: true, room: publicRoom });
});

// 3. Verify Room Password
app.post('/api/rooms/:roomCode/verify', (req, res) => {
  const room = findRoomByQuery(req.params.roomCode);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  if (!room.passwordHash) {
    return res.json({ success: true, verified: true });
  }

  const { password = '' } = req.body || {};
  const isMatch = bcrypt.compareSync(password, room.passwordHash);
  if (isMatch) {
    res.json({ success: true, verified: true });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect room password' });
  }
});

// 4. Get Room Messages
app.get('/api/rooms/:roomCode/messages', (req, res) => {
  const room = findRoomByQuery(req.params.roomCode);
  const code = room ? room.roomCode : req.params.roomCode;
  const roomMessages = messages.get(code) || [];
  const activeMsgs = roomMessages.filter(m => !m.isDeleted);
  res.json({ success: true, messages: activeMsgs });
});

// 5. Upload File Attachment (Legacy handler)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const attachment = {
    id: uuidv4(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileUrl: `/api/uploads/${req.file.filename}`,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    createdAt: new Date().toISOString()
  };

  res.json({ success: true, attachment });
});

// --- SOCKET.IO REAL-TIME SIGNALING & CHAT ---

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  
  // 1. Join Voice & Text Room
  socket.on('join_room', (data) => {
    const { roomCode: rawCode, guestId, displayName, avatarColor } = data || {};
    if (!rawCode) {
      return socket.emit('error', { message: 'Room code required' });
    }

    const room = findRoomByQuery(rawCode);
    const roomCode = room ? room.roomCode : rawCode;

    socket.join(roomCode);

    if (!activeRooms.has(roomCode)) {
      activeRooms.set(roomCode, new Map());
    }

    const roomMap = activeRooms.get(roomCode);
    const isHost = roomMap.size === 0;

    const userInfo = {
      socketId: socket.id,
      guestId: guestId || socket.id,
      displayName: sanitize(displayName || 'Guest', 32),
      avatarColor: avatarColor || '#00f2fe',
      isHost,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false
    };

    roomMap.set(socket.id, userInfo);

    // Send existing room participants to the new joiner
    const existingUsers = Array.from(roomMap.values()).filter(u => u.socketId !== socket.id);
    socket.emit('room_users', {
      users: existingUsers,
      selfInfo: userInfo
    });

    // Notify all other users in the room
    socket.to(roomCode).emit('user_joined', userInfo);
  });

  // 2. WebRTC Offer
  socket.on('webrtc_offer', ({ targetSocketId, offer, callerInfo }) => {
    if (targetSocketId && offer) {
      io.to(targetSocketId).emit('webrtc_offer', {
        callerSocketId: socket.id,
        offer,
        callerInfo
      });
    }
  });

  // 3. WebRTC Answer
  socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
    if (targetSocketId && answer) {
      io.to(targetSocketId).emit('webrtc_answer', {
        responderSocketId: socket.id,
        answer
      });
    }
  });

  // 4. WebRTC ICE Candidate
  socket.on('webrtc_candidate', ({ targetSocketId, candidate }) => {
    if (targetSocketId && candidate) {
      io.to(targetSocketId).emit('webrtc_candidate', {
        senderSocketId: socket.id,
        candidate
      });
    }
  });

  // 5. Media State Change (Mute / Deafened)
  socket.on('media_state_change', ({ roomCode, isMuted, isDeafened }) => {
    const roomMap = activeRooms.get(roomCode);
    if (roomMap && roomMap.has(socket.id)) {
      const user = roomMap.get(socket.id);
      user.isMuted = Boolean(isMuted);
      user.isDeafened = Boolean(isDeafened);
      socket.to(roomCode).emit('user_media_state_changed', {
        socketId: socket.id,
        isMuted: user.isMuted,
        isDeafened: user.isDeafened
      });
    }
  });

  // 6. Speaking Indicator Level
  socket.on('speaking_state', ({ roomCode, isSpeaking, level }) => {
    const roomMap = activeRooms.get(roomCode);
    if (roomMap && roomMap.has(socket.id)) {
      const user = roomMap.get(socket.id);
      user.isSpeaking = Boolean(isSpeaking);
      socket.to(roomCode).emit('user_speaking', {
        socketId: socket.id,
        isSpeaking: user.isSpeaking,
        level: level || 0
      });
    }
  });

  // 7. Kick Participant (Host feature)
  socket.on('kick_participant', ({ roomCode, targetSocketId }) => {
    const roomMap = activeRooms.get(roomCode);
    if (roomMap && roomMap.has(socket.id)) {
      const requester = roomMap.get(socket.id);
      if (requester.isHost) {
        io.to(targetSocketId).emit('kicked_from_room', { reason: 'Kicked by host' });
        roomMap.delete(targetSocketId);
        io.to(roomCode).emit('user_left', { socketId: targetSocketId });
      }
    }
  });

  // 8. Text Chat Message
  socket.on('send_message', (data) => {
    const { roomCode, userId, displayName, avatarColor, content, replyTo } = data || {};
    if (!roomCode || !content) return;

    const msg = {
      id: uuidv4(),
      roomCode,
      userId,
      displayName: sanitize(displayName || 'Guest', 32),
      avatarColor: avatarColor || '#00f2fe',
      content: sanitize(content || '', 2000),
      replyToAuthor: replyTo ? sanitize(replyTo.displayName, 32) : null,
      replyToContent: replyTo ? sanitize(replyTo.content, 500) : null,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };

    if (!messages.has(roomCode)) {
      messages.set(roomCode, []);
    }
    messages.get(roomCode).push(msg);

    io.to(roomCode).emit('new_message', msg);
  });

  // 9. Typing Indicator
  socket.on('typing_indicator', ({ roomCode, displayName, isTyping }) => {
    socket.to(roomCode).emit('user_typing', {
      displayName: sanitize(displayName || 'Guest', 32),
      isTyping: Boolean(isTyping)
    });
  });

  // 10. Edit Message
  socket.on('edit_message', ({ roomCode, messageId, newContent }) => {
    const roomMessages = messages.get(roomCode);
    if (roomMessages) {
      const msg = roomMessages.find(m => m.id === messageId);
      if (msg) {
        msg.content = sanitize(newContent, 2000);
        msg.isEdited = true;
        io.to(roomCode).emit('message_edited', msg);
      }
    }
  });

  // 11. Delete Message
  socket.on('delete_message', ({ roomCode, messageId }) => {
    const roomMessages = messages.get(roomCode);
    if (roomMessages) {
      const msgIndex = roomMessages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1) {
        roomMessages[msgIndex].isDeleted = true;
        io.to(roomCode).emit('message_deleted', { messageId });
      }
    }
  });

  // 12. Explicit Leave Room
  socket.on('leave_room', ({ roomCode }) => {
    cleanupUser(socket.id, roomCode);
  });

  // 13. Disconnect Event
  socket.on('disconnect', () => {
    for (const [roomCode, roomMap] of activeRooms.entries()) {
      if (roomMap.has(socket.id)) {
        cleanupUser(socket.id, roomCode);
      }
    }
  });
});

// User disconnection / leave cleanup helper
function cleanupUser(socketId, roomCode) {
  const roomMap = activeRooms.get(roomCode);
  if (!roomMap || !roomMap.has(socketId)) return;

  const leavingUser = roomMap.get(socketId);
  roomMap.delete(socketId);

  io.to(roomCode).emit('user_left', { socketId, user: leavingUser });

  // Host transfer if host left
  if (leavingUser && leavingUser.isHost && roomMap.size > 0) {
    const newHostSocketId = roomMap.keys().next().value;
    const newHost = roomMap.get(newHostSocketId);
    newHost.isHost = true;
    io.to(roomCode).emit('host_changed', { newHostSocketId });
  }

  // Auto-delete room if empty
  if (roomMap.size === 0) {
    activeRooms.delete(roomCode);
    const room = rooms.get(roomCode);
    if (room && room.autoDelete) {
      rooms.delete(roomCode);
      messages.delete(roomCode);
    }
  }
}

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`[EchoLink] Backend Server SUCCESS! Listening on http://${HOST}:${PORT}`);
  console.log(`[STATUS] READY - Keep this console window OPEN while using the app.`);
});
