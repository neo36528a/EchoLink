from datetime import datetime
from app.database import db
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Room(db.Model):
    __tablename__ = 'rooms'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    room_code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    name = db.Column(db.String(64), nullable=False, default="Voice Lounge")
    password_hash = db.Column(db.String(128), nullable=True)
    is_private = db.Column(db.Boolean, default=False)
    max_participants = db.Column(db.Integer, default=25)
    auto_delete = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'roomCode': self.room_code,
            'name': self.name,
            'isPrivate': self.is_private,
            'hasPassword': bool(self.password_hash),
            'maxParticipants': self.max_participants,
            'autoDelete': self.auto_delete,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    guest_id = db.Column(db.String(64), nullable=False, index=True)
    display_name = db.Column(db.String(32), nullable=False)
    avatar_color = db.Column(db.String(16), nullable=False, default='#00f2fe')
    current_room_code = db.Column(db.String(32), nullable=True)
    is_host = db.Column(db.Boolean, default=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'guestId': self.guest_id,
            'displayName': self.display_name,
            'avatarColor': self.avatar_color,
            'currentRoomCode': self.current_room_code,
            'isHost': self.is_host,
            'joinedAt': self.joined_at.isoformat() if self.joined_at else None
        }

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    room_code = db.Column(db.String(32), nullable=False, index=True)
    user_id = db.Column(db.String(64), nullable=False)
    display_name = db.Column(db.String(32), nullable=False)
    avatar_color = db.Column(db.String(16), default='#00f2fe')
    content = db.Column(db.Text, nullable=False)
    reply_to_id = db.Column(db.String(36), nullable=True)
    reply_to_author = db.Column(db.String(32), nullable=True)
    reply_to_content = db.Column(db.Text, nullable=True)
    is_edited = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    attachments = db.relationship('Attachment', backref='message', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'roomCode': self.room_code,
            'userId': self.user_id,
            'displayName': self.display_name,
            'avatarColor': self.avatar_color,
            'content': self.content if not self.is_deleted else 'This message was deleted.',
            'replyToId': self.reply_to_id,
            'replyToAuthor': self.reply_to_author,
            'replyToContent': self.reply_to_content,
            'isEdited': self.is_edited,
            'isDeleted': self.is_deleted,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'attachments': [a.to_dict() for a in self.attachments]
        }

class Attachment(db.Model):
    __tablename__ = 'attachments'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    message_id = db.Column(db.String(36), db.ForeignKey('messages.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(64), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'messageId': self.message_id,
            'filename': self.filename,
            'originalName': self.original_name,
            'fileUrl': self.file_url,
            'fileType': self.file_type,
            'fileSize': self.file_size,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
