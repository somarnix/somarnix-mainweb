"""
Icon Generator for Google Flow Auto Video Generator Extension
This script creates placeholder PNG icons for the Chrome extension.
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("⚠️  PIL/Pillow not installed. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont
    print("✅ Pillow installed successfully!")

import os

def create_icon(size, filename):
    """Create a single icon of specified size"""
    
    # Create image with gradient-like background
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient effect (simplified)
    for i in range(size):
        # Interpolate between two colors
        r1, g1, b1 = 102, 126, 234  # #667eea
        r2, g2, b2 = 118, 75, 162   # #764ba2
        
        factor = i / size
        r = int(r1 + (r2 - r1) * factor)
        g = int(g1 + (g2 - g1) * factor)
        b = int(b1 + (b2 - b1) * factor)
        
        draw.line([(0, i), (size, i)], fill=(r, g, b))
    
    # Draw icon elements based on size
    if size == 16:
        # Simple play triangle
        points = [(5, 4), (5, 12), (12, 8)]
        draw.polygon(points, fill='white')
        
    elif size == 48:
        # Camera body
        draw.rectangle([8, 16, 32, 34], fill='white')
        # Lens
        draw.ellipse([14, 19, 26, 31], fill='white')
        draw.ellipse([17, 22, 23, 28], fill='#667eea')
        # Play triangle
        points = [(30, 20), (30, 30), (38, 25)]
        draw.polygon(points, fill='white')
        # Viewfinder
        draw.rectangle([12, 10, 20, 16], outline='white', width=2)
        
    else:  # 128
        # Camera body
        draw.rectangle([20, 40, 90, 90], fill='white')
        # Lens
        draw.ellipse([37, 47, 73, 83], fill='white')
        draw.ellipse([45, 55, 65, 75], fill='#667eea')
        # Play button
        points = [(75, 50), (75, 80), (100, 65)]
        draw.polygon(points, fill='white')
        # Viewfinder
        draw.rectangle([30, 25, 50, 40], outline='white', width=3)
        
        # Add text/emoji if possible
        try:
            # Try to add emoji or text
            font_size = 20
            try:
                font = ImageFont.truetype("seguiemj.ttf", font_size)  # Emoji font on Windows
            except:
                try:
                    font = ImageFont.truetype("arial.ttf", font_size)
                except:
                    font = ImageFont.load_default()
            
            draw.text((95, 25), "✨", fill='#ffeb3b', font=font)
            draw.text((10, 92), "✨", fill='#ffeb3b', font=font)
        except:
            # If font fails, just skip the emoji
            pass
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"✅ Created: {filename} ({size}x{size})")

def main():
    """Generate all three icon sizes"""
    print("🎬 Google Flow Extension - Icon Generator")
    print("=" * 50)
    
    # Get current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Icon sizes and filenames
    icons = [
        (16, 'icon16.png'),
        (48, 'icon48.png'),
        (128, 'icon128.png')
    ]
    
    # Generate each icon
    for size, filename in icons:
        filepath = os.path.join(current_dir, filename)
        create_icon(size, filepath)
    
    print("=" * 50)
    print("✅ All icons generated successfully!")
    print("\nYou can now load the extension in Chrome/Edge:")
    print("1. Go to chrome://extensions/ or edge://extensions/")
    print("2. Enable 'Developer mode'")
    print("3. Click 'Load unpacked'")
    print("4. Select this folder")

if __name__ == "__main__":
    main()
