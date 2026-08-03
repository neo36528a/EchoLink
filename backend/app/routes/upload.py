import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from app.utils.security import is_allowed_file

upload_bp = Blueprint('upload', __name__, url_prefix='/api')

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not is_allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'File type not allowed'}), 400

    original_filename = secure_filename(file.filename) or "upload_file"
    file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    unique_filename = f"{uuid.uuid4().hex}.{file_ext}"

    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)

    target_path = os.path.join(upload_folder, unique_filename)
    file.save(target_path)
    file_size = os.path.getsize(target_path)

    file_url = f"/api/uploads/{unique_filename}"

    return jsonify({
        'success': True,
        'attachment': {
            'id': str(uuid.uuid4()),
            'filename': unique_filename,
            'originalName': original_filename,
            'fileUrl': file_url,
            'fileType': file.mimetype or 'application/octet-stream',
            'fileSize': file_size
        }
    }), 201

@upload_bp.route('/uploads/<filename>', methods=['GET'])
def serve_uploaded_file(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)
