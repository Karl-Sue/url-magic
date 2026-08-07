import io
from pathlib import Path

from PIL import Image

from services.qr_generator import generate_qr_code


def test_generate_qr_code_valid_png(test_target_url: str):
    """
    In-memory validation: Decodes bytes directly into a PIL Image and checks properties.
    No files created.
    """
    qr_bytes = generate_qr_code(url=test_target_url)
    
    assert isinstance(qr_bytes, bytes)
    assert len(qr_bytes) > 0
    
    # Verify image integrity directly from memory stream
    with Image.open(io.BytesIO(qr_bytes)) as img:
        assert img.format == "PNG"
        assert img.size[0] > 0 and img.size[1] > 0


def test_generate_qr_code_temp_file_saving(test_target_url: str, tmp_path: Path):
    """
    Isolated disk validation: Uses pytest's `tmp_path` fixture to write to a temporary,
    auto-cleaned OS directory without polluting the project repository.
    """
    qr_bytes = generate_qr_code(url=test_target_url)
    
    # Save to temporary test directory managed by pytest
    temp_file = tmp_path / "youtube_qr.png"
    temp_file.write_bytes(qr_bytes)
    
    assert temp_file.exists()
    assert temp_file.stat().st_size > 0

