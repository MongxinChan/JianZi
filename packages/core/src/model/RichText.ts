export interface CharStyle {
    color?: string;       // 字体颜色
    fontSize?: number;    // 字体大小
    fontFamily?: string;  // 字体
    fontWeight?: string;  // 粗体
    background?: string;  // 荧光笔背景色
    underline?: boolean;
    lineThrough?: boolean; // 删去线
}

export interface StyledFragment {
    text: string;          // 一段连续同样式的文本
    style: CharStyle;
}

export type RichContent = StyledFragment[];

export function applyStyleToContent(content: RichContent, start: number, end: number, style: Partial<CharStyle>): RichContent {
    const newContent: StyledFragment[] = [];
    let cursor = 0;

    for (const fragment of content) {
        const len = fragment.text.length;
        const fragStart = cursor;
        const fragEnd = cursor + len;

        // Check intersection
        const is = Math.max(start, fragStart);
        const ie = Math.min(end, fragEnd);

        if (is < ie) {
            // Overlap exists
            // 1. Pre-overlap
            if (is > fragStart) {
                newContent.push({
                    text: fragment.text.slice(0, is - fragStart),
                    style: { ...fragment.style }
                });
            }

            // 2. Overlap (Apply new style)
            newContent.push({
                text: fragment.text.slice(is - fragStart, ie - fragStart),
                style: { ...fragment.style, ...style }
            });

            // 3. Post-overlap
            if (ie < fragEnd) {
                newContent.push({
                    text: fragment.text.slice(ie - fragStart),
                    style: { ...fragment.style }
                });
            }
        } else {
            // No overlap, keep as is
            newContent.push(fragment);
        }

        cursor += len;
    }

    return mergeAdjacent(newContent);
}

function mergeAdjacent(content: RichContent): RichContent {
    if (content.length === 0) return [];
    const merged: StyledFragment[] = [];
    let last = content[0];

    for (let i = 1; i < content.length; i++) {
        const curr = content[i];
        if (areStylesEqual(last.style, curr.style)) {
            last.text += curr.text;
        } else {
            merged.push(last);
            last = curr;
        }
    }
    merged.push(last);
    return merged;
}

function areStylesEqual(a: CharStyle, b: CharStyle): boolean {
    const keysA = Object.keys(a) as (keyof CharStyle)[];
    const keysB = Object.keys(b) as (keyof CharStyle)[];

    // Simple length check first (assuming no undefined values stored)
    if (keysA.length !== keysB.length) return false;

    for (const k of keysA) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}
