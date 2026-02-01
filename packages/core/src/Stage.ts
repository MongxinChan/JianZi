// packages/core/src/Stage.ts
import { JianZiOptions } from "./types";

export class Stage {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private dpr: number = window.devicePixelRatio || 1;

  constructor(options: JianZiOptions) {
    const { container, width, height } = options;
    
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    
    // 初始化尺寸
    this.resize(width, height);
    
    container.appendChild(this.canvas);
  }

  /**
   * 内部复用逻辑：调整画布尺寸并处理高清屏缩放
   */
  private resize(width: number, height: number) {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // ⚠️ 关键点：修改 canvas 尺寸会重置 Context 状态，所以每次 resize 后必须重新 scale
    this.ctx.scale(this.dpr, this.dpr);
  }

  /**
   * 清除画布，准备下一帧渲染
   */
  public clear() {
    // 获取当前的逻辑宽度和高度（不含 dpr）
    const width = parseFloat(this.canvas.style.width);
    const height = parseFloat(this.canvas.style.height);
    this.ctx.clearRect(0, 0, width, height);
  }

  /**
   * 获取底层 Canvas 节点
   * 作用：供 Editor 导出图片使用
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 响应配置更新
   * 作用：当用户修改画布宽高时，重新计算尺寸
   */
  public updateOptions(options: JianZiOptions): void {
    const currentWidth = parseFloat(this.canvas.style.width);
    const currentHeight = parseFloat(this.canvas.style.height);

    // 只有当宽高真的变了才执行 resize，节省性能
    if (options.width !== currentWidth || options.height !== currentHeight) {
      this.resize(options.width, options.height);
    }
  }
}