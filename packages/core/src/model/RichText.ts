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
