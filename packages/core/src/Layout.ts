//import
import { RenderNode } from "./types";

export class Layout {
  /**
   * 垂直排版计算 (古风)
   * 从右向左，从上向下
   */
  static calculateVertical(text: string, width: number, height: number, padding: number = 40): RenderNode[] {
    const fontSize = 28;
    const lineSpacing = 44; // 列宽
    const charSpacing = 40; // 字间距

    const nodes: RenderNode[] = [];
    let startX = width - padding - lineSpacing; // 从右侧开始
    let startY = padding;

    for (const char of text) {
      if (char === '\n') {
        startY = padding;
        startX -= lineSpacing;
        continue;
      }

      // 检查换列逻辑：向下触底则向左移动一列
      if (startY + charSpacing > height - padding) {
        startY = padding;
        startX -= lineSpacing;
      }

      // 特殊标点符号修正
      let offsetX = 0;
      let offsetY = 0;

      // 修正感叹号等标点在竖排时的位置
      if (['！', '!', '，', ',', '。', '.'].indexOf(char) !== -1) {
        offsetX = 2; // 微调 X 轴
        offsetY = -2; // 微调 Y 轴
      }

      nodes.push({
        char,
        x: startX + (lineSpacing - fontSize) / 2 + offsetX, // 重心居中对齐
        y: startY + fontSize / 2 + offsetY,
        fontSize
      });

      startY += charSpacing;
    }
    return nodes;
  }

  /**
   * 水平排版计算 (现代)
   * 从左向右，从上向下
   */
  static calculateHorizontal(text: string, width: number, height: number, padding: number = 40): RenderNode[] {
    const fontSize = 28;
    const lineSpacing = 44; // 行高
    const charSpacing = 30; // 字间距 (水平排版通常紧凑一些)

    const nodes: RenderNode[] = [];
    let startX = padding;
    let startY = padding + fontSize; // 基线大致位置，但这里用的是 fillText 的 y，取决于 textBaseline

    for (const char of text) {
      if (char === '\n') {
        startX = padding;
        startY += lineSpacing;
        continue;
      }

      // 检查换行逻辑：向右触壁则向下移动一行
      if (startX + charSpacing > width - padding) {
        startX = padding;
        startY += lineSpacing;
      }

      nodes.push({
        char,
        x: startX,
        y: startY - fontSize / 2, // 保持与 Vertical 类似的垂直对齐逻辑 (middle baseline)
        fontSize
      });

      // 对于水平排版，中文字符通常是等宽的，但英文不是。
      // 为简单起见，这里暂时假设固定字间距。如果需要更好效果，可以使用 measureText。
      // 现在的实现是固定步进。
      startX += charSpacing;

      // 简单优化：如果是 ASCII 字符，步进只有一半
      if (/[\x00-\x7F]/.test(char)) {
        startX -= charSpacing * 0.4; // 稍微紧凑一点
      }
    }
    return nodes;
  }
}