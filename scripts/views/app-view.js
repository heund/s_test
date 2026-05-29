const PAPER_FOLD_TIMELINE = {
    totalDurationMs: 8400,
    closeEnd: 0.36,
    openStart: 0.54,
    openEnd: 0.68,
    openCascadeGapMs: 80,
    offsetHoldWithinClose: 0.24,
    offsetSettleWithinClose: 0.55,
    offsetReturn: 0.56
};

function toPercent(value) {
    return `${(value * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
}

function shiftedOpenPhase(panelDelayMs, sequenceIndex) {
    const desiredOpenStartMs = (PAPER_FOLD_TIMELINE.openStart * PAPER_FOLD_TIMELINE.totalDurationMs)
        + (PAPER_FOLD_TIMELINE.openCascadeGapMs * sequenceIndex);
    const desiredOpenEndMs = (PAPER_FOLD_TIMELINE.openEnd * PAPER_FOLD_TIMELINE.totalDurationMs)
        + (PAPER_FOLD_TIMELINE.openCascadeGapMs * sequenceIndex);

    return {
        start: toPercent((desiredOpenStartMs - panelDelayMs) / PAPER_FOLD_TIMELINE.totalDurationMs),
        end: toPercent((desiredOpenEndMs - panelDelayMs) / PAPER_FOLD_TIMELINE.totalDurationMs)
    };
}

export class AppView {
    constructor(elements) {
        this.elements = elements;
        this.mountPaperFoldOverlay();
        this.syncPaperFoldTimeline();
    }

    mountPaperFoldOverlay() {
        const { appOverlayLayer, paperFoldOverlay } = this.elements;
        if (!appOverlayLayer || !paperFoldOverlay || paperFoldOverlay.parentElement === appOverlayLayer) return;

        appOverlayLayer.appendChild(paperFoldOverlay);
    }

    syncPaperFoldTimeline() {
        const { paperFoldOverlay } = this.elements;
        if (!paperFoldOverlay) return;

        const closeEnd = toPercent(PAPER_FOLD_TIMELINE.closeEnd);
        const openStart = toPercent(PAPER_FOLD_TIMELINE.openStart);
        const offsetHold = toPercent(PAPER_FOLD_TIMELINE.closeEnd * PAPER_FOLD_TIMELINE.offsetHoldWithinClose);
        const offsetSettle = toPercent(PAPER_FOLD_TIMELINE.closeEnd * PAPER_FOLD_TIMELINE.offsetSettleWithinClose);
        const offsetReturn = toPercent(PAPER_FOLD_TIMELINE.offsetReturn);
        const opacityFadeStart = toPercent(PAPER_FOLD_TIMELINE.closeEnd * 0.58);
        const opacityHide = toPercent(PAPER_FOLD_TIMELINE.closeEnd * 0.61);
        const outlineFadeStart = toPercent(PAPER_FOLD_TIMELINE.closeEnd - 0.015);
        const rightOpen = shiftedOpenPhase(0, 0);
        const leftOpen = shiftedOpenPhase(220, 1);
        const topOpen = shiftedOpenPhase(440, 2);
        const bottomOpen = shiftedOpenPhase(660, 3);

        paperFoldOverlay.style.setProperty('--fold-total-duration', `${PAPER_FOLD_TIMELINE.totalDurationMs}ms`);

        let style = document.getElementById('paperFoldTimelineStyles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'paperFoldTimelineStyles';
            document.head.appendChild(style);
        }

        style.textContent = `
@keyframes paper-fold-right {
    0% { opacity: 0; transform: translate3d(calc(100vw + var(--overscan)), 0, calc(-1 * var(--paper-depth))) rotateY(-62deg) rotateZ(0.7deg); animation-timing-function: var(--fold-ease); }
    8% { opacity: 1; }
    ${closeEnd}, ${rightOpen.start} { opacity: 1; transform: translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg); animation-timing-function: var(--fold-ease-reverse); }
    ${rightOpen.end}, 100% { opacity: 1; transform: translate3d(calc(100vw + var(--overscan)), 0, calc(-1 * var(--paper-depth))) rotateY(56deg) rotateZ(-0.4deg); }
}

