# EchoLink — Production-Ready Low-Latency Voice & Text Chat Web App

EchoLink is a modern, high-performance web application designed for instant, temporary private voice and text rooms. Built with a gaming-inspired dark glassmorphism aesthetic, sub-100ms WebRTC voice communication, real-time messaging, drag-and-drop file sharing, and zero account registration (Guest Mode First).

---

## 🚀 Key Features

* **Instant Private Rooms**: Create or join rooms in under 2 seconds.
* **Low-Latency WebRTC Audio Mesh**: Ultra-fast P2P voice streaming with built-in Echo Cancellation, Noise Suppression, and Automatic Gain Control.
* **Real-time Audio Visualizers**: Web Audio API (`AnalyserNode`) decibel level meters and animated green speaking rings.
* **Text Chat**: Live Socket.IO messaging with typing indicators, replies, message edit/delete, emoji selector, and search filters.
* **Drag-and-Drop File Sharing**: Share images, PDFs, videos, and documents with instant inline media previewers.
* **Invite Security & Convenience**: Quick copy link, QR Code generation canvas, optional room password protection, and auto-delete when empty.
* **Guest First**: No signup needed—pick a display name and start chatting immediately.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript + Vite |
| **Styling & UI** | Tailwind CSS + Custom Glassmorphic Dark Theme + Lucide Icons |
| **Real-time Voice** | WebRTC Native P2P + Web Audio API (`AnalyserNode`) |
| **Real-time Signaling** | Socket.IO Client |
| **Backend Framework** | Python 3.11 + Flask + Flask-SocketIO |
| **Database** | SQLite (Local Zero-Setup) / PostgreSQL (Production) |
| **Deployment** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## 📁 Project Folder Structure

```
EchoLink/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask & SocketIO application factory
│   │   ├── config.py            # Environment configurations & CORS rules
│   │   ├── database.py          # SQLAlchemy initialization
│   │   ├── models.py            # Database schemas (Room, User, Message, Attachment)
│   │   ├── routes/
│   │   │   ├── rooms.py         # REST endpoints for room creation & password verification
│   │   │   └── upload.py        # File upload handler & static media serving
│   │   ├── socket_events/
│   │   │   ├── signaling.py     # WebRTC P2P signaling (Offers, Answers, ICE Candidates)
│   │   │   └── chat.py          # Text chat & typing indicator gateway
│   │   └── utils/
│   │       └── security.py      # Room code generator, password hashing & file extension checks
│   ├── uploads/                 # Shared media storage
│   ├── requirements.txt         # Python dependencies
│   ├── run.py                   # Development backend entry script
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Button, Input, Modal, QRCodeModal, Toast
│   │   │   ├── landing/         # HeroSection, CreateRoomModal, JoinRoomModal
│   │   │   ├── room/            # RoomHeader, ParticipantCard, ParticipantGrid, ControlsBar, AudioSettingsModal
│   │   │   └── chat/            # ChatDrawer, MessageItem, MessageInput, EmojiPicker, FileDropzone
│   │   ├── hooks/               # useWebRTC, useAudioVisualizer, useMediaDevices
│   │   ├── services/            # REST API client & Socket.IO instance manager
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx              # Main application router & state manager
│   │   ├── index.css            # Tailwind theme tokens & glassmorphism utilities
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml           # Production multi-container orchestrator
├── nginx.conf                   # Reverse proxy configuration (HTTP + WebSockets)
└── README.md
```

---

## ⚡ Quickstart

### 🚀 One-Click Windows Launcher
Simply double-click `start.bat` in the root folder (or run `.\start.bat` in PowerShell/CMD) to launch both the Python backend and Vite frontend automatically!

---

### 1. Manual Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
*Backend server will start on `http://localhost:5000` with SQLite initialized automatically.*

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
*Frontend dev server will start on `http://localhost:3000` with proxying to backend on port 5000.*

---

## 🐳 Production Deployment with Docker Compose

To deploy EchoLink in a production environment with Nginx and PostgreSQL:

```bash
# Clone and enter directory
git clone https://github.com/your-username/EchoLink.git
cd EchoLink

# Launch production containers
docker-compose up --build -d
```
*EchoLink will be live at `http://localhost` (or your domain name).*

---

## 🔑 Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | `echolink-dev-secret-key...` | Flask session secret key |
| `DATABASE_URL` | `sqlite:///echolink.db` | Database connection URI (PostgreSQL in Docker) |
| `PORT` | `5000` | Backend API port |
| `CORS_ALLOWED_ORIGINS` | `*` | Allowed CORS origins |
| `UPLOAD_FOLDER` | `./uploads` | Directory for uploaded media attachments |

---

## 📡 REST API Documentation

### Rooms

* **`POST /api/rooms`**
  - **Body**: `{ "name": "Room Name", "password": "optional", "autoDelete": true }`
  - **Response**: `{ "success": true, "room": { "roomCode": "echo-4892-x9", ... } }`

* **`GET /api/rooms/:roomCode`**
  - **Response**: `{ "success": true, "room": { ... } }`

* **`POST /api/rooms/:roomCode/verify`**
  - **Body**: `{ "password": "user_input" }`
  - **Response**: `{ "success": true, "verified": true }`

* **`GET /api/rooms/:roomCode/messages`**
  - **Response**: `{ "success": true, "messages": [...] }`

### File Uploads

* **`POST /api/upload`**
  - **Form Data**: `file` (multipart)
  - **Response**: `{ "success": true, "attachment": { "fileUrl": "/api/uploads/...", "filename": "...", ... } }`

---

## 🔒 Security Measures

* **Sanitized Inputs**: All input strings and user display names are stripped of script tags and length-capped.
* **Safe File Uploads**: Extension and MIME-type validation prevents unauthorized execution.
* **Password Hashing**: Werkzeug pbkdf2:sha256 hashing for password-protected rooms.
* **Auto-Purge**: Rooms can be automatically deleted upon evacuation to eliminate persistent data footprint.

---

## 📄 License
MIT License. Created for high-performance low-latency voice communications.
