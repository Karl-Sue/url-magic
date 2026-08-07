import pytest

from services.url_shortener import (
    Base62Encoder,
    FeistelCipher,
    SnowflakeGenerator,
    URLShortener,
)


def test_base62_encoding_decoding():
    test_numbers = [0, 1, 61, 62, 1000, 123456789, 9876543210]
    for num in test_numbers:
        encoded = Base62Encoder.encode(num, min_length=6)
        decoded = Base62Encoder.decode(encoded)
        assert decoded == num, f"Failed for number {num}"
        assert len(encoded) >= 6

def test_base62_invalid_char():
    with pytest.raises(ValueError):
        Base62Encoder.decode("Invalid!Char")

def test_feistel_cipher_reversibility():
    cipher = FeistelCipher(key="test-secret-key", bits=36, rounds=4)
    test_ids = [0, 1, 42, 1000, 99999, 12345678]
    for orig_id in test_ids:
        encrypted = cipher.encrypt(orig_id)
        decrypted = cipher.decrypt(encrypted)
        assert decrypted == orig_id, f"Failed reversibility for ID {orig_id}"

def test_feistel_uniqueness_no_collisions():
    cipher = FeistelCipher(key="collision-test-key", bits=36, rounds=4)
    seen = set()
    num_samples = 10000
    for i in range(num_samples):
        encrypted = cipher.encrypt(i)
        assert encrypted not in seen, f"Collision detected at index {i}!"
        seen.add(encrypted)
    assert len(seen) == num_samples

def test_snowflake_generator_uniqueness():
    gen = SnowflakeGenerator(worker_id=1)
    ids = [gen.generate_id() for _ in range(1000)]
    assert len(set(ids)) == 1000
    assert all(i > 0 for i in ids)

def test_url_shortener_full_pipeline():
    shortener = URLShortener(secret_key="my-app-secret")
    
    # Test short code generation with auto-generated Snowflake ID
    code1 = shortener.generate_short_code()
    assert isinstance(code1, str)
    assert len(code1) >= 6

    # Test short code generation with deterministic custom ID
    code2 = shortener.generate_short_code(numeric_id=12345)
    code3 = shortener.generate_short_code(numeric_id=12345)
    assert code2 == code3, "Same numeric ID should produce identical short code"

    decoded_id = shortener.decode_short_code(code2)
    assert decoded_id == (12345 & shortener.cipher.total_mask)
