 #!/usr/bin/env python3
"""
QR Code Generator using requests to online API
"""

import requests
from PIL import Image
import io

def generate_qr_code(url, filename):
    """Generate QR code for given URL using QR Server API"""
    # Use QR Server API (free, no API key needed)
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={url}"
    
    try:
        # Download QR code image
        response = requests.get(qr_url)
        response.raise_for_status()
        
        # Save image
        img = Image.open(io.BytesIO(response.content))
        img.save(filename)
        
        print(f"QR code saved as: {filename}")
        print(f"URL encoded: {url}")
        
    except Exception as e:
        print(f"Error generating QR code: {e}")

def main():
    # URLs for QR codes
    urls = [
        "https://heund.github.io/jeju_mockup/q/jejushin12345",
        "https://heund.github.io/jeju_mockup/q/jejushin67891"
    ]
    
    # Generate QR codes
    for i, url in enumerate(urls, 1):
        filename = f"qr_code_{i}.png"
        generate_qr_code(url, filename)
    
    print("\nQR codes generated successfully!")
    print("Scan these codes to test the app directly.")

if __name__ == "__main__":
    main()
