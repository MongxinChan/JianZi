import { JianZiOptions } from '../types';
import { DeltaSet } from '../model/DeltaSet';
import { TextDelta, type LayoutMode } from '../model/Delta';

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

    public render(deltas: DeltaSet, mode: LayoutMode = 'horizontal') {
        // Clear
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Background (Paper)
        this.ctx.fillStyle = this.options.backgroundColor || '#fdfaf5';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Deltas
        deltas.forEach(delta => {
            if (delta instanceof TextDelta) {
                delta.draw(this.ctx, mode, this.width, this.height);
            } else {
                delta.draw(this.ctx);
            }
        });

        // Draw Export Decorations
        this._drawDecorations(mode);
    }

    public exportHighRes(deltas: DeltaSet, mode: LayoutMode = 'horizontal', scale: number = 3): string {
        const offscreen = document.createElement('canvas');
        offscreen.width = this.width * scale;
        offscreen.height = this.height * scale;
        const oCtx = offscreen.getContext('2d')!;
        oCtx.scale(scale, scale);

        oCtx.clearRect(0, 0, this.width, this.height);
        oCtx.fillStyle = this.options.backgroundColor || '#fdfaf5';
        oCtx.fillRect(0, 0, this.width, this.height);

        deltas.forEach(delta => {
            if (delta instanceof TextDelta) {
                delta.draw(oCtx, mode, this.width, this.height);
            } else {
                delta.draw(oCtx);
            }
        });

        // Temporarily swap ctx to draw decorations via existing method
        const originalCtx = this.ctx;
        this.ctx = oCtx;
        this._drawDecorations(mode);
        this.ctx = originalCtx;

        return offscreen.toDataURL('image/png', 1.0);
    }

    private _drawDecorations(mode: LayoutMode) {
        this.ctx.save();
        const padding = this.options.padding || 60;

        let parts: string[] = [];

        // Watermark formatting
        if (this.options.watermark) {
            parts.push('JianZi');
        }

        // Date Display
        if (this.options.dateDisplay && this.options.dateDisplay !== 'none') {
            const now = new Date();
            const includeDay = this.options.dateIncludeDay;
            if (this.options.dateDisplay === 'gregorian') {
                const y = now.getFullYear();
                const m = ('0' + (now.getMonth() + 1)).slice(-2);
                if (includeDay) {
                    const d = ('0' + now.getDate()).slice(-2);
                    parts.push(`${y}.${m}.${d}`);
                } else {
                    parts.push(`${y}.${m}`);
                }
            } else {
                try {
                    // Try Lunar
                    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
                    if (includeDay) opts.day = 'numeric';
                    let lunar = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', opts).format(now);

                    // Remove leading Gregorian year like "2026丙午年" -> "丙午年"
                    lunar = lunar.replace(/^\d+/, '');

                    // Map trailing day digits to Chinese characters if includeDay is true
                    if (includeDay) {
                        const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
                        lunar = lunar.replace(/(\d+)$/, (match) => {
                            const index = parseInt(match, 10) - 1;
                            return lunarDays[index] || match;
                        });
                    }
                    parts.push(lunar);
                } catch (e) {
                    const y = now.getFullYear();
                    const m = ('0' + (now.getMonth() + 1)).slice(-2);
                    if (includeDay) {
                        const d = ('0' + now.getDate()).slice(-2);
                        parts.push(`${y}.${m}.${d}`);
                    } else {
                        parts.push(`${y}.${m}`);
                    }
                }
            }
        }

        if (parts.length > 0) {
            // Restore the elegant italic font look
            this.ctx.font = 'italic 16px "Georgia", "KaiTi", "STKaiti", serif';
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // delicate transparency
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'bottom';
            // Increase letter spacing visually by placing spaces inside the string, but join first to make it continuous
            // Just use a single pipe separator ' | '
            this.ctx.fillText(parts.join(' | '), this.width - padding + 20, this.height - padding + 20);
        }

        this.ctx.restore();
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
