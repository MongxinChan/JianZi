import { Delta, DeltaLike, DeltaType, LayoutMode } from './BaseDelta';
import { RichContent, CharStyle } from './RichText';

export class TextDelta extends Delta {
    public fragments: RichContent;
    public fontFamily: string;
    public fontSize: number;
    public lineHeight: number;
    public letterSpacing: number;
    /** Layout constraint: if set, text reflows within this width (used by _layout) */
    public layoutConstraintW: number = 0;
    /** Layout constraint: if set, text reflows within this height (used by _layout) */
    public layoutConstraintH: number = 0;

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
            lineThrough: fragmentStyle.lineThrough,
            fontWeight: fragmentStyle.fontWeight || 'normal',
            fontStyle: fragmentStyle.fontStyle || 'normal',
        };
    }

    private _layoutCache: {
        hash: string;
        result: {
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
            totalHeight: number;
        };
    } | null = null;

    /**
     * Calculate character positions for both modes with RichText support.
     * Returns positions array and the bounding box dimensions.
     */
    private _layout(
        ctx: CanvasRenderingContext2D,
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
            colWidth?: number;
            rowHeight?: number;
            style: ReturnType<TextDelta['_getEffectiveStyle']>;
        }[];
        totalWidth: number;
        totalHeight: number
    } {
        const hash = `${mode}:${areaWidth}:${areaHeight}:${this.layoutConstraintW}:${this.layoutConstraintH}:${this.letterSpacing}:${this.lineHeight}:${this.fontSize}:${this.fontFamily}:${JSON.stringify(this.fragments)}`;
        if (this._layoutCache && this._layoutCache.hash === hash) {
            return this._layoutCache.result;
        }

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

                for (const char of fragment.text) {
                    if (char === '\n') {
                        if (colWidth === 0) colWidth = charW;

                        colBuffer.push({
                            char: ' ',
                            cx: currentX,
                            cy: currentY,
                            width: charW,
                            height: charH,
                            style
                        });

                        flushColumn();
                        continue;
                    }

                    if (currentY + charH > areaHeight && currentY > 0) {
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
            const result = { positions, totalWidth, totalHeight };
            this._layoutCache = { hash, result };
            return result;

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

                const fStyle = style.fontStyle || 'normal';
                const fWeight = style.fontWeight || 'normal';
                ctx.font = `${fStyle} ${fWeight} ${style.fontSize}px ${style.fontFamily}`;

                for (const char of fragment.text) {
                    if (char === '\n') {
                        if (rowHeight === 0) rowHeight = charH;
                        // For newline, simulate wide space
                        const spaceW = charSize + this.letterSpacing;

                        rowBuffer.push({
                            char: ' ',
                            cx: currentX,
                            cy: currentY,
                            width: spaceW,
                            height: charH,
                            style
                        });

                        flushRow();
                        continue;
                    }

                    // Dynamically measure width for horizontal layout
                    const charMetrics = ctx.measureText(char);
                    const charW = charMetrics.width + this.letterSpacing;

                    if (currentX + charW > areaWidth && currentX > 0) {
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
            const result = { positions, totalWidth, totalHeight };
            this._layoutCache = { hash, result };
            return result;
        }
    }

    measure(ctx: CanvasRenderingContext2D, mode: LayoutMode = 'horizontal', areaWidth: number = 9999, areaHeight: number = 9999): { width: number; height: number } {
        const layoutW = this.layoutConstraintW > 0 ? (this.layoutConstraintW + this.x) : areaWidth;
        const layoutH = this.layoutConstraintH > 0 ? (this.layoutConstraintH + this.y) : areaHeight;
        const layout = this._layout(ctx, mode, layoutW, layoutH);
        return {
            width: this.layoutConstraintW > 0 ? this.layoutConstraintW : layout.totalWidth,
            height: this.layoutConstraintH > 0 ? this.layoutConstraintH : layout.totalHeight,
        };
    }

    draw(ctx: CanvasRenderingContext2D, mode: LayoutMode = 'horizontal', areaWidth: number = 9999, areaHeight: number = 9999) {
        ctx.save();
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        // Use layout constraints if user has resized, otherwise use canvas area
        const layoutW = this.layoutConstraintW > 0 ? (this.layoutConstraintW + this.x) : areaWidth;
        const layoutH = this.layoutConstraintH > 0 ? (this.layoutConstraintH + this.y) : areaHeight;
        const layout = this._layout(ctx, mode, layoutW, layoutH);

        // Always update bounding box from actual content, but respect manual resize
        this.width = this.layoutConstraintW > 0 ? this.layoutConstraintW : layout.totalWidth;
        this.height = this.layoutConstraintH > 0 ? this.layoutConstraintH : layout.totalHeight;

        for (const pos of layout.positions) {
            const { cx, cy, style, char, width, height, colWidth, rowHeight } = pos;
            let drawX = 0;
            let drawY = 0;

            if (mode === 'vertical') {
                // RTL Layout
                const boxWidth = this.layoutConstraintW > 0 ? this.layoutConstraintW : layout.totalWidth;
                const rtlX = boxWidth - (cx + (colWidth || width));
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
            // format: "fontStyle fontWeight fontSize fontFamily"
            const fStyle = style.fontStyle || 'normal';
            const fWeight = style.fontWeight || 'normal';
            ctx.font = `${fStyle} ${fWeight} ${style.fontSize}px ${style.fontFamily}`;
            ctx.fillStyle = style.color;
            ctx.fillText(char, drawX, drawY);

            // 3. Draw Underline (horizontal) / Side line (vertical)
            if (style.underline) {
                ctx.save();
                ctx.strokeStyle = style.color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (mode === 'vertical') {
                    // 竖排旁线：字符左侧的竖线
                    const lineX = drawX - width * 0.15;
                    ctx.moveTo(lineX, drawY);
                    ctx.lineTo(lineX, drawY + height);
                } else {
                    // 横排下划线：字符底部的横线
                    const lineY = drawY + height - (height * 0.1);
                    ctx.moveTo(drawX, lineY);
                    ctx.lineTo(drawX + width - this.letterSpacing, lineY);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        ctx.restore();
    }

    /**
     * Get character index at specific coordinate.
     */
    public getCharIndexAt(ctx: CanvasRenderingContext2D, x: number, y: number, mode: LayoutMode, areaWidth: number = 9999, areaHeight: number = 9999): number {
        const layoutW = this.layoutConstraintW > 0 ? (this.layoutConstraintW + this.x) : areaWidth;
        const layoutH = this.layoutConstraintH > 0 ? (this.layoutConstraintH + this.y) : areaHeight;
        const layout = this._layout(ctx, mode, layoutW, layoutH);

        const localX = x - this.x;
        const localY = y - this.y;

        let index = 0;

        for (const pos of layout.positions) {
            const { cx, cy, width, height, colWidth, rowHeight } = pos;
            let targetX = cx;
            let targetY = cy;
            let targetW = width;
            let targetH = height;

            if (mode === 'vertical') {
                const boxWidth = this.layoutConstraintW > 0 ? this.layoutConstraintW : layout.totalWidth;
                const rtlX = boxWidth - (cx + (colWidth || width));
                targetX = rtlX;
                if (colWidth && width < colWidth) {
                    targetX += (colWidth - width) / 2;
                }
                targetY = cy;
                targetW = colWidth || width;
            } else {
                if (rowHeight && height < rowHeight) {
                    targetY += (rowHeight - height) / 2;
                }
                targetH = rowHeight || height;
            }

            if (
                localX >= targetX && localX <= targetX + targetW &&
                localY >= targetY && localY <= targetY + targetH
            ) {
                return index;
            }
            index++;
        }

        return -1; // Miss
    }

    public getCaretRect(ctx: CanvasRenderingContext2D, index: number, mode: LayoutMode, areaWidth: number = 9999, areaHeight: number = 9999): { x: number; y: number; width: number; height: number } | null {
        const layoutW = this.layoutConstraintW > 0 ? (this.layoutConstraintW + this.x) : areaWidth;
        const layoutH = this.layoutConstraintH > 0 ? (this.layoutConstraintH + this.y) : areaHeight;
        const layout = this._layout(ctx, mode, layoutW, layoutH);

        const posIdx = Math.max(0, Math.min(index, layout.positions.length));
        let drawX = this.x;
        let drawY = this.y;
        let drawW = 2;
        let drawH = this.fontSize;

        if (layout.positions.length === 0) {
            if (mode === 'vertical') {
                drawX = this.layoutConstraintW > 0 ? (this.x + this.layoutConstraintW - this.fontSize) : this.x;
                drawW = this.fontSize;
                drawH = 2;
            } else {
                drawH = this.fontSize * this.lineHeight;
                drawW = 2;
            }
            return { x: drawX, y: drawY, width: drawW, height: drawH };
        }

        if (posIdx < layout.positions.length) {
            const pos = layout.positions[posIdx];
            const { cx, cy, width, height, colWidth, rowHeight } = pos;

            if (mode === 'vertical') {
                const boxWidth = this.layoutConstraintW > 0 ? this.layoutConstraintW : layout.totalWidth;
                const rtlX = boxWidth - (cx + (colWidth || width));
                drawX = this.x + rtlX;
                drawW = colWidth || width;
                drawH = 2;
                drawY = this.y + cy;
            } else {
                drawX = this.x + cx;
                drawY = this.y + cy;
                drawW = 2;
                drawH = rowHeight || height;
            }
        } else {
            const pos = layout.positions[layout.positions.length - 1];
            const { cx, cy, width, height, colWidth, rowHeight } = pos;

            if (mode === 'vertical') {
                const boxWidth = this.layoutConstraintW > 0 ? this.layoutConstraintW : layout.totalWidth;
                const rtlX = boxWidth - (cx + (colWidth || width));
                drawX = this.x + rtlX;
                drawW = colWidth || width;
                drawH = 2;
                drawY = this.y + cy + height;
            } else {
                drawX = this.x + cx + width;
                drawY = this.y + cy;
                drawW = 2;
                drawH = rowHeight || height;
            }
        }

        return { x: drawX, y: drawY, width: drawW, height: drawH };
    }

    /**
     * Get rectangles for a range of characters.
     * Used for drawing selection highlight.
     */
    public getRectsForRange(ctx: CanvasRenderingContext2D, start: number, end: number, mode: LayoutMode, areaWidth: number = 9999, areaHeight: number = 9999): { x: number; y: number; width: number; height: number }[] {
        const layoutW = this.layoutConstraintW > 0 ? (this.layoutConstraintW + this.x) : areaWidth;
        const layoutH = this.layoutConstraintH > 0 ? (this.layoutConstraintH + this.y) : areaHeight;
        const layout = this._layout(ctx, mode, layoutW, layoutH);
        const rects: { x: number; y: number; width: number; height: number }[] = [];

        // Clamp
        const s = Math.max(0, Math.min(start, layout.positions.length));
        const e = Math.max(0, Math.min(end, layout.positions.length));
        if (s >= e) return [];

        for (let i = s; i < e; i++) {
            const pos = layout.positions[i];
            const { cx, cy, width, height, colWidth, rowHeight } = pos;
            let drawX = 0;
            let drawY = 0;
            let drawW = width;
            let drawH = height;

            if (mode === 'vertical') {
                const boxWidth = this.layoutConstraintW > 0 ? this.layoutConstraintW : layout.totalWidth;
                const rtlX = boxWidth - (cx + (colWidth || width));
                drawX = this.x + rtlX;
                if (colWidth) {
                    drawW = colWidth;
                } else {
                    drawW = width;
                }
                drawH = height;
                drawY = this.y + cy;
            } else {
                drawX = this.x + cx;
                drawY = this.y + cy;
                if (rowHeight) {
                    drawH = rowHeight;
                }
                drawW = width;
            }

            rects.push({ x: drawX, y: drawY, width: drawW, height: drawH });
        }
        return rects;
    }

    public getCommonStyle(start: number, end: number): Partial<import('./RichText').CharStyle> | null {
        if (start >= end) return null;

        let commonStyle: Partial<import('./RichText').CharStyle> | null = null;
        let cursor = 0;
        let hasOverlap = false;

        for (const fragment of this.fragments) {
            const len = fragment.text.length;
            const fragStart = cursor;
            const fragEnd = cursor + len;

            // Check overlap
            if (fragEnd > start && fragStart < end) {
                const style = this._getEffectiveStyle(fragment.style);

                if (!hasOverlap) {
                    // First fragment in range
                    commonStyle = { ...style };
                    hasOverlap = true;
                } else if (commonStyle) {
                    // Compare with existing commonStyle and remove mismatches
                    (Object.keys(commonStyle) as Array<keyof import('./RichText').CharStyle>).forEach(key => {
                        if (commonStyle![key] !== style[key]) {
                            delete commonStyle![key];
                        }
                    });
                }
            }
            cursor += len;
            if (cursor >= end) break;
        }

        return commonStyle;
    }

    /**
     * Apply style to a range of text.
     * Splits fragments as necessary.
     */
    public applyStyle(start: number, end: number, style: Partial<CharStyle>) {
        if (start >= end) return;

        const newFragments: RichContent = [];
        let cursor = 0;

        for (const fragment of this.fragments) {
            const len = fragment.text.length;
            const fragStart = cursor;
            const fragEnd = cursor + len;

            // 1. Fragment completely before range
            if (fragEnd <= start) {
                newFragments.push(fragment);
            }
            // 2. Fragment completely after range
            else if (fragStart >= end) {
                newFragments.push(fragment);
            }
            // 3. Overlap
            else {
                // Split if needed
                const overlapStart = Math.max(fragStart, start);
                const overlapEnd = Math.min(fragEnd, end);

                // Part before range
                if (fragStart < overlapStart) {
                    newFragments.push({
                        text: fragment.text.substring(0, overlapStart - fragStart),
                        style: { ...fragment.style }
                    });
                }

                // Part inside range
                newFragments.push({
                    text: fragment.text.substring(overlapStart - fragStart, overlapEnd - fragStart),
                    style: { ...fragment.style, ...style }
                });

                // Part after range
                if (fragEnd > overlapEnd) {
                    newFragments.push({
                        text: fragment.text.substring(overlapEnd - fragStart),
                        style: { ...fragment.style }
                    });
                }
            }
            cursor += len;
        }

        // Merge adjacent identical styles
        this.fragments = this._mergeFragments(newFragments);
    }

    private _mergeFragments(fragments: RichContent): RichContent {
        if (fragments.length === 0) return [];
        const merged: RichContent = [fragments[0]];

        for (let i = 1; i < fragments.length; i++) {
            const prev = merged[merged.length - 1];
            const curr = fragments[i];

            if (this._isStyleEqual(prev.style, curr.style)) {
                prev.text += curr.text;
            } else {
                merged.push(curr);
            }
        }
        return merged;
    }

    private _isStyleEqual(s1: CharStyle, s2: CharStyle): boolean {
        const k1 = Object.keys(s1).sort();
        const k2 = Object.keys(s2).sort();
        if (k1.length !== k2.length) return false;

        // Use loose check or JSON stringify?
        // JSON stringify is easy for simple objects
        return JSON.stringify(s1) === JSON.stringify(s2);
    }

    public getStyleAt(index: number): import('./RichText').CharStyle | null {
        let cursor = 0;
        for (const fragment of this.fragments) {
            const len = fragment.text.length;
            if (index >= cursor && index < cursor + len) {
                return { ...fragment.style };
            }
            cursor += len;
        }
        // If at the very end, return last style or empty
        if (this.fragments.length > 0 && index === cursor) {
            return { ...this.fragments[this.fragments.length - 1].style };
        }
        return null;
    }
}
