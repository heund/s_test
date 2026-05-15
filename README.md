# PWA demo

This is the stripped bare-mechanics QR deity collection PWA.

It contains intro, camera QR scanning, text-only deity reveal, inventory, and map navigation.

The scanner, QR resolution, reveal content, collection storage, and event logging interfaces are split into small framework-free browser modules.

QR codes, locations, deities, mappings, reveal text, and future event deity rules are stored as local JSON config.

The only preserved image assets are literal QR code images.

Deity images and map images have been removed.

The security folder is preserved.

Collected deity IDs are stored locally.

Camera access is used only for QR scanning.

Anonymous event logging is currently an interface only and does not send network traffic.

No service worker is currently registered.

No frontend secrets should be present.
