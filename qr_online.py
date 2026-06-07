 #!/usr/bin/env python3
"""
QR Code Generator for the PWA test QR set.
"""

from urllib.parse import quote_plus

import requests
from PIL import Image
import io

QR_SIZE = 3000
API_SIZE = 1000

def generate_qr_code(url, filename):
    """Generate an exact-size QR code PNG for the given URL."""
    qr_url = (
        "https://api.qrserver.com/v1/create-qr-code/"
        f"?size={API_SIZE}x{API_SIZE}&data={quote_plus(url)}"
    )
    response = requests.get(qr_url, timeout=20)
    response.raise_for_status()

    img = Image.open(io.BytesIO(response.content)).convert("RGB")
    img = img.resize((QR_SIZE, QR_SIZE), Image.NEAREST)
    img.save(filename)

    print(f"QR code saved as: {filename}")
    print(f"URL encoded: {url}")

def main():
    # URLs for QR codes
    urls = [
        "https://heund.github.io/jeju_mockup/q/jejushin12345",
        "https://heund.github.io/jeju_mockup/q/jejushin67891",
        "https://heund.github.io/jeju_mockup/q/jejushin00003",
        "https://heund.github.io/jeju_mockup/q/jejushin00004",
        "https://heund.github.io/jeju_mockup/q/jejushin00005",
        "https://heund.github.io/jeju_mockup/q/jejushin00006",
        "https://heund.github.io/jeju_mockup/q/jejushin00007",
        "https://heund.github.io/jeju_mockup/q/jejushin00008",
        "https://heund.github.io/jeju_mockup/q/jejushin00009",
        "https://heund.github.io/jeju_mockup/q/jejushin00010",
        "https://heund.github.io/jeju_mockup/q/jejushin00011",
        "https://heund.github.io/jeju_mockup/q/jejushin00012"
    ]
    
    # Generate QR codes
    for i, url in enumerate(urls, 1):
        filename = f"qr_code_{i}.png"
        generate_qr_code(url, filename)
    
    print("\nQR codes generated successfully!")
    print("Scan these codes to test the app directly.")

if __name__ == "__main__":
    main()
