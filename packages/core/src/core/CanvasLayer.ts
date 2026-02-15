import { JianZiOptions } from '../types';
import { DeltaSet } from '../model/DeltaSet';

export class CanvasLayer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private options: JianZiOptions;
    public width: number;
    public height: number;

    constructor(options: JianZiOptions) {
        this.options = options;
        this.width = options.width;
        this.height = options.height;

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.zIndex = '1';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';

        // Support dpr
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.scale(dpr, dpr);
    }

    public mount(container: HTMLElement) {
        container.appendChild(this.canvas);
    }

    public render(deltas: DeltaSet) {
        // Clear
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Background (Paper)
        this.ctx.fillStyle = '#fdfaf5';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Deltas
        deltas.forEach(delta => {
            // Only draw delta text content
            // @ts-ignore
            delta.draw(this.ctx);
        });
    }

    public getCanvas() {
        return this.canvas;
    }

    public resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(dpr, dpr);
    }
}
