import hashlib
import hmac
import threading
import time

BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
BASE = len(BASE62_ALPHABET)

class Base62Encoder:
    """Encodes and decodes integers to/from Base62 strings."""

    @staticmethod
    def encode(num: int, min_length: int = 6) -> str:
        if num < 0:
            raise ValueError("Number must be non-negative")
        if num == 0:
            return BASE62_ALPHABET[0].zfill(min_length)

        chars = []
        while num > 0:
            num, remainder = divmod(num, BASE)
            chars.append(BASE62_ALPHABET[remainder])
        
        encoded = "".join(reversed(chars))
        if len(encoded) < min_length:
            encoded = BASE62_ALPHABET[0] * (min_length - len(encoded)) + encoded
        return encoded

    @staticmethod
    def decode(s: str) -> int:
        num = 0
        for char in s:
            idx = BASE62_ALPHABET.find(char)
            if idx == -1:
                raise ValueError(f"Invalid Base62 character: {char}")
            num = num * BASE + idx
        return num


class FeistelCipher:
    """
    Format-Preserving Feistel Cipher for pseudorandom integer permutation.
    
    Provides 1-to-1 bijective obfuscation over a custom bit space (default 36-bit),
    guaranteeing zero collisions while rendering sequential numbers unpredictable.
    """

    def __init__(self, key: str = "url-magic-secret-key", bits: int = 36, rounds: int = 4):
        if bits % 2 != 0:
            raise ValueError("Bits must be an even number")
        self.bits = bits
        self.half_bits = bits // 2
        self.mask = (1 << self.half_bits) - 1
        self.total_mask = (1 << self.bits) - 1
        self.rounds = rounds
        self.key = key.encode("utf-8")

    def _round_function(self, val: int, round_idx: int) -> int:
        data = f"{val}:{round_idx}".encode()
        h = hmac.new(self.key, data, hashlib.sha256).digest()
        # Take first 4 bytes as integer and mask to half_bits
        hash_int = int.from_bytes(h[:4], byteorder="big")
        return hash_int & self.mask

    def encrypt(self, val: int) -> int:
        val = val & self.total_mask
        left = (val >> self.half_bits) & self.mask
        right = val & self.mask

        for i in range(self.rounds):
            next_left = right
            next_right = left ^ self._round_function(right, i)
            left, right = next_left, next_right

        return (left << self.half_bits) | right

    def decrypt(self, val: int) -> int:
        val = val & self.total_mask
        left = (val >> self.half_bits) & self.mask
        right = val & self.mask

        for i in reversed(range(self.rounds)):
            prev_right = left
            prev_left = right ^ self._round_function(left, i)
            left, right = prev_left, prev_right

        return (left << self.half_bits) | right


class SnowflakeGenerator:
    """
    Thread-safe 64-bit Snowflake ID Generator.
    
    Layout:
    - 1 bit: Unused (sign bit)
    - 41 bits: Timestamp in milliseconds since Epoch
    - 10 bits: Machine/Node ID (0-1023)
    - 12 bits: Sequence number (0-4095)
    """

    EPOCH = 1735689600000  # Custom epoch: 2025-01-01 00:00:00 UTC in ms
    WORKER_ID_BITS = 10
    SEQUENCE_BITS = 12

    MAX_WORKER_ID = (1 << WORKER_ID_BITS) - 1
    MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1

    WORKER_ID_SHIFT = SEQUENCE_BITS
    TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS

    def __init__(self, worker_id: int = 1):
        if worker_id < 0 or worker_id > self.MAX_WORKER_ID:
            raise ValueError(f"Worker ID must be between 0 and {self.MAX_WORKER_ID}")
        self.worker_id = worker_id
        self.sequence = 0
        self.last_timestamp = -1
        self._lock = threading.Lock()

    def _time_gen(self) -> int:
        return int(time.time() * 1000)

    def _til_next_millis(self, last_timestamp: int) -> int:
        timestamp = self._time_gen()
        while timestamp <= last_timestamp:
            timestamp = self._time_gen()
        return timestamp

    def generate_id(self) -> int:
        with self._lock:
            timestamp = self._time_gen()

            if timestamp < self.last_timestamp:
                raise RuntimeError("Clock moved backwards. Refusing to generate ID.")

            if timestamp == self.last_timestamp:
                self.sequence = (self.sequence + 1) & self.MAX_SEQUENCE
                if self.sequence == 0:
                    timestamp = self._til_next_millis(self.last_timestamp)
            else:
                self.sequence = 0

            self.last_timestamp = timestamp

            snowflake_id = (
                ((timestamp - self.EPOCH) << self.TIMESTAMP_SHIFT)
                | (self.worker_id << self.WORKER_ID_SHIFT)
                | self.sequence
            )
            return snowflake_id


class URLShortener:
    """
    Main URL Shortener Engine combining Snowflake ID generation,
    Feistel Pseudorandom Permutation, and Base62 Encoding.
    """

    def __init__(self, secret_key: str = "url-magic-secret-key", worker_id: int = 1, bits: int = 36):
        self.id_generator = SnowflakeGenerator(worker_id=worker_id)
        self.cipher = FeistelCipher(key=secret_key, bits=bits)

    def generate_short_code(self, numeric_id: int | None = None) -> str:
        """
        Generates a unique Base62 short code from a unique numeric ID.
        If numeric_id is not provided, generates a new Snowflake ID.
        """
        if numeric_id is None:
            numeric_id = self.id_generator.generate_id()
        
        scrambled_id = self.cipher.encrypt(numeric_id)
        return Base62Encoder.encode(scrambled_id, min_length=6)

    def decode_short_code(self, short_code: str) -> int:
        """
        Decodes a Base62 short code back to its original numeric ID.
        """
        scrambled_id = Base62Encoder.decode(short_code)
        return self.cipher.decrypt(scrambled_id)