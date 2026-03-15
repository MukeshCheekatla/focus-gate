from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, status
from app.config import get_settings


def _get_fernet() -> Fernet:
    settings = get_settings()
    return Fernet(settings.FERNET_KEY.encode())


def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string using Fernet AES-256. Returns base64-encoded ciphertext."""
    fernet = _get_fernet()
    encrypted = fernet.encrypt(plaintext.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a Fernet-encrypted ciphertext. Raises HTTP 500 if decryption fails."""
    fernet = _get_fernet()
    try:
        decrypted = fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted.decode("utf-8")
    except InvalidToken:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt key value. The encryption key may have changed.",
        )


def generate_fernet_key() -> str:
    """Generate a new Fernet key. Used for initial setup."""
    return Fernet.generate_key().decode("utf-8")
