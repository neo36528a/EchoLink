import os
from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

from app.config import Config
from app.database import init_db
from app.routes import rooms_bp, upload_bp
from app.socket_events import init_socket_events

socketio = SocketIO(cors_allowed_origins="*", async_mode='gevent' if os.environ.get('USE_GEVENT') else 'threading')

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database
    init_db(app)

    # Register Blueprints
    app.register_blueprint(rooms_bp)
    app.register_blueprint(upload_bp)

    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'EchoLink Backend API',
            'version': '1.0.0'
        })

    # Initialize SocketIO events
    socketio.init_app(app)
    init_socket_events(socketio)

    return app
