/**
 * Tracks Three.js GPU resources and scene objects for deterministic teardown.
 */
export class ResourceTracker {
    #resources = new Set();
    #THREE;

    /** @param {typeof import('three')} THREE Active Three.js module. */
    constructor(THREE) {
        this.#THREE = THREE;
    }

    /**
     * Registers a disposable resource or Object3D.
     *
     * @template T
     * @param {T} resource Three.js resource.
     * @returns {T} The same resource for fluent construction.
     */
    track(resource) {
        if (resource && (typeof resource.dispose === 'function' || resource instanceof this.#THREE.Object3D)) {
            this.#resources.add(resource);
        }
        return resource;
    }

    /**
     * Removes and disposes all tracked resources exactly once.
     */
    dispose() {
        this.#resources.forEach((resource) => {
            if (resource instanceof this.#THREE.Object3D && resource.parent) {
                resource.parent.remove(resource);
            }
            if (typeof resource.dispose === 'function') {
                resource.dispose();
            }
        });
        this.#resources.clear();
    }
}
