//import
import { JianZiOptions } from "./types";

export class Stage {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private dpr: number = window.devicePixelRatio || 1;

  constructor(options: JianZiOptions) {
    const { container, width, height } = options;
    
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    
    // 适配高清屏，防止文字模糊
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    this.ctx.scale(this.dpr, this.dpr);
    container.appendChild(this.canvas);
  }

  /**
   * 清除画布，准备下一帧渲染
   */
  public clear() {
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
  }
}