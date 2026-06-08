import { bootstrapApp } from './app.js';
import { runQrSelfTest } from './diagnostics/qr-self-test.js';
import { initHomeRive } from './views/home-rive.js';

document.addEventListener('DOMContentLoaded', () => {
    runQrSelfTest();
    bootstrapApp();
    initHomeRive();
});
