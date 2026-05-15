import { loadAppConfig } from './data/config-loader.js';
import { QRResolver } from './data/qr-resolver.js';
import { DeityAssignmentResolver } from './data/deity-assignment-resolver.js';
import { LocalContentProvider } from './data/content-provider.js';
import { LocalServerEventLogger } from './events/event-logger.js';
import { QRScanner } from './scanner/qr-scanner.js';
import { CollectionStore } from './storage/collection-store.js';
import { AppView } from './views/app-view.js';

function createFallbackRevealContent(deity) {
    return {
        deityId: deity.id,
        title: deity.displayName || deity.id,
        body: 'Reveal text is not available yet.',
        source: 'fallback',
        generatedAt: new Date().toISOString()
    };
}

export class AppController {
    constructor(config) {
        this.config = config;
        this.deitiesById = new Map(config.deities.map(deity => [deity.id, deity]));
        this.qrResolver = new QRResolver(config);
        this.assignmentResolver = new DeityAssignmentResolver(config);
        this.contentProvider = new LocalContentProvider(config);
        this.collectionStore = new CollectionStore();
        this.eventLogger = new LocalServerEventLogger();
        this.currentView = 'home';
        this.activeOverlay = null;

        this.elements = {
            app: document.getElementById('app'),
            appView: document.getElementById('appView'),
            appOverlayLayer: document.getElementById('appOverlayLayer'),
            appToastLayer: document.getElementById('appToastLayer'),
            clearCollectionButton: document.getElementById('clearCollectionButton'),
            landingAnimation: document.getElementById('landingAnimation'),
            landingLogo: document.getElementById('landingLogo'),
            views: Array.from(document.querySelectorAll('[data-view]')),
            navButtons: Array.from(document.querySelectorAll('[data-view-target]')),
            surfaceCloseButtons: Array.from(document.querySelectorAll('[data-close-surface]')),
            qrVideo: document.getElementById('qrVideo'),
            collectionGrid: document.getElementById('collectionGrid'),
            collectionEmpty: document.getElementById('collectionEmpty')
        };

        this.view = new AppView(this.elements);
        this.scanner = new QRScanner({
            videoElement: this.elements.qrVideo,
            onScan: rawValue => this.handleScan(rawValue),
            onError: message => this.handleScannerError(message)
        });
    }

    init() {
        this.applyShellClasses();
        this.setIntroVisible(true);
        this.bindIntro();
        this.bindNavigation();
        this.bindSurfaceClose();
        this.bindCollectionActions();
        this.bindLanguageScaffold();
        this.bindKeyboard();
        this.bindGlobals();
        this.renderCollection();
        this.setCurrentView('home');
        this.view.showIntro();
    }

    applyShellClasses() {
        const userAgent = navigator.userAgent || '';
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(userAgent);
        const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const deviceClass = viewportWidth >= 1024 && !hasCoarsePointer
            ? 'is-desktop'
            : viewportWidth >= 768
                ? 'is-tablet'
                : 'is-mobile';

        const classes = [
            isStandalone ? 'is-standalone' : 'is-browser',
            isIos ? 'is-ios' : null,
            isAndroid ? 'is-android' : null,
            deviceClass
        ].filter(Boolean);

        document.body.classList.remove('is-standalone', 'is-browser', 'is-ios', 'is-android', 'is-desktop', 'is-tablet', 'is-mobile');
        document.body.classList.add(...classes);

        if (this.elements.app) {
            this.elements.app.classList.remove('is-standalone', 'is-browser', 'is-ios', 'is-android', 'is-desktop', 'is-tablet', 'is-mobile');
            this.elements.app.classList.add(...classes);
        }
    }

    bindNavigation() {
        for (const button of this.elements.navButtons) {
            button.addEventListener('click', () => {
                const nextView = button.dataset.viewTarget;
                if (nextView) {
                    this.setCurrentView(nextView);
                }
            });
        }
    }

    bindSurfaceClose() {
        for (const button of this.elements.surfaceCloseButtons) {
            button.addEventListener('click', () => {
                this.setCurrentView('home');
            });
        }
    }

    setIntroVisible(isVisible) {
        document.body.classList.toggle('intro-visible', isVisible);
        if (this.elements.app) {
            this.elements.app.classList.toggle('intro-visible', isVisible);
        }
    }

    setActiveOverlay(nextOverlay) {
        this.activeOverlay = nextOverlay;
        this.updateAppStateClasses();
    }

    updateAppStateClasses() {
        const viewClasses = ['view-home', 'view-camera', 'view-map', 'view-collection'];
        const overlayClasses = ['overlay-reveal', 'overlay-camera-error'];
        const targets = [document.body, this.elements.app].filter(Boolean);

        for (const target of targets) {
            target.classList.remove(...viewClasses, ...overlayClasses);
            target.classList.add(`view-${this.currentView}`);

            if (this.activeOverlay === 'reveal') {
                target.classList.add('overlay-reveal');
            } else if (this.activeOverlay === 'cameraError') {
                target.classList.add('overlay-camera-error');
            }
        }
    }

    bindCollectionActions() {
        if (!this.elements.clearCollectionButton) return;

        this.elements.clearCollectionButton.addEventListener('click', () => {
            this.clearCollectionCache();
        });
    }

