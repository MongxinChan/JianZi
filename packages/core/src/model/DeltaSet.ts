import { Delta } from './Delta';

export class DeltaSet {
    private deltas: Map<string, Delta>;

    constructor() {
        this.deltas = new Map();
    }

    public add(delta: Delta) {
        this.deltas.set(delta.id, delta);
    }

    public remove(id: string) {
        this.deltas.delete(id);
    }

    public get(id: string) {
        return this.deltas.get(id);
    }

    public getAll() {
        return Array.from(this.deltas.values());
    }

    public clear() {
        this.deltas.clear();
    }

    public forEach(callback: (delta: Delta) => void) {
        this.deltas.forEach(callback);
    }

    /**
     * Find the top-most delta at the given coordinates.
     * Iterates in reverse order (top to bottom).
     */
    public hitTest(x: number, y: number): Delta | null {
        // Map iteration order is insertion order.
        // We want to check from latest (top) to earliest (bottom).
        const deltas = Array.from(this.deltas.values()).reverse();

        for (const delta of deltas) {
            if (
                x >= delta.x &&
                x <= delta.x + delta.width &&
                y >= delta.y &&
                y <= delta.y + delta.height
            ) {
                return delta;
            }
        }
        return null;
    }
}
