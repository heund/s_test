const QR_SELF_TEST_ASSETS = [
    './qr_code_1.png',
    './qr_code_2.png',
    './qrcode/nVBijC.png'
];

export async function runQrSelfTest() {
    if (typeof window.jsQR === 'undefined') {
        console.info('[QR self-test]', 'jsQR is not available');
        return;
    }

    for (const assetPath of QR_SELF_TEST_ASSETS) {
        try {
            const result = await decodeImageAsset(assetPath);
            console.info('[QR self-test]', 'asset decode result', {
                assetPath,
                decoded: Boolean(result),
                value: result || null
            });
        } catch (error) {
            console.info('[QR self-test]', 'asset decode failed', {
                assetPath,
                message: error.message || 'Unknown decode error'
            });
        }
    }
}

async function decodeImageAsset(assetPath) {
    const image = await loadImage(assetPath);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
    });

    return code && code.data ? code.data.trim() : '';
}

function loadImage(assetPath) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Image could not be loaded'));
        image.src = assetPath;
    });
}
