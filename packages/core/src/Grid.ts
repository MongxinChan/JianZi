import { JianZiOptions } from './types';

/**
 * 格线绘制模块：负责根据布局参数生成背景格栏
 */
export class GridPainter {
  /**
   * 绘制竖栏 (主要针对竖排模式)
   * @param ctx Canvas 上下文
   * @param options 引擎配置
   */
  static draw(ctx: CanvasRenderingContext2D, options: JianZiOptions): void {
    const { width, height, padding = 40, grid } = options;
    if (!grid || grid.type === 'none') return;

    // 1. 设置绘图状态
    ctx.save();
    ctx.strokeStyle = grid.color || '#cc0000'; // 默认朱砂色
    ctx.lineWidth = grid.lineWidth || 1;
    ctx.globalAlpha = grid.opacity || 0.3;

    // 2. 获取排版参数 (需与 Layout 保持同步)
    const lineSpacing = 44; // 列宽
    const fontSize = 28;

    // 3. 循环绘制竖线
    // 从右边距开始，向左绘制
    let currentX = width - padding;
    
    ctx.beginPath();
    while (currentX >= padding) {
      // 绘制一列的左右边界线
      ctx.moveTo(currentX, padding);
      ctx.lineTo(currentX, height - padding);
      
      // 这里的逻辑可以根据 'line' 或 'grid' 进行细化
      currentX -= lineSpacing;
    }
    
    // 补上最后一根左边界线
    ctx.moveTo(currentX + lineSpacing, padding);
    ctx.stroke();
    
    ctx.restore();
  }
}