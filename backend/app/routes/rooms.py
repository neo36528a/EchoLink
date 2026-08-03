from flask import Blueprint, request, jsonify
from app.database import db
from app.models import Room, Message
from app.utils.security import generate_room_code, hash_password, verify_password, sanitize_string

rooms_bp = Blueprint('rooms', __name__, url_prefix='/api/rooms')

@rooms_bp.route('', methods=['POST'])
def create_room():
    data = request.get_json() or {}
    name = sanitize_string(data.get('name', 'Echo Room'), 64)
    password = data.get('password')
    auto_delete = data.get('autoDelete', True)
    max_participants = data.get('maxParticipants', 25)

    room_code = generate_room_code()
    while Room.query.filter_by(room_code=room_code).first():
        room_code = generate_room_code()

    new_room = Room(
        room_code=room_code,
        name=name,
        password_hash=hash_password(password) if password else None,
        is_private=bool(password),
        auto_delete=bool(auto_delete),
        max_participants=int(max_participants)
    )

    db.session.add(new_room)
    db.session.commit()

    return jsonify({
        'success': True,
        'room': new_room.to_dict()
    }), 201

@rooms_bp.route('/<room_code>', methods=['GET'])
def get_room(room_code):
    room = Room.query.filter_by(room_code=room_code).first()
    if not room:
        return jsonify({'success': False, 'error': 'Room not found'}), 404

    return jsonify({
        'success': True,
        'room': room.to_dict()
    })

@rooms_bp.route('/<room_code>/verify', methods=['POST'])
def verify_room_access(room_code):
    room = Room.query.filter_by(room_code=room_code).first()
    if not room:
        return jsonify({'success': False, 'error': 'Room not found'}), 404

    if not room.password_hash:
        return jsonify({'success': True, 'verified': True})

    data = request.get_json() or {}
    password = data.get('password', '')

    if verify_password(room.password_hash, password):
        return jsonify({'success': True, 'verified': True})
    else:
        return jsonify({'success': False, 'error': 'Incorrect room password'}), 401

@rooms_bp.route('/<room_code>/messages', methods=['GET'])
def get_room_messages(room_code):
    room = Room.query.filter_by(room_code=room_code).first()
    if not room:
        return jsonify({'success': False, 'error': 'Room not found'}), 404

    limit = min(int(request.args.get('limit', 100)), 200)
    messages = Message.query.filter_by(room_code=room_code, is_deleted=False)\
                            .order_by(Message.created_at.asc())\
                            .limit(limit).all()

    return jsonify({
        'success': True,
        'messages': [m.to_dict() for m in messages]
    })
