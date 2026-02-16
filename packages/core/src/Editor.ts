import { JianZiOptions } from './types';
import { DeltaSet } from './model/DeltaSet';
import { Delta, TextDelta, ImageDelta } from './model/Delta';
import { LayerManager } from './core/LayerManager';
import { InteractionLayer } from './core/InteractionLayer';
import { applyStyleToContent, CharStyle } from './model/RichText';

/**
 * 编辑器交互类：负责处理用户输入、状态管理与渲染同步
 */
export class Editor {
  private layerManager: LayerManager;
  public deltas: DeltaSet;
  private options: JianZiOptions;
  // TODO: Select/Input logic will be moved to InteractionLayer later
  private inputElement: HTMLTextAreaElement | null = null;
  public selectedDeltaId: string | null = null;
  public selectionRange: { start: number; end: number } | null = null;
  private currentFont: string = "'STKaiti', 'KaiTi', serif";

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
    this.selectionRange = null;
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
            fontFamily: this.currentFont
          });
          this.deltas.add(textDelta);
          this.selectedDeltaId = textDelta.id; // Auto select
          this.refresh();
        }
      }
    };

    // Mouse Interaction Logic
    let isDragging = false;
    let isResizing = false;
    let isSelectingText = false;
    let activeHandle: import('./core/InteractionLayer').HandleType = null;
    let lastX = 0;
    let lastY = 0;
    // Store original delta rect at the start of resize
    let resizeStartRect: { x: number; y: number; width: number; height: number } | null = null;
    let resizeStartMouse: { x: number; y: number } | null = null;

    const getMousePos = (e: MouseEvent) => {
      const rect = this.layerManager.getContainer().getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    this.options.container.addEventListener('mousedown', (e) => {
      const { x, y } = getMousePos(e);

      // 1) Check if we clicked on a resize handle of the currently selected delta
      if (this.selectedDeltaId) {
        const handle = this.layerManager.interactionLayer.hitTestHandle(x, y);
        if (handle) {
          isResizing = true;
          activeHandle = handle;
          const delta = this.deltas.get(this.selectedDeltaId);
          if (delta) {
            resizeStartRect = { x: delta.x, y: delta.y, width: delta.width, height: delta.height };
            resizeStartMouse = { x, y };
          }
          return; // Don't process as a regular click
        }
      }

      // 2) Check Text Selection (Click on selected text)
      const hitDelta = this.deltas.hitTest(x, y);
      if (hitDelta && this.selectedDeltaId === hitDelta.id && hitDelta instanceof TextDelta) {
        const idx = hitDelta.getCharIndexAt(
          // @ts-ignore
          this.layerManager.canvasLayer.ctx,
          x, y, this.options.mode || 'vertical',
          this.layerManager.canvasLayer.width,
          this.layerManager.canvasLayer.height
        );
        if (idx !== -1) {
          isSelectingText = true;
          this.selectionRange = { start: idx, end: idx };
          isDragging = false; // Prevent dragging
          this.refresh();
          return;
        }
      }

      // 3) Otherwise, normal select/drag logic
      const delta = hitDelta;

      // Deselect all
      this.deltas.forEach(d => d.selected = false);

      if (delta) {
        delta.selected = true;
        this.selectedDeltaId = delta.id;
        isDragging = true;
        lastX = x;
        lastY = y;
        this.selectionRange = null; // Reset text selection on new delta select

        // Focus input if text (to allow editing)
        if (delta.type === 'text') {
          if (this.inputElement) {
            this.inputElement.value = (delta as TextDelta).content;
            setTimeout(() => this.inputElement?.focus(), 0);
          }
        }
      } else {
        this.selectedDeltaId = null;
        this.selectionRange = null;
        setTimeout(() => this.inputElement?.focus(), 0);
      }
      this.refresh();
    });

    this.options.container.addEventListener('mousemove', (e) => {
      const { x, y } = getMousePos(e);

      // --- Resize mode ---
      if (isResizing && this.selectedDeltaId && resizeStartRect && resizeStartMouse && activeHandle) {
        const dx = x - resizeStartMouse.x;
        const dy = y - resizeStartMouse.y;
        const delta = this.deltas.get(this.selectedDeltaId);
        if (!delta) return;

        const r = resizeStartRect;
        let newX = r.x, newY = r.y, newW = r.width, newH = r.height;

        switch (activeHandle) {
          case 'br':
            newW = Math.max(20, r.width + dx);
            newH = Math.max(20, r.height + dy);
            break;
          case 'bl':
            newW = Math.max(20, r.width - dx);
            newH = Math.max(20, r.height + dy);
            newX = r.x + r.width - newW;
            break;
          case 'tr':
            newW = Math.max(20, r.width + dx);
            newH = Math.max(20, r.height - dy);
            newY = r.y + r.height - newH;
            break;
          case 'tl':
            newW = Math.max(20, r.width - dx);
            newH = Math.max(20, r.height - dy);
            newX = r.x + r.width - newW;
            newY = r.y + r.height - newH;
            break;
          case 'mr':
            newW = Math.max(20, r.width + dx);
            break;
          case 'ml':
            newW = Math.max(20, r.width - dx);
            newX = r.x + r.width - newW;
            break;
          case 'mb':
            newH = Math.max(20, r.height + dy);
            break;
          case 'mt':
            newH = Math.max(20, r.height - dy);
            newY = r.y + r.height - newH;
            break;
        }

        // For ImageDelta: lock aspect ratio
        if (delta instanceof ImageDelta) {
          const aspect = resizeStartRect.width / resizeStartRect.height;
          if (activeHandle === 'br' || activeHandle === 'tl') {
            // Use the larger magnitude delta for aspect-ratio lock
            if (Math.abs(dx) > Math.abs(dy)) {
              newH = newW / aspect;
            } else {
              newW = newH * aspect;
            }
          } else {
            if (Math.abs(dx) > Math.abs(dy)) {
              newH = newW / aspect;
            } else {
              newW = newH * aspect;
            }
          }
          // Recalculate position for TL/BL/TR handles
          if (activeHandle === 'tl') {
            newX = r.x + r.width - newW;
            newY = r.y + r.height - newH;
          } else if (activeHandle === 'bl') {
            newX = r.x + r.width - newW;
          } else if (activeHandle === 'tr') {
            newY = r.y + r.height - newH;
          }
        }

        delta.x = newX;
        delta.y = newY;
        delta.width = newW;
        delta.height = newH;
        // Mark text deltas as manually resized so draw() respects user dimensions
        if (delta instanceof TextDelta) {
          delta._manuallyResized = true;
        }
        this.refresh();
        return;
      }

      // --- Text Selection mode ---
      if (isSelectingText && this.selectedDeltaId && this.selectionRange) {
        const delta = this.deltas.get(this.selectedDeltaId);
        if (delta instanceof TextDelta) {
          const idx = delta.getCharIndexAt(
            // @ts-ignore
            this.layerManager.canvasLayer.ctx,
            x, y, this.options.mode || 'vertical',
            this.layerManager.canvasLayer.width,
            this.layerManager.canvasLayer.height
          );
          if (idx !== -1) {
            this.selectionRange.end = idx;
            this.refresh();
          }
        }
        return;
      }

      // --- Drag mode ---
      if (isDragging && this.selectedDeltaId) {
        const dx = x - lastX;
        const dy = y - lastY;
        const delta = this.deltas.get(this.selectedDeltaId);
        if (delta) {
          delta.move(dx, dy);
          this.refresh();
        }
        lastX = x;
        lastY = y;
        return;
      }

      // --- Hover: show resize cursor on handles ---
      const handle = this.layerManager.interactionLayer.hitTestHandle(x, y);
      this.options.container.style.cursor = handle
        ? InteractionLayer.getCursor(handle)
        : 'default';
    });

    this.options.container.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
      isSelectingText = false;
      activeHandle = null;
      resizeStartRect = null;
      resizeStartMouse = null;
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

      // Draw text selection
      if (selectedDelta instanceof TextDelta && this.selectionRange) {
        const s = Math.min(this.selectionRange.start, this.selectionRange.end);
        const e = Math.max(this.selectionRange.start, this.selectionRange.end);
        // Inclusive - Inclusive (Character Box Selection)
        const rects = selectedDelta.getRectsForRange(
          // @ts-ignore
          this.layerManager.canvasLayer.ctx,
          s,
          e + 1,
          mode,
          this.layerManager.canvasLayer.width,
          this.layerManager.canvasLayer.height
        );
        this.layerManager.interactionLayer.drawTextSelection(rects);
      }
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
        fontFamily: this.currentFont
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

  /**
   * 设置所有文本的字体
   */
  public setFont(fontFamily: string): void {
    this.currentFont = fontFamily;
    this.deltas.forEach(delta => {
      if (delta instanceof TextDelta) {
        delta.fontFamily = fontFamily;
      }
    });
    this.refresh();
  }

  /**
   * 添加文本框到画布
   * @param content 初始文本内容
   * @param x 初始X位置
   * @param y 初始Y位置
   */
  public addText(content?: string, x?: number, y?: number): void {
    const padding = this.options.padding || 60;
    const textDelta = new TextDelta({
      id: `text-${Date.now()}`,
      type: 'text' as any,
      x: x ?? padding + 20,
      y: y ?? padding + 20,
      width: 100,
      height: 200,
      content: content || '在此输入…',
      fontFamily: this.currentFont,
      fontSize: 28,
    });
    this.deltas.add(textDelta);
    // Select the new text box
    this.deltas.forEach(d => d.selected = false);
    textDelta.selected = true;
    this.selectedDeltaId = textDelta.id;
    this.selectionRange = null;
    // Sync input bridge so user can type immediately
    if (this.inputElement) {
      this.inputElement.value = textDelta.content;
      setTimeout(() => this.inputElement?.focus(), 0);
    }
    this.refresh();
  }

  /**
   * 添加图片到画布
   * @param src 图片地址或 Data URI
   * @param x 初始X位置
   * @param y 初始Y位置
   */
  public addImage(src: string, x?: number, y?: number): void {
    const padding = this.options.padding || 60;
    const imgDelta = new ImageDelta(
      {
        id: `img-${Date.now()}`,
        x: x ?? padding,
        y: y ?? padding,
        width: 0,  // Will be set after load from natural size
        height: 0,
        src,
      },
      () => {
        // Callback when image finishes loading – re-render
        this.refresh();
      },
    );
    this.deltas.add(imgDelta);
    this.selectedDeltaId = imgDelta.id;
    imgDelta.selected = true;
    this.refresh();
  }

  public applyStyleToSelection(style: Partial<CharStyle>): void {
    if (this.selectedDeltaId && this.selectionRange) {
      const delta = this.deltas.get(this.selectedDeltaId);
      if (delta instanceof TextDelta) {
        const { start, end } = this.selectionRange;
        // Selection is inclusive of character boxes.
        // applyStyleToContent expects exclusive end index for slice logic.
        const s = Math.min(start, end);
        const e = Math.max(start, end) + 1;

        delta.fragments = applyStyleToContent(
          delta.fragments, s, e, style
        );
        this.refresh();
      }
    }
  }


  public getSelectionStyle(): Partial<CharStyle> | null {
    if (this.selectedDeltaId && this.selectionRange) {
      const delta = this.deltas.get(this.selectedDeltaId);
      if (delta instanceof TextDelta) {
        const index = Math.min(this.selectionRange.start, this.selectionRange.end);
        return delta.getStyleAt(index);
      }
    }
    return null;
  }
}