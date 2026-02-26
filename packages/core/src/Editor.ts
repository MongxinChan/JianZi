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
import { ViewportManager } from './core/ViewportManager';
import { InputManager } from './core/InputManager';
import { SelectionManager } from './core/SelectionManager';
import { EventDispatcher } from './core/EventDispatcher';
import { Serializer } from './core/Serializer';

/**
 * 编辑器交互类：负责处理用户输入、状态管理与渲染同步
 */
export class Editor {
  private layerManager: LayerManager;
  public deltas: DeltaSet;
  private options: JianZiOptions;
  public inputManager: InputManager;
  public selectionManager: SelectionManager;
  public eventDispatcher: EventDispatcher;
  public serializer: Serializer;
  public currentFont: string = "'STKaiti', 'KaiTi', serif";
  public toolMode: 'select' | 'hand' = 'select';
  public viewportManager: ViewportManager;

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
    this.viewportManager = new ViewportManager(options);
    this.selectionManager = new SelectionManager(this);
    this.inputManager = new InputManager(this);
    this.eventDispatcher = new EventDispatcher(this);
    this.serializer = new Serializer(this);

    // Initialize states
    this.states = {
      'select': new SelectState(this),
      'hand': new GrabState(this)
    };

    this.setTool('select');
  }

  public getActiveState(): ToolState | null {
    return this.activeState;
  }

  public getLayerManager() {
    return this.layerManager;
  }

  public getInputElement() {
    return this.inputManager.inputElement;
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
    this.selectionManager.selectionRange = null;
    this.selectionManager.selectedDeltaId = null;
    if (this.inputManager) {
      this.inputManager.inputElement.value = '';
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
    return this.serializer.exportImage(scale);
  }

  /**
   * 序列化当前画布为 JSON 字符串
   */
  public exportJSON(): string {
    return this.serializer.exportJSON();
  }

  /**
   * 从 JSON 字符串恢复画布内容
   */
  public loadJSON(json: string): void {
    this.serializer.loadJSON(json);
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

  public refresh(): void {
    const mode = this.options.mode || 'vertical';
    this.layerManager.render(this.deltas, mode);
    // Draw interaction layer (Selection box)
    this.layerManager.interactionLayer.clear();
    this.selectionManager.drawSelection();
  }

  public setValue(val: string): void {
    if (this.inputManager) {
      this.inputManager.setValue(val);
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
   * 设置字体 (支持选区操作)
   */
  public setFont(fontFamily: string): void {
    this.selectionManager.setFont(fontFamily);
  }

  /**
   * 添加文本框到画布
   * @param content 初始文本内容
   * @param x 初始X位置
   * @param y 初始Y位置
   * @param zIndex 可选的Z轴层级
   */
  public addText(content?: string, x?: number, y?: number): void {
    const padding = this.options.padding || 60;
    const textDelta = new TextDelta({
      id: `text-${Date.now()}`,
      type: 'text' as any,
      x: x ?? padding,
      y: y ?? padding,
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
    this.selectionManager.selectedDeltaId = textDelta.id;
    this.selectionManager.selectionRange = null;
    // Sync input bridge so user can type immediately
    if (this.inputManager) {
      this.inputManager.setValue(textDelta.content);
      setTimeout(() => this.inputManager.inputElement.focus(), 0);
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
    this.selectionManager.selectedDeltaId = imgDelta.id;
    imgDelta.selected = true;
    this.refresh();
  }

  public applyStyleToSelection(style: Partial<CharStyle>): void {
    this.selectionManager.applyStyleToSelection(style);
  }

  public getSelectionStyle(): Partial<CharStyle> | null {
    return this.selectionManager.getSelectionStyle();
  }
}