import { Editor } from '../Editor';
import { BaseToolState } from './ToolState';

export class GrabState extends BaseToolState {
    private isPanning = false;
    private startPan: { x: number; y: number } = { x: 0, y: 0 };
    private startScroll: { left: number; top: number } = { left: 0, top: 0 };

    // Performance optimization: throttling translation requests
    private animationFrameId: number | null = null;
    private targetX = 0;
    private targetY = 0;

    constructor(editor: Editor) {
        super(editor);
        // Bind methods to ensure correct 'this' context when used as listeners
        this.onMouseMoveGlobal = this.onMouseMoveGlobal.bind(this);
        this.onMouseUpGlobal = this.onMouseUpGlobal.bind(this);
    }

    onEnable(): void {
        const target = this.editor.getOptions().eventTarget || this.editor.getOptions().container;
        if (target instanceof HTMLElement) {
            target.style.cursor = 'grab';
        }
    }

    onDisable(): void {
        const target = this.editor.getOptions().eventTarget || this.editor.getOptions().container;
        if (target instanceof HTMLElement) {
            target.style.cursor = 'default';
        }
        this.unbindGlobalEvents();
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    onWheel(e: WheelEvent): void {
        if (e.ctrlKey) {
            // Placeholder: Zoom logic can go here in the future
            return;
        }

        e.preventDefault();
        const dx = -e.deltaX;
        const dy = -e.deltaY;

        this.translateImmediately(dx, dy);
    }

    onMouseDown(e: MouseEvent): void {
        const target = this.editor.getOptions().eventTarget || this.editor.getOptions().container;
        if (target instanceof HTMLElement) {
            target.style.cursor = 'grabbing';
        }

        this.isPanning = true;
        this.startPan = { x: e.clientX, y: e.clientY };

        const currentTransform = this.editor.viewportManager.getTransform();
        this.startScroll = { left: currentTransform.x, top: currentTransform.y };

        this.bindGlobalEvents();
    }

    private bindGlobalEvents() {
        document.addEventListener('mousemove', this.onMouseMoveGlobal);
        document.addEventListener('mouseup', this.onMouseUpGlobal);
    }

    private unbindGlobalEvents() {
        document.removeEventListener('mousemove', this.onMouseMoveGlobal);
        document.removeEventListener('mouseup', this.onMouseUpGlobal);
    }

    private onMouseMoveGlobal(e: MouseEvent): void {
        if (!this.isPanning) return;

        const dx = e.clientX - this.startPan.x;
        const dy = e.clientY - this.startPan.y;

        this.targetX = this.startScroll.left + dx;
        this.targetY = this.startScroll.top + dy;

        this.scheduleTranslate();
    }

    private scheduleTranslate() {
        if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(() => {
                this.editor.viewportManager.setTransform(this.targetX, this.targetY);
                this.animationFrameId = null;
            });
        }
    }

    private translateImmediately(dx: number, dy: number) {
        const currentTransform = this.editor.viewportManager.getTransform();
        this.editor.viewportManager.setTransform(
            currentTransform.x + dx,
            currentTransform.y + dy
        );
    }

    private onMouseUpGlobal(e: MouseEvent): void {
        if (!this.isPanning) return;

        this.isPanning = false;
        const target = this.editor.getOptions().eventTarget || this.editor.getOptions().container;

        // Reset cursor to grab mode since we are still in hand tool
        if (this.editor.toolMode === 'hand' && target instanceof HTMLElement) {
            target.style.cursor = 'grab';
        }

        this.unbindGlobalEvents();
    }

    // Since we bind to document for move/up, we don't strictly need these, but we keep them to satisfy interface
    onMouseMove(e: MouseEvent): void { }
    onMouseUp(e: MouseEvent): void { }
}
