import { playAnimation, destroyAnimation } from './lottie.js';

let toastContainer = null;
const animationInstances = new Map();

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.setAttribute('data-toast-container', '');
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

function getAnimationPath(type) {
    const basePath = '/assets/animations/';
    switch (type) {
        case 'success':
            return `${basePath}success.json`;
        case 'error':
            return `${basePath}error.json`;
        default:
            return null;
    }
}

async function showToast(message, variant = 'error') {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    
    const iconContainer = document.createElement('span');
    iconContainer.style.cssText = 'display:inline-block;width:24px;height:24px;margin-right:10px;vertical-align:middle;';
    toast.appendChild(iconContainer);
    
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);
    
    container.appendChild(toast);
    
    const animationPath = getAnimationPath(variant);
    if (animationPath) {
        try {
            const anim = await playAnimation(iconContainer, animationPath, {
                loop: false,
                autoplay: true,
                renderer: 'svg',
                animationSpeed: 1
            });
            animationInstances.set(toast, anim);
        } catch (error) {
            iconContainer.textContent = variant === 'success' ? '✓' : '✕';
            iconContainer.style.cssText = `display:inline-block;margin-right:10px;font-weight:bold;color:${variant === 'success' ? '#10b981' : '#ef4444'};`;
        }
    }
    
    requestAnimationFrame(() => toast.setAttribute('data-visible', 'true'));
    
    setTimeout(() => {
        toast.setAttribute('data-visible', 'false');
        const anim = animationInstances.get(toast);
        if (anim) {
            destroyAnimation(anim);
            animationInstances.delete(toast);
        }
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

export { showToast };