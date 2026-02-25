import { Delta, DeltaLike, DeltaType } from './BaseDelta';

export type ImageDrawMode = 'fill' | 'cover' | 'contain';

export class ImageDelta extends Delta {
    public src: string;
    public aspectRatio: number = 1;
    public drawMode: ImageDrawMode = 'cover';
    public borderColor: string = 'transparent';
    public borderWidth: number = 0;
    private _img: HTMLImageElement | null = null;
    private _loaded: boolean = false;
    private _onLoadCallback: (() => void) | null = null;

    constructor(
        attr: Omit<DeltaLike, 'type'> & {
            src: string;
            drawMode?: ImageDrawMode;
            borderColor?: string;
            borderWidth?: number;
        },
        onLoad?: () => void,
    ) {
        super({ ...attr, type: DeltaType.Image });
        this.src = attr.src;
        this.drawMode = attr.drawMode ?? 'cover';
        this.borderColor = attr.borderColor ?? 'transparent';
        this.borderWidth = attr.borderWidth ?? 0;
        this._onLoadCallback = onLoad || null;
        this._loadImage();
    }

    private _loadImage() {
        const img = new Image();
        img.onload = () => {
            this._img = img;
            this._loaded = true;
            this.aspectRatio = img.naturalWidth / img.naturalHeight;

            // If no explicit size was given, use natural size (clamped)
            if (this.width <= 0 || this.height <= 0) {
                const maxDim = 300;
                if (img.naturalWidth > img.naturalHeight) {
                    this.width = Math.min(img.naturalWidth, maxDim);
                    this.height = this.width / this.aspectRatio;
                } else {
                    this.height = Math.min(img.naturalHeight, maxDim);
                    this.width = this.height * this.aspectRatio;
                }
            }

            // Notify editor to re-render
            if (this._onLoadCallback) {
                this._onLoadCallback();
            }
        };
        img.onerror = () => {
            console.error('ImageDelta: Failed to load image', this.src.substring(0, 100));
        };
        img.src = this.src;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const { x, y, width: w, height: h } = this;

        if (!this._loaded || !this._img) {
            // Draw placeholder
            ctx.save();
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(x, y, w || 100, h || 100);
            ctx.fillStyle = '#999';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading...', x + (w || 100) / 2, y + (h || 100) / 2);
            ctx.restore();
            return;
        }

        const img = this._img;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        ctx.save();

        if (this.drawMode === 'fill') {
            // Stretch to fill, ignore aspect ratio
            ctx.drawImage(img, x, y, w, h);
        } else if (this.drawMode === 'cover') {
            // Crop: scale so image covers entire box
            const scale = Math.max(w / iw, h / ih);
            const sw = w / scale; // Source width to crop
            const sh = h / scale; // Source height to crop
            const sx = (iw - sw) / 2; // Center horizontally on source
            const sy = (ih - sh) / 2; // Center vertically on source

            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            // dx, dy should just be x, y. dw, dh should be w, h.
            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        } else {
            // contain: letterbox, preserve aspect ratio
            const scale = Math.min(w / iw, h / ih);
            const dw = iw * scale; // Destination width
            const dh = ih * scale; // Destination height
            const dx = x + (w - dw) / 2; // Center horizontally
            const dy = y + (h - dh) / 2; // Center vertically

            // For contain, we don't need to crop the source, just draw it at the calculated dest rect
            ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
        }

        ctx.restore();

        // Draw border on top (always, regardless of draw mode)
        if (this.borderWidth > 0 && this.borderColor && this.borderColor !== 'transparent') {
            ctx.save();
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = this.borderWidth;
            // Inset the stroke so it doesn't bleed outside the box
            const half = this.borderWidth / 2;
            ctx.strokeRect(x + half, y + half, w - this.borderWidth, h - this.borderWidth);
            ctx.restore();
        }
    }

    /** Resize while preserving aspect ratio */
    public resizeKeepAspect(newWidth: number) {
        this.width = newWidth;
        this.height = newWidth / this.aspectRatio;
    }
}