@keyframes paper-fold-left {
    0% { opacity: 0; transform: translate3d(calc(-100vw - var(--overscan)), 0, calc(-1 * var(--paper-depth))) rotateY(62deg) rotateZ(-0.8deg); animation-timing-function: var(--fold-ease); }
    8% { opacity: 1; }
    ${closeEnd}, ${leftOpen.start} { opacity: 1; transform: translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg); animation-timing-function: var(--fold-ease-reverse); }
    ${leftOpen.end}, 100% { opacity: 1; transform: translate3d(calc(-100vw - var(--overscan)), 0, calc(-1 * var(--paper-depth))) rotateY(-56deg) rotateZ(0.5deg); }
}

@keyframes paper-fold-top {
    0% { opacity: 0; transform: translate3d(0, calc(-100vh - var(--overscan)), calc(-1 * var(--paper-depth))) rotateX(-64deg) rotateZ(0.5deg); animation-timing-function: var(--fold-ease); }
    8% { opacity: 1; }
    ${closeEnd}, ${topOpen.start} { opacity: 1; transform: translate3d(0, 0, 0) rotateX(0deg) rotateZ(0deg); animation-timing-function: var(--fold-ease-reverse); }
    ${topOpen.end}, 100% { opacity: 1; transform: translate3d(0, calc(-100vh - var(--overscan)), calc(-1 * var(--paper-depth))) rotateX(58deg) rotateZ(-0.3deg); }
}

@keyframes paper-fold-bottom {
    0% { opacity: 0; transform: translate3d(0, calc(100vh + var(--overscan)), calc(-1 * var(--paper-depth))) rotateX(64deg) rotateZ(-0.5deg); animation-timing-function: var(--fold-ease); }
    8% { opacity: 1; }
    ${closeEnd}, ${bottomOpen.start} { opacity: 1; transform: translate3d(0, 0, 0) rotateX(0deg) rotateZ(0deg); animation-timing-function: var(--fold-ease-reverse); }
    ${bottomOpen.end}, 100% { opacity: 1; transform: translate3d(0, calc(100vh + var(--overscan)), calc(-1 * var(--paper-depth))) rotateX(-58deg) rotateZ(0.3deg); }
}

@keyframes paper-fold-left-duplicate-offset {
    0%, ${offsetHold} { opacity: 0.6; transform: translate(3px, 3px); }
    ${offsetSettle}, ${opacityFadeStart} { opacity: 0.6; transform: translate(0, 0); }
    ${opacityHide} { opacity: 0; transform: translate(0, 0); }
    ${closeEnd}, ${leftOpen.start} { opacity: 0; transform: translate(0, 0); }
    ${offsetReturn}, 100% { opacity: 0.6; transform: translate(3px, 3px); }
}

@keyframes paper-fold-right-duplicate-offset {
    0%, ${offsetHold} { opacity: 0.6; transform: translate(-3px, 3px); }
    ${offsetSettle}, ${opacityFadeStart} { opacity: 0.6; transform: translate(0, 0); }
    ${opacityHide} { opacity: 0; transform: translate(0, 0); }
    ${closeEnd}, ${rightOpen.start} { opacity: 0; transform: translate(0, 0); }
    ${offsetReturn}, 100% { opacity: 0.6; transform: translate(-3px, 3px); }
}

@keyframes paper-fold-top-duplicate-offset {
    0%, ${offsetHold} { opacity: 0.6; transform: translate(3px, 3px); }
    ${offsetSettle}, ${opacityFadeStart} { opacity: 0.6; transform: translate(0, 0); }
    ${opacityHide} { opacity: 0; transform: translate(0, 0); }
    ${closeEnd}, ${topOpen.start} { opacity: 0; transform: translate(0, 0); }
    ${offsetReturn}, 100% { opacity: 0.6; transform: translate(3px, 3px); }
}

@keyframes paper-fold-top-duplicate-extension {
    0%, ${offsetHold} { opacity: 0.6; transform: translate(3px, 3px); }
    ${offsetSettle}, ${closeEnd}, ${topOpen.start} { opacity: 0; transform: translate(0, 0); }
    ${offsetReturn}, 100% { opacity: 0.6; transform: translate(3px, 3px); }
}

@keyframes paper-fold-bottom-duplicate-offset {
    0%, ${offsetHold} { opacity: 0.6; transform: translate(3px, -3px); }
    ${offsetSettle}, ${opacityFadeStart} { opacity: 0.6; transform: translate(0, 0); }
    ${opacityHide} { opacity: 0; transform: translate(0, 0); }
    ${closeEnd}, ${bottomOpen.start} { opacity: 0; transform: translate(0, 0); }
    ${offsetReturn}, 100% { opacity: 0.6; transform: translate(3px, -3px); }
}

