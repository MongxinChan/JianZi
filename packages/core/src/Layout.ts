//import
import { RenderNode } from "./types";

export class Layout {
  static calculateVertical(text: string, width: number, height: number, padding: number = 40): RenderNode[] {
    const fontSize = 28;
    const lineSpacing = 44; // 列宽
    const charSpacing = 40; // 字间距
    
    const nodes: RenderNode[] = [];
    let startX = width - padding - lineSpacing; // 从右侧开始
    let startY = padding;

    for (const char of text) {
      // 检查换列逻辑：向下触底则向左移动一列
      if (startY + charSpacing > height - padding) {
        startY = padding;
        startX -= lineSpacing;
      }

      nodes.push({
        char,
        x: startX + (lineSpacing - fontSize) / 2, // 重心居中对齐
        y: startY + fontSize / 2,
        fontSize
      });

      startY += charSpacing;
    }
    return nodes;
  }
}