    bindLanguageScaffold() {
        const languageButtons = document.querySelectorAll('[data-language]');
        for (const button of languageButtons) {
            button.addEventListener('click', event => {
                event.preventDefault();
            });
        }
    }

    bindIntro() {
        const enterHome = event => {
            if (event) {
                event.preventDefault();
            }
            this.view.hideIntro();
            this.setIntroVisible(false);
            this.setCurrentView('home');
        };

        if (this.elements.landingAnimation) {
            this.elements.landingAnimation.addEventListener('touchstart', enterHome, { passive: false });
            this.elements.landingAnimation.addEventListener('click', enterHome);
        }
    }

    setCurrentView(nextView) {
        if (!['home', 'map', 'camera', 'collection'].includes(nextView)) {
            return;
        }

        const previousView = this.currentView;
        this.currentView = nextView;

        if (previousView === 'camera' && nextView !== 'camera') {
            this.scanner.stop();
        }

        if (nextView === 'collection') {
            this.renderCollection();
        }

        this.view.showView(nextView);
        this.updateNavState();
        this.updateAppStateClasses();

        if (nextView === 'camera') {
            this.scanner.start();
        }
    }

    updateNavState() {
        for (const button of this.elements.navButtons) {
            const isActive = button.dataset.viewTarget === this.currentView;
            button.classList.toggle('is-active', isActive);
            if (isActive) {
                button.setAttribute('aria-current', 'page');
            } else {
                button.removeAttribute('aria-current');
            }
        }
    }

    bindKeyboard() {
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') {
                return;
            }

            if (this.activeOverlay) {
                return;
            }

            if (this.currentView !== 'home') {
                this.setCurrentView('home');
            }
        });

        const displayModeQuery = window.matchMedia('(display-mode: standalone)');
        const updateClasses = () => {
            this.applyShellClasses();
        };

        if (typeof displayModeQuery.addEventListener === 'function') {
            displayModeQuery.addEventListener('change', updateClasses);
        } else if (typeof displayModeQuery.addListener === 'function') {
            displayModeQuery.addListener(updateClasses);
        }

        window.addEventListener('resize', updateClasses);
    }

    bindGlobals() {
        window.clearCollectionCache = () => this.clearCollectionCache();
    }

    async handleScan(rawValue) {
        if (!rawValue) return;

        const baseResolution = this.qrResolver.resolve(rawValue);

        if (baseResolution.status !== 'resolved') {
            this.scanner.markInvalid(rawValue);
            this.eventLogger.log({
                eventType: 'qr_scan_invalid',
                occurredAt: new Date().toISOString(),
                quantity: 1
            });
            return;
        }

        const resolution = this.assignmentResolver.resolve(baseResolution);
        this.scanner.markAccepted(rawValue);
        this.scanner.pause('reveal');

        try {
            const scannedAt = new Date().toISOString();
            let collectionUpdated = false;

            try {
                this.collectionStore.addOrUpdate({
                    deityId: resolution.deity.id,
                    scannedAt
                });
                collectionUpdated = true;
            } catch {
                collectionUpdated = false;
            }

            this.eventLogger.log({
                eventType: 'qr_scan_valid',
                occurredAt: scannedAt,
                qrId: resolution.qrCode.id,
                locationId: resolution.location.id,
                deityId: resolution.deity.id,
                quantity: 1
            });

            let revealContent;
            try {
                revealContent = await this.contentProvider.getRevealContent({
                    qrCode: resolution.qrCode,
                    location: resolution.location,
                    deity: resolution.deity
                });
            } catch {
                revealContent = createFallbackRevealContent(resolution.deity);
            }

            this.renderCollection();
            if (collectionUpdated) {
                this.view.animateCollectionIcon();
            }
            this.setActiveOverlay('reveal');
            this.view.showReveal(revealContent, () => {
                this.setActiveOverlay(null);
                if (this.currentView === 'camera') {
                    this.scanner.resumeAfterCooldown();
                }
            });
        } catch {
            this.setActiveOverlay(null);
            if (this.currentView === 'camera') {
                this.scanner.resumeAfterCooldown();
            }
        }
    }

    clearCollectionCache() {
        this.collectionStore.clear();
        this.renderCollection();
        if (this.currentView === 'camera') {
            this.scanner.resumeAfterCooldown();
        }
    }

    renderCollection() {
        const totalSlots = Math.max(15, this.config.deities.length, this.collectionStore.getItems().length);
        this.view.renderCollection(this.collectionStore.getItems(), this.deitiesById, totalSlots);
    }

    handleScannerError(message) {
        this.setActiveOverlay('cameraError');
        this.view.showCameraError(message, () => {
            this.setActiveOverlay(null);
            if (this.currentView === 'camera') {
                this.scanner.start();
            }
        });
    }
}

export async function bootstrapApp() {
    try {
        const config = await loadAppConfig();
        const app = new AppController(config);
        app.init();
        window.pwaDemoApp = app;
    } catch (error) {
        const fallbackView = new AppView({
            appOverlayLayer: document.getElementById('appOverlayLayer')
        });
        fallbackView.showCameraError(error.message || 'App configuration could not be loaded.', () => {
            window.location.reload();
        });
    }
}
