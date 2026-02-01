// packages/core/src/Editor.ts
import { Renderer } from './Renderer';
import { JianZiOptions } from './types';

/**
 * 编辑器交互类：负责处理用户输入、状态管理与渲染同步
 */
export class Editor {
  private renderer: Renderer;
  private options: JianZiOptions;
  private inputElement: HTMLTextAreaElement | null = null;
  private text: string = '';

  constructor(options: JianZiOptions) {
    this.options = options;
    this.renderer = new Renderer(options);
    this.initInputBridge();
  }

  /**
   * 清除所有内容并重置状态
   */
  public clear(): void {
    this.text = '';
    // 关键修复：必须同步清空隐藏输入框的值，否则下次输入会出错
    if (this.inputElement) {
      this.inputElement.value = '';
    }
    this.refresh();
  }

  /**
   * 导出当前画布内容为图片
   */
  public exportImage(): string {
    const canvas = this.renderer.getCanvas();
    // 导出高质量 PNG
    return canvas.toDataURL('image/png', 1.0);
  }

  /**
   * 动态更新编辑器配置
   */
  public updateOptions(newOptions: Partial<JianZiOptions>): void {
    // 1. 合并新旧配置
    this.options = { ...this.options, ...newOptions };
    
    // 2. 通知底层引擎更新（例如改变了 PADDING 或 格线透明度）
    this.renderer.updateOptions(this.options);
    
    // 3. 立即重绘以反映变化
    this.refresh();
  }

  /**
   * 获取当前配置 (供 Web 层读取状态用)
   */
  public getOptions(): JianZiOptions {
    return this.options;
  }

  /**
   * 初始化“隐藏输入桥梁”
   * 利用原生 textarea 处理复杂的中文输入法 (IME)
   */
  private initInputBridge(): void {
    const input = document.createElement('textarea');

    // 样式：将其隐藏，但保持可聚焦状态
    Object.assign(input.style, {
      position: 'absolute',
      top: '0',    // 确保它在可视区域内，防止页面意外滚动
      left: '0',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1',
    });

    document.body.appendChild(input);
    this.inputElement = input;

    // 监听输入事件：数据流向的核心
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.text = target.value;
      this.refresh(); // 触发实时渲染
    });

    // 交互核心：点击 Canvas 容器时，强制聚焦到隐藏输入框
    // 这样用户点击纸张任意位置都能直接打字
    this.options.container.addEventListener('click', () => {
      // 加上简单的防抖或延时，确保焦点不被其他事件抢走
      setTimeout(() => {
        this.inputElement?.focus();
      }, 0);
    });
  }

  /**
   * 触发重新渲染流水线
   */
  public refresh(): void {
    this.renderer.render(this.text);
  }

  /**
   * 外部手动设置内容的方法 (用于设置默认文字)
   */
  public setValue(val: string): void {
    this.text = val;
    if (this.inputElement) this.inputElement.value = val;
    this.refresh();
  }

  /**
   * 获取当前文本内容
   */
  public getValue(): string {
    return this.text;
  }
}