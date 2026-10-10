/**
 * One instanced batch of camera-facing quads. Each instance has a position, size, spin and RGBA colour; the
 * texture's luminance times alpha is the mask, so both the black-backed and transparent particle maps work.
 */
export class ParticleLayer {
    /**
     * @param {typeof import('three')} THREE Three namespace.
     * @param {import('three').Texture} texture Particle map.
     * @param {number} capacity Most particles drawn per frame.
     * @param {boolean} additive Additive (glows) or normal (shapes, smoke) blending.
     * @param {{ seeThrough?: number }} [options] `seeThrough`: half-width of the combat square; particles that
     *     stand between the camera and it (like the coliseum stone, see `synty-arena.js`) fade out.
     */
    constructor(THREE, texture, capacity, additive, { seeThrough = 0 } = {}) {
        const geometry = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        geometry.index = quad.index;
        geometry.setAttribute('position', quad.attributes.position);
        geometry.setAttribute('uv', quad.attributes.uv);
        this.offset = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
        this.shape = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
        this.color = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
        for (const attribute of [this.offset, this.shape, this.color]) attribute.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('iOffset', this.offset);
        geometry.setAttribute('iShape', this.shape);
        geometry.setAttribute('iColor', this.color);
        geometry.instanceCount = 0;
        this.material = new THREE.ShaderMaterial({
            uniforms: { map: { value: texture } },
            defines: seeThrough > 0 ? { SEE_THROUGH: seeThrough.toFixed(2) } : {},
            vertexShader: `
                attribute vec3 iOffset; attribute vec2 iShape; attribute vec4 iColor;
                varying vec2 vUv; varying vec4 vColor; varying vec3 vCenter;
                void main() {
                    vCenter = (modelMatrix * vec4(iOffset, 1.0)).xyz;
                    vec4 view = modelViewMatrix * vec4(iOffset, 1.0);
                    float c = cos(iShape.y); float s = sin(iShape.y);
                    view.xy += mat2(c, s, -s, c) * position.xy * iShape.x;
                    vUv = uv; vColor = iColor;
                    gl_Position = projectionMatrix * view;
                }`,
            fragmentShader: `
                uniform sampler2D map; varying vec2 vUv; varying vec4 vColor; varying vec3 vCenter;
                void main() {
                    vec4 t = texture2D(map, vUv);
                    float mask = t.a * max(t.r, max(t.g, t.b));
                    #ifdef SEE_THROUGH
                    {
                        vec3 ray = vCenter - cameraPosition;
                        float fade = 1.0 - smoothstep(4.0, 9.0, length(ray));
                        if (ray.y < -1e-4) {
                            vec2 ground = cameraPosition.xz + ray.xz * (-cameraPosition.y / ray.y);
                            fade = max(fade, 1.0 - smoothstep(SEE_THROUGH - 2.0, SEE_THROUGH + 1.0, max(abs(ground.x), abs(ground.y))));
                        }
                        mask *= 1.0 - 0.85 * fade;
                    }
                    #endif
                    gl_FragColor = vec4(vColor.rgb, vColor.a * mask);
                    #include <colorspace_fragment>
                }`,
            transparent: true,
            depthWrite: false,
            blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.frustumCulled = false;
        this.geometry = geometry;
        this.capacity = capacity;
        this.count = 0;
    }

    begin() {
        this.count = 0;
    }

    /** Adds a particle this frame; extra ones past the capacity are dropped. */
    push(x, y, z, size, spin, r, g, b, a) {
        const i = this.count;
        if (i >= this.capacity) return;
        this.count += 1;
        this.offset.setXYZ(i, x, y, z);
        this.shape.setXY(i, size, spin);
        this.color.setXYZW(i, r, g, b, a);
    }

    end() {
        this.geometry.instanceCount = this.count;
        this.offset.needsUpdate = true;
        this.shape.needsUpdate = true;
        this.color.needsUpdate = true;
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}
