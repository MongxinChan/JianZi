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
   * 初始化“隐藏输入桥梁”
   * 利用原生 textarea 处理复杂的中文输入法 (IME)
   */
  private initInputBridge(): void {
    const input = document.createElement('textarea');
    
    // 样式：将其隐藏，但保持可聚焦状态
    Object.assign(input.style, {
      position: 'absolute',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1',
    });

    document.body.appendChild(input);
    this.inputElement = input;

    // 监听输入事件
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.text = target.value;
      this.refresh(); // 触发实时渲染
    });

    // 点击 Canvas 时自动聚焦到隐藏输入框
    this.options.container.addEventListener('click', () => {
      this.inputElement?.focus();
    });
  }

  /**
   * 触发重新渲染流水线
   */
  public refresh(): void {
    this.renderer.render(this.text);
  }

  /**
   * 外部手动设置内容的方法
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