import io

import qrcode
from qrcode.constants import ERROR_CORRECT_M
from qrcode.image.pil import PilImage


def generate_qr_code(
    url: str,
    box_size: int = 10,
    border: int = 4,
    error_correction: int = ERROR_CORRECT_M,
    fill_color: str = "black",
    back_color: str = "white",
) -> bytes:
    """
    Generates a PNG QR code image as bytes for a given URL using industry best practices.

    Args:
        url: The payload URL or text to encode.
        box_size: Controls how many pixels each 'box' (module) of the QR code is.
        border: Controls how many boxes thick the quiet zone border should be (minimum 4 per spec).
        error_correction: Error correction level (ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H).
        fill_color: Color of the QR code modules (foreground).
        back_color: Background color of the QR code image.

    Returns:
        bytes: PNG image data bytes ready to be saved or returned in an HTTP response.
    """
    qr = qrcode.QRCode(
        version=None,  # Automatic version selection based on content length
        error_correction=error_correction,
        box_size=box_size,
        border=border,
    )
    
    # Add payload URL
    qr.add_data(url)
    
    # Optimize compilation grid fits exact content size
    qr.make(fit=True)
    
    # Render PIL image
    img: PilImage = qr.make_image(fill_color=fill_color, back_color=back_color)
    
    # Save image to bytes buffer (in-memory stream)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
