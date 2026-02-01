import { Layout } from './Layout';
import { Stage } from './Stage';
import { JianZiOptions, RenderNode } from './types';

/**
 * 渲染器类：负责调度布局算法并执行 Canvas 绘制任务
 */
export class Renderer {
  private stage: Stage;
  private layout: Layout;
  private options: JianZiOptions;

  constructor(options: JianZiOptions) {
    this.options = options;
    this.stage = new Stage(options);
    this.layout = new Layout();
  }

  /**
   * 执行完整的渲染流程
   * @param text 待书写的信件内容
   */
  public render(text: string): void {
    // 1. 清空画布，准备新一帧
    this.stage.clear();

    // 2. 绘制信笺背景（此处可扩展纸张纹理）
    this.drawPaper();

    // 3. 计算排版坐标
    const nodes = Layout.calculateVertical(
      text,
      this.options.width,
      this.options.height,
      this.options.padding,
    );

    // 4. 执行字符绘制
    this.drawText(nodes);
  }

  /**
   * 暴露 Canvas 元素给上层 (解决 exportImage 报错)
   * 这一步是为了让 Editor 能拿到 DOM 节点去生成图片
   */
  public getCanvas(): HTMLCanvasElement {
    return this.stage.getCanvas();
  }

  /**
   * 动态更新配置 (解决 updateOptions 报错)
   * 当用户拖动 PADDING 滑块时，这个方法会被调用
   */
  public updateOptions(options: JianZiOptions): void {
    this.options = options;
    // 通知 Stage 更新尺寸（如果宽高变了）
    this.stage.updateOptions(options); 
  }

  /**
   * 绘制底色/纸张感
   */
  private drawPaper(): void {
    const { ctx } = this.stage;
    ctx.fillStyle = '#fdfaf5'; // 经典宣纸色
    ctx.fillRect(0, 0, this.options.width, this.options.height);
  }

  /**
   * 将计算好的节点绘制到 Canvas 上
   */
  private drawText(nodes: RenderNode[]): void {
    const { ctx } = this.stage;
    
    // 设置字体美学属性
    ctx.font = `${this.options.defaultFont || "28px 'STKaiti', 'KaiTi', serif"}`;
    ctx.fillStyle = '#2c3e50'; // 沉稳的墨色
    ctx.textBaseline = 'middle'; // 配合重心居中算法

    nodes.forEach((node) => {
      ctx.fillText(node.char, node.x, node.y);
    });
  }
}