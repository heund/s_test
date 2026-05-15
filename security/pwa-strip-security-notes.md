# PWA Strip Security Notes

- The stripped PWA stores only local collected deity IDs.
- Camera permission is used only for QR scanning.
- QR codes map to deity reveal text/content.
- Future event deity rules should use aggregate, event-level data only.
- Anonymous event logging is currently a no-network interface/stub.
- Only literal QR code images are preserved.
- Deity images and map images are removed.
- No secrets should be present in frontend code.
- Dependency count should be kept minimal.
- Run npm audit after reinstalling dependencies.
