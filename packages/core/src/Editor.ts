// packages/core/src/Editor.ts
import { JianZiOptions } from './types';
import { DeltaSet } from './model/DeltaSet';
import { Delta, TextDelta } from './model/Delta';
import { LayerManager } from './core/LayerManager';

/**
 * 编辑器交互类：负责处理用户输入、状态管理与渲染同步
 */
export class Editor {
  private layerManager: LayerManager;
  private deltas: DeltaSet;
  private options: JianZiOptions;
  // TODO: Select/Input logic will be moved to InteractionLayer later
  private inputElement: HTMLTextAreaElement | null = null;
  private selectedDeltaId: string | null = null;

  constructor(options: JianZiOptions) {
    this.options = options;
    this.deltas = new DeltaSet();
    this.layerManager = new LayerManager(options);
    this.initInputBridge();
  }

  /**
   * 清除所有内容并重置状态
   */
  public clear(): void {
    this.deltas.clear();
    if (this.inputElement) {
      this.inputElement.value = '';
    }
    this.refresh();
  }

  /**
   * 导出当前画布内容为图片
   */
  public exportImage(): string {
    // TODO: Need expose canvas from LayerManager
    // @ts-ignore
    const canvas = this.layerManager.canvasLayer.getCanvas();
    return canvas.toDataURL('image/png', 1.0);
  }

  /**
   * 动态更新编辑器配置
   */
  public updateOptions(newOptions: Partial<JianZiOptions>): void {
    const oldWidth = this.options.width;
    const oldHeight = this.options.height;

    this.options = { ...this.options, ...newOptions };

    if (this.options.width !== oldWidth || this.options.height !== oldHeight) {
      this.layerManager.resize(this.options.width, this.options.height);
    }

    // Force re-render
    this.refresh();
  }

  /**
   * 获取当前配置
   */
  public getOptions(): JianZiOptions {
    return this.options;
  }

  private initInputBridge(): void {
    const input = document.createElement('textarea');
    Object.assign(input.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1',
    });

    document.body.appendChild(input);
    this.inputElement = input;

    // Input handling
    let isComposing = false;

    input.addEventListener('compositionstart', () => {
      isComposing = true;
    });

    input.addEventListener('compositionend', (e) => {
      isComposing = false;
      // Trigger final update
      handleInput((e.target as HTMLTextAreaElement).value);
    });

    input.addEventListener('input', (e) => {
      if (!isComposing) {
        handleInput((e.target as HTMLTextAreaElement).value);
      }
    });

    const handleInput = (text: string) => {
      if (this.selectedDeltaId) {
        const delta = this.deltas.get(this.selectedDeltaId);
        if (delta instanceof TextDelta) {
          delta.content = text;
          // Width is updated in draw() via measure(), but we force refresh to trigger it
          this.refresh();
        }
      } else {
        // If no selection, maybe creating a new text block?
        // For now, let's keep the "Main Text" behavior if nothing selected but canvas is empty
        if (this.deltas.getAll().length === 0) {
          const textDelta = new TextDelta({
            id: 'main-text',
            x: this.options.padding || 60,
            y: this.options.padding || 60,
            width: 500,
            height: 500,
            type: 'text' as any,
            content: text,
            fontSize: 28,
            fontFamily: "'STKaiti', 'KaiTi', serif"
          });
          this.deltas.add(textDelta);
          this.selectedDeltaId = textDelta.id; // Auto select
          this.refresh();
        }
      }
    };

    // Mouse Interaction Logic
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const getMousePos = (e: MouseEvent) => {
      const rect = this.layerManager.getContainer().getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    this.options.container.addEventListener('mousedown', (e) => {
      const { x, y } = getMousePos(e);
      const delta = this.deltas.hitTest(x, y);

      // Deselect all
      this.deltas.forEach(d => d.selected = false);

      if (delta) {
        delta.selected = true;
        this.selectedDeltaId = delta.id;
        isDragging = true;
        lastX = x;
        lastY = y;

        // Focus input if text (to allow editing)
        if (delta.type === 'text') {
          // Sync input value
          if (this.inputElement) {
            this.inputElement.value = (delta as TextDelta).content;
            setTimeout(() => this.inputElement?.focus(), 0);
          }
        }
      } else {
        this.selectedDeltaId = null;
        // Click on empty space -> Focus input to create new text? 
        // For now, just focus input to keep typing working as "append" or "new block"
        setTimeout(() => this.inputElement?.focus(), 0);
      }
      this.refresh();
    });

    this.options.container.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.selectedDeltaId) return;

      const { x, y } = getMousePos(e);
      const dx = x - lastX;
      const dy = y - lastY;

      const delta = this.deltas.get(this.selectedDeltaId);
      if (delta) {
        delta.move(dx, dy);
        this.refresh();
      }

      lastX = x;
      lastY = y;
    });

    this.options.container.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.options.container.addEventListener('click', () => {
      // Click logic handled in mousedown for now
    });
  }

  public refresh(): void {
    const mode = this.options.mode || 'vertical';
    this.layerManager.render(this.deltas, mode);
    // Draw interaction layer (Selection box)
    this.layerManager.interactionLayer.clear();
    const selectedDelta = this.selectedDeltaId ? this.deltas.get(this.selectedDeltaId) : null;
    if (selectedDelta) {
      // @ts-ignore
      this.layerManager.interactionLayer.drawSelection(selectedDelta.getRect());
    }
  }

  public setValue(val: string): void {
    if (this.inputElement) {
      this.inputElement.value = val;
      // Trigger input event logic manually
      this.deltas.clear();
      this.deltas.add(new TextDelta({
        id: 'main-text',
        x: this.options.padding || 60,
        y: this.options.padding || 60,
        width: 500,
        height: 500,
        type: 'text' as any,
        content: val,
        fontSize: 28,
        fontFamily: "'STKaiti', 'KaiTi', serif"
      }));
      this.refresh();
    }
  }

  public getValue(): string {
    // Return first text delta content for now
    const all = this.deltas.getAll();
    if (all.length > 0 && all[0] instanceof TextDelta) {
      return (all[0] as TextDelta).content;
    }
    return '';
  }

}