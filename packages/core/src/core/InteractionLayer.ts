import { JianZiOptions } from '../types';

export class InteractionLayer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public width: number;
    public height: number;

    constructor(options: JianZiOptions) {
        this.width = options.width;
        this.height = options.height;

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.zIndex = '10'; // Top layer
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.pointerEvents = 'none'; // Pass events to DOM logic if needed, but usually we handle events on a wrapper

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

    public clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    public drawSelection(rect: { x: number; y: number; width: number; height: number }) {
        this.ctx.save();
        this.ctx.strokeStyle = '#1890ff';
        this.ctx.lineWidth = 1;
        // Draw frame
        this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        // Draw handles (simple version)
        const handles = [
            { x: rect.x - 3, y: rect.y - 3 }, // TL
            { x: rect.x + rect.width - 3, y: rect.y - 3 }, // TR
            { x: rect.x + rect.width - 3, y: rect.y + rect.height - 3 }, // BR
            { x: rect.x - 3, y: rect.y + rect.height - 3 }, // BL
        ];

        this.ctx.fillStyle = '#fff';
        handles.forEach(h => {
            this.ctx.fillRect(h.x, h.y, 6, 6);
            this.ctx.strokeRect(h.x, h.y, 6, 6);
        });

        this.ctx.restore();
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
