import { playAnimation, destroyAnimation } from '../components/lottie.js';

const loaderInstances = new Map();

export async function initLoader(containerId, animationPath = '/assets/animations/loader.json') {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    try {
        const anim = await playAnimation(container, animationPath, {
            loop: true,
            autoplay: true,
            renderer: 'svg',
            animationSpeed: 1
        });
        loaderInstances.set(containerId, anim);
        return anim;
    } catch (error) {
        console.error('Failed to load loader animation:', error);
        container.innerHTML = '<div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#667eea;border-radius:50%;animation:spin 0.8s linear infinite;"></div>';
        return null;
    }
}

export function destroyLoader(containerId) {
    const anim = loaderInstances.get(containerId);
    if (anim) {
        destroyAnimation(anim);
        loaderInstances.delete(containerId);
    }
}

export default { initLoader, destroyLoader };