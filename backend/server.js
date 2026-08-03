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

// Health check endpoint
app.get(['/', '/api', '/api/health'], (req, res) => {
  res.send('[EchoLink] Backend Server SUCCESS!');
});

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
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const attachment = {
      id: uuidv4(),
      filename: req.file.originalname,
      fileUrl: `/api/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    };
    res.json({ success: true, attachment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- REAL-TIME WEBRTC & CHAT SIGNALING (SOCKET.IO) ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

io.on('connection', (socket) => {
  let currentRoomCode = null;
  let currentUser = null;

  // 1. Join Room
  socket.on('join_room', ({ roomCode, displayName, isMicOn = false, isCamOn = false }) => {
    const room = findRoomByQuery(roomCode);
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }

    const code = room.roomCode;
    currentRoomCode = code;
    socket.join(code);

    if (!activeRooms.has(code)) {
      activeRooms.set(code, new Map());
    }

    const roomParticipants = activeRooms.get(code);
    currentUser = {
      socketId: socket.id,
      userId: socket.id,
      displayName: sanitize(displayName || 'Guest', 32),
      isMicOn: Boolean(isMicOn),
      isCamOn: Boolean(isCamOn),
      isHandRaised: false,
      isSpeaking: false,
      joinedAt: new Date().toISOString()
    };

    roomParticipants.set(socket.id, currentUser);

    const participantList = Array.from(roomParticipants.values());
    socket.emit('room_joined', {
      room,
      participants: participantList,
      yourSocketId: socket.id
    });

    socket.to(code).emit('user_joined', { participant: currentUser });
  });

  // 2. WebRTC Signaling (Offers, Answers, ICE Candidates)
  socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc_offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc_answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('webrtc_candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc_candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // 3. Media Controls (Mic, Cam, Hand Raise)
  socket.on('media_state_change', ({ isMicOn, isCamOn, isHandRaised }) => {
    if (!currentRoomCode || !currentUser) return;
    const roomParticipants = activeRooms.get(currentRoomCode);
    if (roomParticipants && roomParticipants.has(socket.id)) {
      const user = roomParticipants.get(socket.id);
      if (typeof isMicOn === 'boolean') user.isMicOn = isMicOn;
      if (typeof isCamOn === 'boolean') user.isCamOn = isCamOn;
      if (typeof isHandRaised === 'boolean') user.isHandRaised = isHandRaised;

      io.to(currentRoomCode).emit('user_media_changed', {
        socketId: socket.id,
        isMicOn: user.isMicOn,
        isCamOn: user.isCamOn,
        isHandRaised: user.isHandRaised
      });
    }
  });

  socket.on('speaking_state', ({ isSpeaking }) => {
    if (!currentRoomCode || !currentUser) return;
    const roomParticipants = activeRooms.get(currentRoomCode);
    if (roomParticipants && roomParticipants.has(socket.id)) {
      const user = roomParticipants.get(socket.id);
      user.isSpeaking = Boolean(isSpeaking);
      io.to(currentRoomCode).emit('user_speaking_changed', {
        socketId: socket.id,
        isSpeaking: user.isSpeaking
      });
    }
  });

  // 4. Kick Participant (Host)
  socket.on('kick_participant', ({ targetSocketId }) => {
    if (!currentRoomCode) return;
    io.to(targetSocketId).emit('kicked_from_room');
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.leave(currentRoomCode);
    }
    const roomParticipants = activeRooms.get(currentRoomCode);
    if (roomParticipants) {
      roomParticipants.delete(targetSocketId);
    }
    io.to(currentRoomCode).emit('user_left', { socketId: targetSocketId });
  });

  // 5. Live Chat Messaging
  socket.on('send_message', ({ text, attachment }) => {
    if (!currentRoomCode || !currentUser) return;

    const messageObj = {
      id: uuidv4(),
      senderId: socket.id,
      senderName: currentUser.displayName,
      text: sanitize(text || '', 1000),
      attachment: attachment || null,
      timestamp: new Date().toISOString(),
      isDeleted: false
    };

    if (!messages.has(currentRoomCode)) {
      messages.set(currentRoomCode, []);
    }
    messages.get(currentRoomCode).push(messageObj);

    io.to(currentRoomCode).emit('new_message', { message: messageObj });
  });

  socket.on('typing_indicator', ({ isTyping }) => {
    if (!currentRoomCode || !currentUser) return;
    socket.to(currentRoomCode).emit('user_typing', {
      socketId: socket.id,
      displayName: currentUser.displayName,
      isTyping: Boolean(isTyping)
    });
  });

  socket.on('delete_message', ({ messageId }) => {
    if (!currentRoomCode) return;
    const roomMessages = messages.get(currentRoomCode) || [];
    const msg = roomMessages.find(m => m.id === messageId);
    if (msg) {
      msg.isDeleted = true;
      io.to(currentRoomCode).emit('message_deleted', { messageId });
    }
  });

  // 6. Leaving & Disconnecting
  const handleLeave = () => {
    if (!currentRoomCode || !currentUser) return;

    const roomParticipants = activeRooms.get(currentRoomCode);
    if (roomParticipants) {
      roomParticipants.delete(socket.id);

      io.to(currentRoomCode).emit('user_left', { socketId: socket.id });

      // Auto-delete room if empty and autoDelete is enabled
      if (roomParticipants.size === 0) {
        const room = findRoomByQuery(currentRoomCode);
        if (room && room.autoDelete) {
          rooms.delete(room.roomCode);
          messages.delete(room.roomCode);
          activeRooms.delete(room.roomCode);
        }
      }
    }

    socket.leave(currentRoomCode);
    currentRoomCode = null;
    currentUser = null;
  };

  socket.on('leave_room', handleLeave);
  socket.on('disconnect', handleLeave);
});

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`[EchoLink] Backend Server SUCCESS! Listening on http://${HOST}:${PORT}`);
  console.log(`[STATUS] READY - Keep this console window OPEN while using the app.`);
});
