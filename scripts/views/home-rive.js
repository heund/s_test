const RIVE_ASSET_URL = './styles/assets/rive/cat_follow_cursor_demo.riv';

let homeRiveInstance = null;
let isHomeRiveInitialized = false;

function mapPositionToRange(position, dimension) {
    const safeDimension = Math.max(1, dimension);
    const clampedPosition = Math.max(0, Math.min(position, safeDimension));

    return (clampedPosition / safeDimension) * 100;
}

function setNumberValue(property, value) {
    if (property) {
        property.value = value;
    }
}

export function initHomeRive() {
    if (isHomeRiveInitialized) {
        return;
    }

    isHomeRiveInitialized = true;

    const canvas = document.getElementById('homeRiveCanvas');
    const riveRuntime = window.rive;

    if (!canvas || !riveRuntime?.Rive) {
        console.warn('[Home Rive] Runtime or canvas missing; skipping home animation.');
        return;
    }

    const layout = new riveRuntime.Layout({
        fit: riveRuntime.Fit.Contain
    });

    homeRiveInstance = new riveRuntime.Rive({
        src: RIVE_ASSET_URL,
        canvas,
        artboard: 'Artboard 2',
        stateMachines: 'State Machine 1',
        layout,
        autoplay: true,
        autoBind: true,
        onLoad: () => {
            homeRiveInstance.resizeDrawingSurfaceToCanvas();

            const viewModelInstance = homeRiveInstance.viewModelInstance;
            if (!viewModelInstance) {
                return;
            }

            const xProperty = viewModelInstance.number('xPos');
            const yProperty = viewModelInstance.number('yPos');

            setNumberValue(xProperty, 50);
            setNumberValue(yProperty, 50);

            const updatePosition = (clientX, clientY) => {
                const rect = canvas.getBoundingClientRect();
                const canvasX = clientX - rect.left;
                const canvasY = clientY - rect.top;

                setNumberValue(xProperty, mapPositionToRange(canvasX, rect.width));
                setNumberValue(yProperty, mapPositionToRange(canvasY, rect.height));
            };

            window.addEventListener('mousemove', event => {
                updatePosition(event.clientX, event.clientY);
            });

            window.addEventListener('touchmove', event => {
                if (event.touches.length > 0) {
                    const touch = event.touches[0];
                    updatePosition(touch.clientX, touch.clientY);
                }
            }, { passive: true });

            window.addEventListener('touchend', () => {
                setNumberValue(xProperty, 50);
                setNumberValue(yProperty, 50);
            });

            document.addEventListener('mouseleave', () => {
                setNumberValue(xProperty, 50);
                setNumberValue(yProperty, 50);
            });
        }
    });

    window.addEventListener('resize', () => {
        homeRiveInstance?.resizeDrawingSurfaceToCanvas();
    });
}
