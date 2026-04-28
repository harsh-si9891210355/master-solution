import base64
import hashlib
import hmac
import os


class Hasher:
    ALGORITHM = "pbkdf2_sha256"
    ITERATIONS = 100_000
    SALT_SIZE = 16

    @staticmethod
    def get_hashed_password(password: str) -> str:
        salt = os.urandom(Hasher.SALT_SIZE)
        derived_key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            Hasher.ITERATIONS,
        )
        salt_b64 = base64.b64encode(salt).decode("utf-8")
        hash_b64 = base64.b64encode(derived_key).decode("utf-8")
        return f"{Hasher.ALGORITHM}${Hasher.ITERATIONS}${salt_b64}${hash_b64}"

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            algorithm, iterations, salt_b64, hash_b64 = hashed_password.split("$", 3)
            if algorithm != Hasher.ALGORITHM:
                return False

            salt = base64.b64decode(salt_b64.encode("utf-8"))
            expected_hash = base64.b64decode(hash_b64.encode("utf-8"))
            derived_key = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt,
                int(iterations),
            )
            return hmac.compare_digest(derived_key, expected_hash)
        except (ValueError, TypeError):
            return False
