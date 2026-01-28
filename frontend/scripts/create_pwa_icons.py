#!/usr/bin/env python3
"""
Create simple PWA icons (192x192 and 512x512 PNG files)
"""
from PIL import Image, ImageDraw
import os

def create_icon(size, output_path):
    """Create a simple blue icon with white square"""
    # Create image with blue background
    img = Image.new('RGB', (size, size), color='#3b82f6')
    draw = ImageDraw.Draw(img)
    
    # Draw white rounded square in center
    margin = int(size * 0.2)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=int(size * 0.1),
        fill='#ffffff'
    )
    
    # Draw blue square inside
    inner_margin = int(size * 0.3)
    draw.rounded_rectangle(
        [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
        radius=int(size * 0.05),
        fill='#3b82f6'
    )
    
    # Save
    img.save(output_path, 'PNG')
    print(f"[OK] Created {output_path} ({size}x{size})")

if __name__ == '__main__':
    # Get public directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, '..', 'public')
    
    # Create icons
    create_icon(192, os.path.join(public_dir, 'icon-192.png'))
    create_icon(512, os.path.join(public_dir, 'icon-512.png'))
    
    print("\n[OK] All PWA icons created successfully!")

