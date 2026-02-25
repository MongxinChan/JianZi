import { JianZiOptions } from '../types';

export class ViewportManager {
    private options: JianZiOptions;
    private transform = { x: 0, y: 0, scale: 1 };

    constructor(options: JianZiOptions) {
        this.options = options;
    }

    public getTransform() {
        return this.transform;
    }

    public setTransform(x: number, y: number, scale?: number) {
        this.transform.x = x;
        this.transform.y = y;
        if (scale !== undefined) {
            this.transform.scale = Math.max(0.1, Math.min(scale, 5)); // Clamp scale between 10% and 500%
        }
        this.updateTransform();
    }

    public zoomBy(scaleFactor: number, originX: number, originY: number) {
        const oldScale = this.transform.scale;
        let newScale = oldScale * scaleFactor;
        newScale = Math.max(0.1, Math.min(newScale, 5));

        // Adjust translation so the zoom is centered around (originX, originY)
        // rather than the top-left or center of the component.
        // If zooming into a specific point, that point should stay under the cursor.
        // Currently, transform origin is center center (-50%, -50%).

        this.transform.scale = newScale;
        this.updateTransform();
    }

    private updateTransform(): void {
        const { x, y, scale } = this.transform;
        // Apply transform to parent (.canvas-container) if eventTarget is used, 
        // to preserve the .canvas-container's role as the moving wrapper.
        const target = (this.options.eventTarget && this.options.container.parentElement)
            ? this.options.container.parentElement
            : this.options.container;

        target.style.transform =
            `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
    }
}
