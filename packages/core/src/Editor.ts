import { JianZiOptions } from './types';
import { DeltaSet } from './model/DeltaSet';
import { Delta, TextDelta, ImageDelta } from './model/Delta';
import { LayerManager } from './core/LayerManager';
import { InteractionLayer } from './core/InteractionLayer';
import { applyStyleToContent, CharStyle } from './model/RichText';
import { ToolState } from './state/ToolState';
import { GrabState } from './state/GrabState';
import { SelectState } from './state/SelectState';
import { HistoryManager } from './history/HistoryManager';
import { AddOp, UpdateOp } from './history/Operation';

/**
 * 编辑器交互类：负责处理用户输入、状态管理与渲染同步
 */
export class Editor {
  private layerManager: LayerManager;
  public deltas: DeltaSet;
  private options: JianZiOptions;
  private inputElement: HTMLTextAreaElement | null = null;
  private caretElement: HTMLDivElement | null = null;
  public selectedDeltaId: string | null = null;
  public selectionRange: { start: number; end: number } | null = null;
  private currentFont: string = "'STKaiti', 'KaiTi', serif";
  public toolMode: 'select' | 'hand' = 'select';
  // [Infinite Panning]
  private viewportTransform = { x: 0, y: 0, scale: 1 };

  // States
  private states: Record<string, ToolState> = {};
  private activeState: ToolState | null = null;

  // History
  public history: HistoryManager;

  constructor(options: JianZiOptions) {
    this.options = options;
    this.deltas = new DeltaSet();
    this.layerManager = new LayerManager(options);
    this.history = new HistoryManager(this);

    // Initialize states
    this.states = {
      'select': new SelectState(this),
      'hand': new GrabState(this)
    };

    this.initInputBridge();
    this.setTool('select');
  }

  public getViewportTransform() {
    return this.viewportTransform;
  }

  public setViewportTransform(x: number, y: number, scale?: number) {
    this.viewportTransform.x = x;
    this.viewportTransform.y = y;
    if (scale !== undefined) this.viewportTransform.scale = scale;
    this.updateViewportTransform();
  }

  public getLayerManager() {
    return this.layerManager;
  }

  public getInputElement() {
    return this.inputElement;
  }

