export class AppView {
    constructor(elements) {
        this.elements = elements;
    }

    showView(viewName) {
        for (const view of this.elements.views || []) {
            const isActive = view.dataset.view === viewName;
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
