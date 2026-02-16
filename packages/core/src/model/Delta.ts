export enum DeltaType {
    Text = 'text',
    Image = 'image',
    Rect = 'rect',
}

export interface DeltaLike {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: DeltaType;
}

export abstract class Delta {
    public id: string;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public type: DeltaType;
    public selected: boolean = false;

    constructor(attr: DeltaLike) {
        this.id = attr.id;
        this.x = attr.x;
        this.y = attr.y;
        this.width = attr.width;
        this.height = attr.height;
        this.type = attr.type;
    }

    abstract draw(ctx: CanvasRenderingContext2D): void;

    public getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }

    public move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }
}

import { RichContent, StyledFragment, CharStyle } from './RichText';

export type LayoutMode = 'vertical' | 'horizontal';

export class TextDelta extends Delta {
    public fragments: RichContent;
    public fontFamily: string;
    public fontSize: number;
    public lineHeight: number;
    public letterSpacing: number;

    constructor(attr: DeltaLike & { content?: string; fragments?: RichContent; fontFamily?: string; fontSize?: number }) {
        super({ ...attr, type: DeltaType.Text });
        if (attr.fragments) {
            this.fragments = attr.fragments;
        } else {
            this.fragments = [{
                text: attr.content || '',
                style: {
                    fontFamily: attr.fontFamily,
                    fontSize: attr.fontSize,
                }
            }];
        }
        this.fontFamily = attr.fontFamily || 'serif';
        this.fontSize = attr.fontSize || 28;
        this.lineHeight = 1.5;
        this.letterSpacing = 2;
    }

    get content(): string {
        return this.fragments.map(f => f.text).join('');
    }

    set content(text: string) {
        this.fragments = [{
            text,
            style: {
                fontFamily: this.fontFamily,
                fontSize: this.fontSize,
            }
        }];
    }

    private _getEffectiveStyle(fragmentStyle: CharStyle) {
        return {
            fontFamily: fragmentStyle.fontFamily || this.fontFamily,
            fontSize: fragmentStyle.fontSize || this.fontSize,
            color: fragmentStyle.color || '#2c3e50',
            background: fragmentStyle.background,
            underline: fragmentStyle.underline,
            fontWeight: fragmentStyle.fontWeight || 'normal',
        };
    }

    /**
     * Calculate character positions for both modes with RichText support.
     * Returns positions array and the bounding box dimensions.
     */
    private _layout(
        mode: LayoutMode,
        areaWidth: number,
        areaHeight: number,
    ): {
        positions: {
            char: string;
            cx: number;
            cy: number;
            width: number;
            height: number;
            colWidth?: number; // For Vertical
            rowHeight?: number; // For Horizontal
            style: ReturnType<TextDelta['_getEffectiveStyle']>;
        }[];
        totalWidth: number;
        totalHeight: number
    } {
        const positions: {
            char: string;
            cx: number;
            cy: number;
            width: number;
            height: number;
            colWidth?: number;
            rowHeight?: number;
            style: ReturnType<TextDelta['_getEffectiveStyle']>;
        }[] = [];

        if (mode === 'vertical') {
            let currentX = 0;
            let currentY = 0;
            let colWidth = 0;
            let maxColHeight = 0;
            let colBuffer: typeof positions = [];

            const flushColumn = () => {
                for (const pos of colBuffer) {
                    pos.colWidth = colWidth;
                    positions.push(pos);
                }
                currentX += colWidth;
                maxColHeight = Math.max(maxColHeight, currentY);
                currentY = 0;
                colWidth = 0;
                colBuffer = [];
            };

            for (const fragment of this.fragments) {
                const style = this._getEffectiveStyle(fragment.style);
                const charSize = style.fontSize;
                const lineHeight = 1.5;
                const charH = charSize * lineHeight;
                const charW = charSize + this.letterSpacing;

                const chars = fragment.text.split('');
                for (const char of chars) {
                    if (currentY + charH > (areaHeight - this.y) && currentY > 0) {
                        flushColumn();
                    }

                    colBuffer.push({
                        char,
                        cx: currentX, // Start of column
                        cy: currentY,
                        width: charW,
                        height: charH,
                        style
                    });

                    currentY += charH;
                    colWidth = Math.max(colWidth, charW);
                }
            }
            flushColumn(); // Flush last column

            const totalWidth = currentX;
            const totalHeight = maxColHeight;
            return { positions, totalWidth, totalHeight };

        } else {
            // Horizontal
            let currentX = 0;
            let currentY = 0;
            let rowHeight = 0;
            let maxRowWidth = 0;
            let rowBuffer: typeof positions = [];

            const flushRow = () => {
                for (const pos of rowBuffer) {
                    pos.rowHeight = rowHeight;
                    positions.push(pos);
                }
                currentY += rowHeight;
                maxRowWidth = Math.max(maxRowWidth, currentX);
                currentX = 0;
                rowHeight = 0;
                rowBuffer = [];
            };

            for (const fragment of this.fragments) {
                const style = this._getEffectiveStyle(fragment.style);
                const charSize = style.fontSize;
                const lineHeight = 1.5;
                const charH = charSize * lineHeight;
                const charW = charSize + this.letterSpacing;

                const chars = fragment.text.split('');
                for (const char of chars) {
                    if (currentX + charW > (areaWidth - this.x) && currentX > 0) {
                        flushRow();
                    }

                    rowBuffer.push({
                        char,
                        cx: currentX,
                        cy: currentY, // Top of row
                        width: charW,
                        height: charH,
                        style
                    });

                    currentX += charW;
                    rowHeight = Math.max(rowHeight, charH);
                }
            }
            flushRow();

            const totalWidth = maxRowWidth;
            const totalHeight = currentY;
            return { positions, totalWidth, totalHeight };
        }
    }

