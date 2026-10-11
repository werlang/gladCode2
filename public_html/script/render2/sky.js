/** Radius of the sky dome; inside the camera's far plane and beyond everything else in the scene. */
export const SKY_RADIUS = 900;
/** Horizon haze: the fog fades the far landscape into this colour, which is also the sky's colour at the horizon. */
export const HAZE = 0xcfdbe4;

/**
 * Daylight sky dome: deep blue at the zenith fading to a pale haze at the horizon, a warm glow around the sun
 * and a bright sun disc in the direction the sunlight comes from. Drawn behind everything (last, at the far plane,
 * so only uncovered pixels are shaded), without fog.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {import('three').Vector3} sun Direction toward the sun (the sun light's position, normalised here).
 * @returns {import('three').Mesh} The dome, centred on the scene origin.
 */
export function createSky(THREE, sun) {
    const material = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            sunDirection: { value: sun.clone().normalize() },
            zenith: { value: new THREE.Color(0x3d72b8) },
            middle: { value: new THREE.Color(0x7fa8d4) },
            horizon: { value: new THREE.Color(HAZE) },
            sunColor: { value: new THREE.Color(0xfff4d6) },
            glowColor: { value: new THREE.Color(0xffd9a0) },
        },
        vertexShader: /* glsl */ `
varying vec3 vDirection;
void main() {
    vDirection = normalize(position);
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Pinned to the far plane so the dome never hides anything.
    gl_Position = clip.xyww;
}`,
        fragmentShader: /* glsl */ `
uniform vec3 sunDirection;
uniform vec3 zenith;
uniform vec3 middle;
uniform vec3 horizon;
uniform vec3 sunColor;
uniform vec3 glowColor;
varying vec3 vDirection;
void main() {
    vec3 direction = normalize(vDirection);
    float height = max(direction.y, 0.0);
    // Two-step gradient: the haze hugs the horizon, the blue deepens quickly above it.
    vec3 color = mix(horizon, middle, smoothstep(0.0, 0.18, height));
    color = mix(color, zenith, smoothstep(0.15, 0.85, height));
    float facing = max(dot(direction, sunDirection), 0.0);
    // A broad warm glow, a tighter halo and the disc itself.
    color += glowColor * (pow(facing, 8.0) * 0.35 + pow(facing, 64.0) * 0.45);
    color = mix(color, sunColor * 1.6, smoothstep(0.9990, 0.9996, facing));
    // Below the horizon the haze carries on, so no seam shows past the far hills.
    color = mix(color, horizon, smoothstep(0.0, -0.05, direction.y));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
}`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 16), material);
    dome.name = 'sky';
    dome.frustumCulled = false;
    // Drawn after every other opaque object: at the far plane the depth test leaves it only the pixels still showing
    // sky, instead of shading the whole screen under the arena first.
    dome.renderOrder = 1000;
    return dome;
}
