import { JianZiOptions } from '../types';

const HANDLE_SIZE = 8;
const HALF_HANDLE = HANDLE_SIZE / 2;

export type HandleType = 'tl' | 'tr' | 'bl' | 'br' | null;

export class InteractionLayer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    public width: number;
    public height: number;
    private _lastRect: { x: number; y: number; width: number; height: number } | null = null;

    constructor(options: JianZiOptions) {
        this.width = options.width;
        this.height = options.height;

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.zIndex = '10';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.pointerEvents = 'none';

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
        this._lastRect = null;
    }

    private _getHandlePositions(rect: { x: number; y: number; width: number; height: number }) {
        return {
            tl: { x: rect.x - HALF_HANDLE, y: rect.y - HALF_HANDLE },
            tr: { x: rect.x + rect.width - HALF_HANDLE, y: rect.y - HALF_HANDLE },
            br: { x: rect.x + rect.width - HALF_HANDLE, y: rect.y + rect.height - HALF_HANDLE },
            bl: { x: rect.x - HALF_HANDLE, y: rect.y + rect.height - HALF_HANDLE },
        };
    }

    public drawSelection(rect: { x: number; y: number; width: number; height: number }) {
        this._lastRect = rect;
        this.ctx.save();
        this.ctx.strokeStyle = '#1890ff';
        this.ctx.lineWidth = 1;

        // Draw selection frame
        this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        // Draw corner handles
        const handles = this._getHandlePositions(rect);
        this.ctx.fillStyle = '#fff';
        for (const key of Object.keys(handles) as HandleType[]) {
            if (!key) continue;
            const h = handles[key];
            this.ctx.fillRect(h.x, h.y, HANDLE_SIZE, HANDLE_SIZE);
            this.ctx.strokeRect(h.x, h.y, HANDLE_SIZE, HANDLE_SIZE);
        }

        this.ctx.restore();
    }

    /**
     * Hit test: is the given point over a resize handle?
     * Returns the handle type ('tl', 'tr', 'bl', 'br') or null.
     */
    public hitTestHandle(px: number, py: number): HandleType {
        if (!this._lastRect) return null;
        const handles = this._getHandlePositions(this._lastRect);
        const tolerance = HANDLE_SIZE + 2; // slightly larger hit area

        for (const key of ['tl', 'tr', 'bl', 'br'] as const) {
            const h = handles[key];
            if (
                px >= h.x - 2 && px <= h.x + tolerance &&
                py >= h.y - 2 && py <= h.y + tolerance
            ) {
                return key;
            }
        }
        return null;
    }

    /**
     * Get the CSS cursor for a given handle type.
     */
    public static getCursor(handle: HandleType): string {
        switch (handle) {
            case 'tl': return 'nwse-resize';
            case 'tr': return 'nesw-resize';
            case 'bl': return 'nesw-resize';
            case 'br': return 'nwse-resize';
            default: return 'default';
        }
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
    public drawTextSelection(rects: { x: number; y: number; width: number; height: number }[]) {
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(24, 144, 255, 0.3)'; // Blue selection color
        for (const rect of rects) {
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
        this.ctx.restore();
    }
}
