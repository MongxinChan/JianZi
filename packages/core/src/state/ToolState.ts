import type { Editor } from '../Editor';

/**
 * 绘图/交互状态基类
 * 用于接管编辑器在不同模式下的鼠标、键盘事件
 */
export interface ToolState {
    /** 状态激活时的回调 */
    onEnable(): void;
    /** 状态关闭时的回调 */
    onDisable(): void;
    /** 鼠标按下 */
    onMouseDown(e: MouseEvent): void;
    /** 鼠标移动 */
    onMouseMove(e: MouseEvent): void;
    /** 鼠标抬起 */
    onMouseUp(e: MouseEvent): void;
    /** 滚轮事件 */
    onWheel(e: WheelEvent): void;
}

/**
 * 提供一个默认空实现的抽象类，方便子类继承
 */
export abstract class BaseToolState implements ToolState {
    constructor(protected editor: Editor) { }

    onEnable(): void { }
    onDisable(): void { }
    onMouseDown(e: MouseEvent): void { }
    onMouseMove(e: MouseEvent): void { }
    onMouseUp(e: MouseEvent): void { }
    onWheel(e: WheelEvent): void { }
}