    measure(ctx: CanvasRenderingContext2D, mode: LayoutMode = 'horizontal', areaWidth: number = 9999, areaHeight: number = 9999): { width: number; height: number } {
        const layout = this._layout(mode, areaWidth, areaHeight);
        return {
            width: layout.totalWidth,
            height: layout.totalHeight,
        };
    }

    draw(ctx: CanvasRenderingContext2D, mode: LayoutMode = 'horizontal', areaWidth: number = 9999, areaHeight: number = 9999) {
        ctx.save();
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        const layout = this._layout(mode, areaWidth, areaHeight);

        // Update bounding box
        this.width = layout.totalWidth;
        this.height = layout.totalHeight;

        for (const pos of layout.positions) {
            const { cx, cy, style, char, width, height, colWidth, rowHeight } = pos;
            let drawX = 0;
            let drawY = 0;

            if (mode === 'vertical') {
                // RTL Layout:
                // cx is LTR column start (0, colWidth1, colWidth1+colWidth2...)
                // We want to flip this relative to totalWidth.
                // Right edge of bounding box is `this.x + this.width`.
                // Column Right Edge (LTR) is `cx + colWidth`.
                // Distance from LTR Left to Column Right is `cx + colWidth`.
                // In RTL, this becomes Distance from RTL Right to Column Left? 
                // Let's use simpler math:
                // RTL X = TotalWidth - (cx + colWidth).
                // Abs X = this.x + RTL X.
                const rtlX = layout.totalWidth - (cx + (colWidth || width));
                drawX = this.x + rtlX;

                // Center align char in column if charWidth < colWidth
                if (colWidth && width < colWidth) {
                    drawX += (colWidth - width) / 2;
                }
                drawY = this.y + cy;
            } else {
                drawX = this.x + cx;
                drawY = this.y + cy;

                // Bottom/Center align in row if rowHeight > height
                // Default: Top align (no change)
                if (rowHeight && height < rowHeight) {
                    // Center vertically
                    drawY += (rowHeight - height) / 2;
                }
            }

            // 1. Draw Background
            if (style.background) {
                ctx.save();
                ctx.fillStyle = style.background;
                ctx.fillRect(drawX, drawY, width, height);
                ctx.restore();
            }

            // 2. Draw Text
            ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
            ctx.fillStyle = style.color;
            ctx.fillText(char, drawX, drawY);

            // 3. Draw Underline
            if (style.underline) {
                ctx.save();
                ctx.strokeStyle = style.color;
                ctx.lineWidth = 1;
                const lineY = drawY + height - (height * 0.1);
                ctx.beginPath();
                ctx.moveTo(drawX, lineY);
                ctx.lineTo(drawX + width - this.letterSpacing, lineY);
                ctx.stroke();
                ctx.restore();
            }
        }

        ctx.restore();
    }
}

export class ImageDelta extends Delta {
    public src: string;
    public aspectRatio: number = 1;
    private _img: HTMLImageElement | null = null;
    private _loaded: boolean = false;
    private _onLoadCallback: (() => void) | null = null;

    constructor(
        attr: Omit<DeltaLike, 'type'> & { src: string },
        onLoad?: () => void,
    ) {
        super({ ...attr, type: DeltaType.Image });
        this.src = attr.src;
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
        if (!this._loaded || !this._img) {
            // Draw placeholder
            ctx.save();
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(this.x, this.y, this.width || 100, this.height || 100);
            ctx.fillStyle = '#999';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading...', this.x + (this.width || 100) / 2, this.y + (this.height || 100) / 2);
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.drawImage(this._img, this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    /** Resize while preserving aspect ratio */
    public resizeKeepAspect(newWidth: number) {
        this.width = newWidth;
        this.height = newWidth / this.aspectRatio;
    }
}
