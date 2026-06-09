import { bootstrapApp } from './app.js';
import { runQrSelfTest } from './diagnostics/qr-self-test.js';

document.addEventListener('DOMContentLoaded', () => {
    runQrSelfTest();
    bootstrapApp();
});
