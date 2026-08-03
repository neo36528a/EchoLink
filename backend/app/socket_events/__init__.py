from app.socket_events.signaling import register_signaling_events
from app.socket_events.chat import register_chat_events

def init_socket_events(socketio):
    register_signaling_events(socketio)
    register_chat_events(socketio)
