import * as THREE from 'three';

const vertexShader = `
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

uniform float uTime;
uniform float uIntensity;
uniform vec2 uResolution;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float t = uTime * 0.05;

    float band = fbm(vec2(uv.x * 2.0 + t, uv.y * 0.6 - t * 0.4));
    float curtain = smoothstep(0.3, 0.85, band) * smoothstep(0.15, 0.8, uv.y);

    vec3 green = vec3(0.15, 0.9, 0.55);
    vec3 purple = vec3(0.55, 0.25, 0.9);
    vec3 color = mix(green, purple, fbm(vec2(uv.x * 1.5 - t, uv.y + t)));

    float alpha = curtain * uIntensity;
    gl_FragColor = vec4(color, alpha);
}
`;

export function createAuroraScene(canvas: HTMLCanvasElement, getIntensity: () => number = () => 0.4): () => void {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
        uTime: { value: 0 },
        uIntensity: { value: getIntensity() },
        uResolution: { value: new THREE.Vector2(1, 1) },
    };
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false });
    scene.add(new THREE.Mesh(geometry, material));

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rafId = 0;
    let pageVisible = document.visibilityState === 'visible';

    function renderFrame(time: number) {
        uniforms.uTime.value = time / 1000;
        uniforms.uIntensity.value = getIntensity();
        renderer.render(scene, camera);
    }

    function loop(time: number) {
        renderFrame(time);
        if (pageVisible && !reducedMotion.matches) {
            rafId = requestAnimationFrame(loop);
        }
    }

    function start() {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(loop);
    }

    function resize() {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
        if (reducedMotion.matches) {
            renderFrame(performance.now());
        }
    }

    function handleVisibility() {
        pageVisible = document.visibilityState === 'visible';
        if (pageVisible) start();
    }

    function handleMotionChange() {
        if (reducedMotion.matches) {
            cancelAnimationFrame(rafId);
            renderFrame(performance.now());
        } else {
            start();
        }
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    reducedMotion.addEventListener('change', handleMotionChange);
    resize();
    if (reducedMotion.matches) {
        renderFrame(performance.now());
    } else {
        start();
    }

    return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', handleVisibility);
        reducedMotion.removeEventListener('change', handleMotionChange);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
    };
}
