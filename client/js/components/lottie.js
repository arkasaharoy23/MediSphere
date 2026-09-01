let lottieLoaded = false;
let lottieModule = null;

function loadLottie() {
    return new Promise((resolve, reject) => {
        if (lottieLoaded && lottieModule) {
            resolve(lottieModule);
            return;
        }

        if (window.lottie) {
            lottieLoaded = true;
            lottieModule = window.lottie;
            resolve(lottieModule);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
        script.async = true;
        script.onload = () => {
            lottieLoaded = true;
            lottieModule = window.lottie;
            resolve(lottieModule);
        };
        script.onerror = () => {
            reject(new Error('Failed to load Lottie library'));
        };
        document.head.appendChild(script);
    });
}

export async function playAnimation(container, animationPath, options = {}) {
    try {
        const lottie = await loadLottie();
        
        const containerEl = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
            
        if (!containerEl) {
            throw new Error('Container element not found');
        }

        containerEl.innerHTML = '';

        const animation = lottie.loadAnimation({
            container: containerEl,
            renderer: options.renderer || 'svg',
            loop: options.loop !== undefined ? options.loop : true,
            autoplay: options.autoplay !== undefined ? options.autoplay : true,
            path: animationPath
        });

        if (options.animationSpeed) {
            animation.setSpeed(options.animationSpeed);
        }

        return animation;
    } catch (error) {
        console.error('Error playing Lottie animation:', error);
        throw error;
    }
}

export function destroyAnimation(animation) {
    if (animation && typeof animation.destroy === 'function') {
        animation.destroy();
    }
}

export default {
    playAnimation,
    destroyAnimation,
    loadLottie
};