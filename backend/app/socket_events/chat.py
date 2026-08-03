from flask import request
from flask_socketio import emit
from app.database import db
from app.models import Message, Attachment
from app.utils.security import sanitize_string

def register_chat_events(socketio):

    @socketio.on('send_message')
    def handle_send_message(data):
        room_code = data.get('roomCode')
        user_id = data.get('userId')
        display_name = sanitize_string(data.get('displayName', 'Guest'), 32)
        avatar_color = data.get('avatarColor', '#00f2fe')
        content = sanitize_string(data.get('content', ''), 4000)
        reply_to = data.get('replyTo')
        attachments_data = data.get('attachments', [])

        if not room_code or (not content and not attachments_data):
            return

        reply_to_id = reply_to.get('id') if reply_to else None
        reply_to_author = reply_to.get('displayName') if reply_to else None
        reply_to_content = reply_to.get('content') if reply_to else None

        new_msg = Message(
            room_code=room_code,
            user_id=user_id,
            display_name=display_name,
            avatar_color=avatar_color,
            content=content,
            reply_to_id=reply_to_id,
            reply_to_author=reply_to_author,
            reply_to_content=reply_to_content
        )

        db.session.add(new_msg)
        db.session.flush()  # Get new_msg.id

        # Attachments creation
        created_attachments = []
        for att in attachments_data:
            attachment_obj = Attachment(
                message_id=new_msg.id,
                filename=att.get('filename', ''),
                original_name=att.get('originalName', ''),
                file_url=att.get('fileUrl', ''),
                file_type=att.get('fileType', 'application/octet-stream'),
                file_size=att.get('fileSize', 0)
            )
            db.session.add(attachment_obj)
            created_attachments.append(attachment_obj)

        db.session.commit()

        msg_payload = new_msg.to_dict()
        emit('new_message', msg_payload, to=room_code)

    @socketio.on('typing_indicator')
    def handle_typing(data):
        room_code = data.get('roomCode')
        is_typing = data.get('isTyping', False)
        display_name = data.get('displayName')

        if room_code:
            emit('user_typing', {
                'socketId': request.sid,
                'displayName': display_name,
                'isTyping': is_typing
            }, to=room_code, include_self=False)

    @socketio.on('edit_message')
    def handle_edit_message(data):
        message_id = data.get('messageId')
        new_content = sanitize_string(data.get('content', ''), 4000)
        room_code = data.get('roomCode')

        msg = Message.query.get(message_id)
        if msg and not msg.is_deleted:
            msg.content = new_content
            msg.is_edited = True
            db.session.commit()

            emit('message_edited', msg.to_dict(), to=room_code)

    @socketio.on('delete_message')
    def handle_delete_message(data):
        message_id = data.get('messageId')
        room_code = data.get('roomCode')

        msg = Message.query.get(message_id)
        if msg:
            msg.is_deleted = True
            db.session.commit()

            emit('message_deleted', {'messageId': message_id}, to=room_code)
