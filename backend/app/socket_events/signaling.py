from flask import request
from flask_socketio import emit, join_room as socket_join_room, leave_room as socket_leave_room
from app.database import db
from app.models import Room

# Global in-memory room active state mapping
# room_code -> dict of socket_id -> user_data
ACTIVE_ROOMS = {}

def register_signaling_events(socketio):
    
    @socketio.on('join_room')
    def handle_join_room(data):
        room_code = data.get('roomCode')
        guest_id = data.get('guestId')
        display_name = data.get('displayName', 'Guest')
        avatar_color = data.get('avatarColor', '#00f2fe')

        if not room_code:
            emit('error', {'message': 'Room code required'})
            return

        sid = request.sid
        socket_join_room(room_code)

        if room_code not in ACTIVE_ROOMS:
            ACTIVE_ROOMS[room_code] = {}

        is_host = len(ACTIVE_ROOMS[room_code]) == 0

        user_info = {
            'socketId': sid,
            'guestId': guest_id,
            'displayName': display_name,
            'avatarColor': avatar_color,
            'isHost': is_host,
            'isMuted': False,
            'isDeafened': False,
            'isSpeaking': False
        }

        ACTIVE_ROOMS[room_code][sid] = user_info

        # 1. Send current participants to the newly joined user
        existing_users = [u for s, u in ACTIVE_ROOMS[room_code].items() if s != sid]
        emit('room_users', {
            'users': existing_users,
            'selfInfo': user_info
        })

        # 2. Notify all existing peers in the room about the new joiner
        emit('user_joined', user_info, to=room_code, include_self=False)

    @socketio.on('webrtc_offer')
    def handle_webrtc_offer(data):
        target_sid = data.get('targetSocketId')
        offer = data.get('offer')
        if target_sid and offer:
            emit('webrtc_offer', {
                'callerSocketId': request.sid,
                'offer': offer,
                'callerInfo': data.get('callerInfo')
            }, to=target_sid)

    @socketio.on('webrtc_answer')
    def handle_webrtc_answer(data):
        target_sid = data.get('targetSocketId')
        answer = data.get('answer')
        if target_sid and answer:
            emit('webrtc_answer', {
                'responderSocketId': request.sid,
                'answer': answer
            }, to=target_sid)

    @socketio.on('webrtc_candidate')
    def handle_webrtc_candidate(data):
        target_sid = data.get('targetSocketId')
        candidate = data.get('candidate')
        if target_sid and candidate:
            emit('webrtc_candidate', {
                'senderSocketId': request.sid,
                'candidate': candidate
            }, to=target_sid)

    @socketio.on('media_state_change')
    def handle_media_state_change(data):
        room_code = data.get('roomCode')
        is_muted = data.get('isMuted', False)
        is_deafened = data.get('isDeafened', False)

        sid = request.sid
        if room_code in ACTIVE_ROOMS and sid in ACTIVE_ROOMS[room_code]:
            ACTIVE_ROOMS[room_code][sid]['isMuted'] = is_muted
            ACTIVE_ROOMS[room_code][sid]['isDeafened'] = is_deafened

            emit('user_media_state_changed', {
                'socketId': sid,
                'isMuted': is_muted,
                'isDeafened': is_deafened
            }, to=room_code, include_self=False)

    @socketio.on('speaking_state')
    def handle_speaking_state(data):
        room_code = data.get('roomCode')
        is_speaking = data.get('isSpeaking', False)
        level = data.get('level', 0.0)

        sid = request.sid
        if room_code in ACTIVE_ROOMS and sid in ACTIVE_ROOMS[room_code]:
            ACTIVE_ROOMS[room_code][sid]['isSpeaking'] = is_speaking

            emit('user_speaking', {
                'socketId': sid,
                'isSpeaking': is_speaking,
                'level': level
            }, to=room_code, include_self=False)

    @socketio.on('kick_participant')
    def handle_kick_participant(data):
        room_code = data.get('roomCode')
        target_sid = data.get('targetSocketId')

        sid = request.sid
        if room_code in ACTIVE_ROOMS and sid in ACTIVE_ROOMS[room_code]:
            if ACTIVE_ROOMS[room_code][sid].get('isHost'):
                emit('kicked_from_room', {'reason': 'Kicked by host'}, to=target_sid)
                if target_sid in ACTIVE_ROOMS[room_code]:
                    del ACTIVE_ROOMS[room_code][target_sid]
                emit('user_left', {'socketId': target_sid}, to=room_code)

    @socketio.on('leave_room')
    def handle_leave_room(data):
        room_code = data.get('roomCode')
        _cleanup_user(request.sid, room_code, socketio)

    @socketio.on('disconnect')
    def handle_disconnect():
        sid = request.sid
        for room_code, users in list(ACTIVE_ROOMS.items()):
            if sid in users:
                _cleanup_user(sid, room_code, socketio)

def _cleanup_user(sid, room_code, socketio):
    socket_leave_room(room_code)
    if room_code in ACTIVE_ROOMS and sid in ACTIVE_ROOMS[room_code]:
        leaving_user = ACTIVE_ROOMS[room_code].pop(sid, None)
        emit('user_left', {'socketId': sid, 'user': leaving_user}, to=room_code)

        # Transfer host role if host left
        if leaving_user and leaving_user.get('isHost') and ACTIVE_ROOMS[room_code]:
            new_host_sid = next(iter(ACTIVE_ROOMS[room_code].keys()))
            ACTIVE_ROOMS[room_code][new_host_sid]['isHost'] = True
            emit('host_changed', {'newHostSocketId': new_host_sid}, to=room_code)

        # Check auto delete empty room
        if len(ACTIVE_ROOMS[room_code]) == 0:
            del ACTIVE_ROOMS[room_code]
            try:
                room = Room.query.filter_by(room_code=room_code).first()
                if room and room.auto_delete:
                    db.session.delete(room)
                    db.session.commit()
            except Exception as e:
                db.session.rollback()
