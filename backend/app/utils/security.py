import random
import string
import re
from werkzeug.security import generate_password_hash, check_password_hash

ALLOWED_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
    'pdf', 'doc', 'docx', 'txt', 'mp3', 'mp4', 'wav', 'ogg', 'zip'
}

def generate_room_code():
    """Generates a stylish, unique room code format like echo-4892-x9"""
    prefix = "echo"
    middle = ''.join(random.choices(string.digits, k=4))
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=2))
    return f"{prefix}-{middle}-{suffix}"

def hash_password(password: str) -> str:
    if not password:
        return None
    return generate_password_hash(password)

def verify_password(password_hash: str, password: str) -> bool:
    if not password_hash:
        return True
    return check_password_hash(password_hash, password)

def is_allowed_file(filename: str) -> bool:
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS

def sanitize_string(input_str: str, max_length: int = 100) -> str:
    if not input_str:
        return ""
    clean = re.sub(r'[<>]', '', input_str.strip())
    return clean[:max_length]