@keyframes paper-fold-bottom-duplicate-extension {
    0%, ${offsetHold} { opacity: 0.6; transform: translate(3px, -3px); }
    ${offsetSettle}, ${closeEnd}, ${bottomOpen.start} { opacity: 0; transform: translate(0, 0); }
    ${offsetReturn}, 100% { opacity: 0.6; transform: translate(3px, -3px); }
}

@keyframes paper-fold-outline-opacity {
    0%, ${outlineFadeStart} { opacity: 0.55; }
    ${closeEnd}, ${openStart} { opacity: 0; }
    ${offsetReturn}, 100% { opacity: 0.55; }
}
`;
    }

    showView(viewName) {
        for (const view of this.elements.views || []) {
            const isActive = view.dataset.view === viewName || (viewName === 'result' && view.dataset.view === 'camera');
            view.hidden = !isActive;
            view.classList.toggle('is-active', isActive);
        }
    }

    showIntro() {
        const { landingAnimation, landingLogo } = this.elements;
        if (!landingAnimation || !landingLogo) return;

        landingAnimation.style.display = 'block';
        landingAnimation.style.opacity = '1';
        landingLogo.style.opacity = '1';
    }

    hideIntro(immediate = false) {
        const { landingAnimation } = this.elements;
        if (!landingAnimation) return;

        if (immediate) {
            landingAnimation.style.display = 'none';
            landingAnimation.style.opacity = '0';
            return;
        }

        landingAnimation.style.opacity = '0';
        window.setTimeout(() => {
            landingAnimation.style.display = 'none';
        }, 600);
    }

    renderPaperFoldResult(result = {}) {
        const { paperFoldRevealTarget } = this.elements;
        if (!paperFoldRevealTarget) return;

        paperFoldRevealTarget.replaceChildren();
        if (!result?.deityImageSrc) return;

        const deityImage = document.createElement('img');
        deityImage.className = 'paper-fold-result-deity';
        deityImage.src = result.deityImageSrc;
        deityImage.alt = result.deityImageAlt || '';
        deityImage.decoding = 'async';
        deityImage.loading = 'eager';
        paperFoldRevealTarget.appendChild(deityImage);
    }

    triggerPaperFoldReveal(result = {}) {
        const { paperFoldOverlay, paperFoldRevealTarget, qrScanner } = this.elements;
        if (!paperFoldOverlay || !paperFoldRevealTarget) return Promise.resolve(false);

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.renderPaperFoldResult(result);
        paperFoldOverlay.hidden = false;
        paperFoldOverlay.classList.remove('is-folding');
        paperFoldRevealTarget.classList.remove('is-visible');
        paperFoldRevealTarget.setAttribute('aria-hidden', 'true');
        if (qrScanner) {
            qrScanner.classList.remove('is-paper-reveal-visible');
        }

        if (reduceMotion) {
            paperFoldOverlay.hidden = true;
            paperFoldRevealTarget.classList.add('is-visible');
            paperFoldRevealTarget.setAttribute('aria-hidden', 'false');
            if (qrScanner) {
                qrScanner.classList.add('is-paper-reveal-visible');
            }
            return Promise.resolve(true);
        }

        return new Promise(resolve => {
            window.requestAnimationFrame(() => {
                paperFoldOverlay.classList.add('is-folding');
            });

            const revealTimer = window.setTimeout(() => {
                paperFoldRevealTarget.classList.add('is-visible');
                paperFoldRevealTarget.setAttribute('aria-hidden', 'false');
                if (qrScanner) {
                    qrScanner.classList.add('is-paper-reveal-visible');
                }
            }, 4300);

            const cleanupTimer = window.setTimeout(() => {
                window.clearTimeout(revealTimer);
                paperFoldOverlay.classList.remove('is-folding');
                paperFoldOverlay.hidden = true;
                resolve(true);
            }, 8400);

            paperFoldOverlay.addEventListener('animationcancel', () => {
                window.clearTimeout(revealTimer);
                window.clearTimeout(cleanupTimer);
                paperFoldOverlay.classList.remove('is-folding');
                paperFoldOverlay.hidden = true;
                resolve(false);
            }, { once: true });
        });
    }

    hidePaperFoldResult() {
        const { paperFoldRevealTarget, qrScanner } = this.elements;

        if (paperFoldRevealTarget) {
            paperFoldRevealTarget.classList.remove('is-visible');
            paperFoldRevealTarget.setAttribute('aria-hidden', 'true');
            paperFoldRevealTarget.replaceChildren();
        }

        if (qrScanner) {
            qrScanner.classList.remove('is-paper-reveal-visible');
        }
    }

    showCameraError(message, onRetry) {
        this.removeCameraError();
        document.body.classList.add('overlay-open');

        const errorPanel = document.createElement('div');
        errorPanel.className = 'camera-error-panel';
        errorPanel.id = 'cameraErrorPanel';

        const title = document.createElement('h2');
        title.textContent = 'Camera unavailable';

        const body = document.createElement('p');
        body.textContent = message;

        const retryButton = document.createElement('button');
        retryButton.type = 'button';
        retryButton.textContent = 'Retry camera';
        retryButton.addEventListener('click', () => {
            this.removeCameraError();
            onRetry();
        });

        errorPanel.appendChild(title);
        errorPanel.appendChild(body);
        errorPanel.appendChild(retryButton);
        this.getOverlayHost().appendChild(errorPanel);
    }

    removeCameraError() {
        const existing = document.getElementById('cameraErrorPanel');
        if (existing) {
            existing.remove();
        }
        document.body.classList.remove('overlay-open');
    }

    showReveal(revealContent, onClose) {
        const revealContainer = document.createElement('div');
        revealContainer.className = 'deity-reveal';
        revealContainer.setAttribute('role', 'dialog');
        revealContainer.setAttribute('aria-modal', 'true');
        revealContainer.setAttribute('aria-label', revealContent.title || 'Reveal');
        document.body.classList.add('overlay-open');

        const panel = document.createElement('div');
        panel.className = 'deity-reveal-panel';

        const title = document.createElement('h2');
        title.textContent = revealContent.title;

        const description = document.createElement('p');
        description.textContent = revealContent.body;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'deity-reveal-close';
        closeBtn.textContent = '×';

        let isClosed = false;
        const closeReveal = () => {
            if (isClosed) return;
            isClosed = true;
            document.removeEventListener('keydown', handleRevealKeydown);
            revealContainer.remove();
            document.body.classList.remove('overlay-open');
            onClose();
        };

        const handleRevealKeydown = event => {
            if (event.key === 'Escape') {
                closeReveal();
            }
        };

        closeBtn.addEventListener('click', closeReveal);
        revealContainer.addEventListener('click', event => {
            if (event.target === revealContainer) {
                closeReveal();
            }
        });

        panel.appendChild(title);
        panel.appendChild(description);
        panel.appendChild(closeBtn);
        revealContainer.appendChild(panel);
        this.getOverlayHost().appendChild(revealContainer);
        document.addEventListener('keydown', handleRevealKeydown);
        closeBtn.focus({ preventScroll: true });
    }

    renderCollection(items, deitiesById, totalSlots = 15) {
        const { collectionGrid, collectionEmpty } = this.elements;
        if (!collectionGrid) return;

        collectionGrid.innerHTML = '';

        if (items.length === 0 && collectionEmpty) {
            collectionGrid.appendChild(collectionEmpty);
            collectionEmpty.style.display = 'block';
        }

        items.forEach((item, index) => {
            const deity = deitiesById.get(item.deityId);
            const collectionItem = document.createElement('div');
            collectionItem.className = 'collection-item';

            const label = document.createElement('div');
            label.className = 'collection-label';
            label.textContent = deity ? deity.displayName : item.deityId;

            collectionItem.appendChild(label);
            collectionGrid.appendChild(collectionItem);

            window.setTimeout(() => {
                collectionItem.classList.add('show');
            }, index * 100);
        });

        for (let i = items.length; i < totalSlots; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'collection-empty-slot';
            collectionGrid.appendChild(emptySlot);
        }
    }

    animateCollectionIcon() {
        const collectionButton = document.querySelector('[data-view-target="collection"]');
        if (!collectionButton) return;

        collectionButton.classList.add('collection-icon-glow');
        window.setTimeout(() => {
            collectionButton.classList.remove('collection-icon-glow');
        }, 2500);
    }

    getOverlayHost() {
        return document.getElementById('appOverlayLayer') || document.body;
    }
}