  // [Infinite Panning]
  private updateViewportTransform(): void {
    const { x, y, scale } = this.viewportTransform;
    // Apply transform to parent (.canvas-container) if eventTarget is used, 
    // to preserve the .canvas-container's role as the moving wrapper.
    const target = (this.options.eventTarget && this.options.container.parentElement)
      ? this.options.container.parentElement
      : this.options.container;

    target.style.transform =
      `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
  }

  public setTool(mode: 'select' | 'hand'): void {
    if (this.toolMode === mode && this.activeState) return;

    if (this.activeState) {
      this.activeState.onDisable();
    }

    this.toolMode = mode;
    this.activeState = this.states[mode];

    if (this.activeState) {
      this.activeState.onEnable();
    }
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
    this.history.clear();
    this.refresh();
  }

  public undo(): void {
    this.history.undo();
  }

  public redo(): void {
    this.history.redo();
  }

  /**
   * 导出当前画布内容为图片
   * @param scale 导出放大倍数，默认 3x (相当于 ~300 DPI) 以保证 PDF 和图片的绝对清晰度
   */
  public exportImage(scale: number = 3): string {
    const mode = this.options.mode || 'vertical';
    // @ts-ignore
    return this.layerManager.canvasLayer.exportHighRes(this.deltas, mode, scale);
  }

  /**
   * 序列化当前画布为 JSON 字符串
   */
  public exportJSON(): string {
    const deltas = this.deltas.getAll().map(d => {
      if (d instanceof TextDelta) {
        return {
          id: d.id,
          type: 'text',
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          fontFamily: d.fontFamily,
          fontSize: d.fontSize,
          layoutConstraintW: d.layoutConstraintW,
          layoutConstraintH: d.layoutConstraintH,
          fragments: d.fragments,
        };
      } else if (d instanceof ImageDelta) {
        return {
          id: d.id,
          type: 'image',
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          src: d.src,
          drawMode: d.drawMode,
          borderColor: d.borderColor,
          borderWidth: d.borderWidth,
        };
      }
      return null;
    }).filter(Boolean);

    const payload = {
      version: '1.0',
      canvas: {
        width: this.options.width,
        height: this.options.height,
        padding: this.options.padding ?? 60,
        mode: this.options.mode ?? 'vertical',
      },
      deltas,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * 从 JSON 字符串恢复画布内容
   */
  public loadJSON(json: string): void {
    try {
      const payload = JSON.parse(json);

      // Restore canvas size and options
      if (payload.canvas) {
        this.updateOptions({
          width: payload.canvas.width,
          height: payload.canvas.height,
          padding: payload.canvas.padding,
          mode: payload.canvas.mode,
        });
      }

      // Clear existing content
      this.deltas.clear();
      this.selectedDeltaId = null;
      this.selectionRange = null;
      this.history.clear();

      // Rebuild deltas
      for (const raw of payload.deltas ?? []) {
        if (raw.type === 'text') {
          const td = new TextDelta({
            id: raw.id,
            type: 'text' as any,
            x: raw.x,
            y: raw.y,
            width: raw.width,
            height: raw.height,
            fontFamily: raw.fontFamily,
            fontSize: raw.fontSize,
            fragments: raw.fragments,
          });
          td.layoutConstraintW = raw.layoutConstraintW ?? 0;
          td.layoutConstraintH = raw.layoutConstraintH ?? 0;
          this.deltas.add(td);
        } else if (raw.type === 'image') {
          const imgDelta = new ImageDelta(
            {
              id: raw.id,
              x: raw.x,
              y: raw.y,
              width: raw.width,
              height: raw.height,
              src: raw.src,
              drawMode: raw.drawMode ?? 'cover',
              borderColor: raw.borderColor ?? 'transparent',
              borderWidth: raw.borderWidth ?? 0,
            },
            () => this.refresh(),
          );
          this.deltas.add(imgDelta);
        }
      }

      this.refresh();
    } catch (e) {
      console.error('loadJSON: failed to parse JSON', e);
    }
  }

  /**
   * 动态更新编辑器配置
   */
  public updateOptions(newOptions: Partial<JianZiOptions>): void {
    const oldWidth = this.options.width;
    const oldHeight = this.options.height;

    // Mutate the original object so LayerManager and CanvasLayer keep the same reference
    Object.assign(this.options, newOptions);

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

    const caret = document.createElement('div');
    Object.assign(caret.style, {
      position: 'absolute',
      pointerEvents: 'none',
      backgroundColor: '#1890ff',
      zIndex: '20',
      display: 'none',
      animation: 'caret-blink 1s step-end infinite'
    });
    this.options.container.appendChild(caret);
    this.caretElement = caret;

    if (!document.getElementById('caret-blink-style')) {
      const style = document.createElement('style');
      style.id = 'caret-blink-style';
      style.innerHTML = `@keyframes caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`;
      document.head.appendChild(style);
    }

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

    document.addEventListener('selectionchange', () => {
      if (document.activeElement === input && this.selectedDeltaId && this.toolMode === 'select') {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (!this.selectionRange || this.selectionRange.start !== start || this.selectionRange.end !== end) {
          this.selectionRange = { start, end };
          this.refresh();
        }
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

    const eventBase = (this.options.eventTarget as HTMLElement | Window | Document) || this.options.container;

    // Mouse Interaction Delegated to activeState
    eventBase.addEventListener('mousedown', ((e: Event) => {
      // Only process layout logic if clicking outside active layers? Handled in SelectState.
      if (this.activeState) this.activeState.onMouseDown(e as MouseEvent);
    }) as EventListener);

    eventBase.addEventListener('mousemove', ((e: Event) => {
      if (this.activeState) this.activeState.onMouseMove(e as MouseEvent);
    }) as EventListener);

    eventBase.addEventListener('mouseup', ((e: Event) => {
      if (this.activeState) this.activeState.onMouseUp(e as MouseEvent);
    }) as EventListener);

    // [Infinite Panning] Wheel Support (Trackpad/Mouse Wheel)
    eventBase.addEventListener('wheel', ((e: Event) => {
      if (this.activeState) this.activeState.onWheel(e as WheelEvent);
    }) as EventListener, { passive: false });

    // Keyboard shortcuts for Undo/Redo & Nudging
    window.addEventListener('keydown', (e) => {
      // Identify if the keydown happened while our hidden bridge textarea has focus
      const target = e.target as HTMLElement;
      const isOurTextarea = target === this.inputElement;

      // Ignore if user is typing in generic page inputs
      if (target && target.tagName === 'INPUT') {
        return;
      }

      if (target && target.tagName === 'TEXTAREA') {
        // If it's our hidden textarea, only ignore arrow keys if the user is actively editing text inside it
        if (isOurTextarea && this.selectionRange !== null) {
          return;
        }
        // If it's some other random textarea on the page, ignore it entirely
        if (!isOurTextarea) {
          return;
        }
      }

      // Arrow keys to nudge selection
      if (this.selectedDeltaId) {
        const delta = this.deltas.get(this.selectedDeltaId);
        if (delta) {
          const step = e.shiftKey ? 10 : 1;
          let moved = false;
          switch (e.key) {
            case 'ArrowUp':
              delta.y -= step;
              moved = true;
              break;
            case 'ArrowDown':
              delta.y += step;
              moved = true;
              break;
            case 'ArrowLeft':
              delta.x -= step;
              moved = true;
              break;
            case 'ArrowRight':
              delta.x += step;
              moved = true;
              break;
          }
          if (moved) {
            this.refresh();
            // Optional: push to history (debounced or on keyup ideally, but fine for now if omitted for small nudges)
            e.preventDefault();
            return;
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        this.redo();
        e.preventDefault();
      }
    });
  }

  public refresh(): void {
    const mode = this.options.mode || 'vertical';
    this.layerManager.render(this.deltas, mode);
    // Draw interaction layer (Selection box)
    this.layerManager.interactionLayer.clear();

    if (this.caretElement) {
      this.caretElement.style.display = 'none';
    }

    const selectedDelta = this.selectedDeltaId ? this.deltas.get(this.selectedDeltaId) : null;
    if (selectedDelta) {
      // @ts-ignore
      this.layerManager.interactionLayer.drawSelection(selectedDelta.getRect());

      // Draw text selection
      if (selectedDelta instanceof TextDelta && this.selectionRange) {
        const s = Math.min(this.selectionRange.start, this.selectionRange.end);
        const e = Math.max(this.selectionRange.start, this.selectionRange.end);

        if (s === e) {
          // @ts-ignore
          const caretRect = selectedDelta.getCaretRect(this.layerManager.canvasLayer.ctx, s, mode, this.layerManager.canvasLayer.width, this.layerManager.canvasLayer.height);
          if (caretRect && this.caretElement && this.toolMode === 'select') {
            this.caretElement.style.display = 'block';
            this.caretElement.style.left = `${caretRect.x}px`;
            this.caretElement.style.top = `${caretRect.y}px`;
            this.caretElement.style.width = `${caretRect.width}px`;
            this.caretElement.style.height = `${caretRect.height}px`;
          }
        } else {
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
  /**
   * 设置字体 (支持选区操作)
   */
  public setFont(fontFamily: string): void {
    this.currentFont = fontFamily;

    if (this.selectedDeltaId) {
      const delta = this.deltas.get(this.selectedDeltaId);
      if (delta instanceof TextDelta) {
        // Deep copy old state of text delta manually since it has nested objects
        const oldState = {
          fontFamily: delta.fontFamily,
          fragments: JSON.parse(JSON.stringify(delta.fragments))
        } as Partial<Delta>;

        // Mode 1: Text Editing (Range Selection)
        if (this.selectionRange) {
          const start = Math.min(this.selectionRange.start, this.selectionRange.end);
          const end = Math.max(this.selectionRange.start, this.selectionRange.end);

          if (start < end) {
            delta.applyStyle(start, end, { fontFamily });
          } else {
            // Cursor mode: Insert style? 
            // For now just update currentFont implies next char will use it (if logic in handleInput uses currentFont)
          }
        }
        // Mode 2: Object Selection (No active text editing range)
        else {
          // Apply to whole text
          delta.applyStyle(0, delta.content.length, { fontFamily });
          // Also update fallback
          delta.fontFamily = fontFamily;
        }

        const newState = {
          fontFamily: delta.fontFamily,
          fragments: JSON.parse(JSON.stringify(delta.fragments))
        } as Partial<Delta>;
        this.history.push([new UpdateOp(delta.id, oldState, newState)]);
      }
    }

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
    this.history.push([new AddOp(textDelta)]);
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
    this.history.push([new AddOp(imgDelta)]);
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

        const oldState = { fragments: JSON.parse(JSON.stringify(delta.fragments)) } as Partial<Delta>;

        delta.fragments = applyStyleToContent(
          delta.fragments, s, e, style
        );

        const newState = { fragments: JSON.parse(JSON.stringify(delta.fragments)) } as Partial<Delta>;
        this.history.push([new UpdateOp(delta.id, oldState, newState)]);

        this.refresh();
      }
    }
  }


  public getSelectionStyle(): Partial<CharStyle> | null {
    if (this.selectedDeltaId && this.selectionRange) {
      const delta = this.deltas.get(this.selectedDeltaId);
      if (delta instanceof TextDelta) {
        const start = Math.min(this.selectionRange.start, this.selectionRange.end);
        const end = Math.max(this.selectionRange.start, this.selectionRange.end);
        if (start === end) {
          return delta.getStyleAt(start);
        }
        return delta.getCommonStyle(start, end);
      }
    }
    return null;
  }
}