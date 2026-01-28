#!/usr/bin/env python3
"""
Convert inventory JPG files to PNG format with correct naming
"""
from PIL import Image
import os

def convert_icon(input_path, output_path, size=None):
    """Convert JPG to PNG and optionally resize"""
    try:
        # Open and convert image
        img = Image.open(input_path)
        
        # Convert to RGB if needed (in case of RGBA or other modes)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if size specified
        if size:
            img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save as PNG
        img.save(output_path, 'PNG', optimize=True)
        print(f"[OK] Converted {os.path.basename(input_path)} -> {os.path.basename(output_path)} ({img.size[0]}x{img.size[1]})")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to convert {input_path}: {str(e)}")
        return False

if __name__ == '__main__':
    # Get public directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, '..', 'public')
    
    # Convert icons
    print("Converting inventory icons...")
    
    # Convert inventory.192.jpg to icon-192.png
    convert_icon(
        os.path.join(public_dir, 'inventory.192.jpg'),
        os.path.join(public_dir, 'icon-192.png'),
        size=192
    )
    
    # Convert inventory.512.jpg to icon-512.png
    convert_icon(
        os.path.join(public_dir, 'inventory.512.jpg'),
        os.path.join(public_dir, 'icon-512.png'),
        size=512
    )
    
    # Create favicon from 192 icon (RGBA format for Next.js)
    try:
        favicon_img = Image.open(os.path.join(public_dir, 'inventory.192.jpg'))
        
        # Convert to RGB first
        if favicon_img.mode != 'RGB':
            favicon_img = favicon_img.convert('RGB')
        
        # Resize to 32x32
        favicon_img = favicon_img.resize((32, 32), Image.Resampling.LANCZOS)
        
        # Convert to RGBA (required by Next.js)
        favicon_img = favicon_img.convert('RGBA')
        
        # Save as ICO with RGBA format
        favicon_img.save(os.path.join(public_dir, 'favicon.ico'), format='ICO', sizes=[(32, 32)])
        print(f"[OK] Created favicon.ico (32x32, RGBA format)")
        
    except Exception as e:
        print(f"[ERROR] Failed to create favicon: {str(e)}")
    
    print("\n[OK] All icons converted successfully!")

