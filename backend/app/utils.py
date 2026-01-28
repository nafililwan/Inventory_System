# Utility functions
# Activity logging removed - ActivityLog model deleted during reset

def generate_qr_code(data: str) -> str:
    """
    Generate QR code for given data
    Returns: QR code string (can be used as identifier)
    """
    import uuid
    # Generate unique QR code identifier
    qr_code = f"INV-{uuid.uuid4().hex[:12].upper()}"
    return qr_code

def generate_qr_code_image(qr_data: str) -> str:
    """
    Generate QR code image as base64 string
    Returns: Base64 encoded PNG image
    """
    import qrcode
    from io import BytesIO
    import base64
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def generate_sku(item_code: str, size: str = None, color: str = None) -> str:
    """
    Generate SKU (Stock Keeping Unit) from item code, size, and color
    Format: ITEMCODE-SIZE-COLOR (e.g., UNI001-M-BLUE)
    """
    parts = [item_code] if item_code else []
    if size:
        parts.append(size.upper())
    if color:
        parts.append(color.upper().replace(" ", ""))
    return "-".join(parts)

def generate_batch_number() -> str:
    """
    Generate batch number for shipments
    Format: BATCH-YYYYMMDD-XXXXX
    """
    from datetime import datetime
    import uuid
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = uuid.uuid4().hex[:5].upper()
    return f"BATCH-{date_str}-{random_str}"
