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

export type LayoutMode = 'vertical' | 'horizontal';

export class TextDelta extends Delta {
    public content: string;
    public fontFamily: string;
    public fontSize: number;
    public lineHeight: number;
    public letterSpacing: number;

    constructor(attr: DeltaLike & { content: string; fontFamily?: string; fontSize?: number }) {
        super({ ...attr, type: DeltaType.Text });
        this.content = attr.content;
        this.fontFamily = attr.fontFamily || 'serif';
        this.fontSize = attr.fontSize || 28;
        this.lineHeight = 1.5;
        this.letterSpacing = 2;
    }

    /**
     * Calculate character positions for both modes.
     * Returns positions array and the bounding box dimensions.
     */
    private _layout(
        mode: LayoutMode,
        areaWidth: number,
        areaHeight: number,
    ): { positions: { char: string; cx: number; cy: number }[]; totalWidth: number; totalHeight: number } {
        const charSize = this.fontSize;
        const cellH = charSize * this.lineHeight;
        const cellW = charSize + this.letterSpacing;
        const chars = this.content.split('');
        const positions: { char: string; cx: number; cy: number }[] = [];

        if (mode === 'vertical') {
            // 竖排: top→bottom in each column, columns flow right→left
            const maxRows = Math.max(1, Math.floor((areaHeight - this.y) / cellH));
            let col = 0;
            let row = 0;

            for (const ch of chars) {
                // Column x: starts from left, each new column goes to the right
                // Actually traditional vertical is right-to-left, but since we start from this.x,
                // let's place first column at this.x and go LEFT. We'll adjust later.
                const cx = -col * cellW; // relative offset (will be adjusted)
                const cy = row * cellH;  // relative offset
                positions.push({ char: ch, cx, cy });

                row++;
                if (row >= maxRows) {
                    row = 0;
                    col++;
                }
            }

            const totalCols = col + (row > 0 ? 1 : 0);
            const totalRows = totalCols === 1 ? chars.length : maxRows;
            return {
                positions,
                totalWidth: totalCols * cellW,
                totalHeight: Math.min(totalRows, chars.length) * cellH,
            };
        } else {
            // 横排: left→right in each row, rows flow top→bottom
            const maxCols = Math.max(1, Math.floor((areaWidth - this.x) / cellW));
            let col = 0;
            let row = 0;

            for (const ch of chars) {
                const cx = col * cellW;
                const cy = row * cellH;
                positions.push({ char: ch, cx, cy });

                col++;
                if (col >= maxCols) {
                    col = 0;
                    row++;
                }
            }

            const totalRows = row + (col > 0 ? 1 : 0);
            const totalCols = totalRows === 1 ? chars.length : maxCols;
            return {
                positions,
                totalWidth: Math.min(totalCols, chars.length) * cellW,
                totalHeight: totalRows * cellH,
            };
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
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#2c3e50';

        const layout = this._layout(mode, areaWidth, areaHeight);

        // Update bounding box
        this.width = layout.totalWidth;
        this.height = layout.totalHeight;

        if (mode === 'vertical') {
            // For vertical: first column starts at right edge of bounding box
            // cx is negative offset from the right edge
            for (const pos of layout.positions) {
                const drawX = this.x + this.width + pos.cx - (this.fontSize + this.letterSpacing);
                const drawY = this.y + pos.cy;
                ctx.fillText(pos.char, drawX, drawY);
            }
        } else {
            // Horizontal: straightforward
            for (const pos of layout.positions) {
                ctx.fillText(pos.char, this.x + pos.cx, this.y + pos.cy);
            }
        }

        ctx.restore();
    }
}
