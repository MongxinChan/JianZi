import { Editor } from '../Editor';
import { BaseToolState } from './ToolState';
import { TextDelta, ImageDelta, Delta } from '../model/Delta';
import { InteractionLayer } from '../core/InteractionLayer';
import { UpdateOp } from '../history/Operation';

export class SelectState extends BaseToolState {
    private isDragging = false;
    private isResizing = false;
    private isSelectingText = false;

    private activeHandle: import('../core/InteractionLayer').HandleType = null;
    private lastMousePos = { x: 0, y: 0 };
    private dragStartRect: { x: number; y: number } | null = null;

    // Store original delta rect at the start of resize
    private resizeStartRect: { x: number; y: number; width: number; height: number; constraintW?: number; constraintH?: number } | null = null;
    private resizeStartMouse: { x: number; y: number } | null = null;

    constructor(editor: Editor) {
        super(editor);
        this.onMouseMoveGlobal = this.onMouseMoveGlobal.bind(this);
        this.onMouseUpGlobal = this.onMouseUpGlobal.bind(this);
    }

    onEnable(): void {
        this.editor.getOptions().container.style.cursor = 'default';
        this.resetState();
    }

    onDisable(): void {
        this.resetState();
        this.editor.selectionManager.selectedDeltaId = null;
        this.editor.selectionManager.selectionRange = null;
        this.editor.refresh();
    }

    private resetState() {
        this.isDragging = false;
        this.isResizing = false;
        this.isSelectingText = false;
        this.activeHandle = null;
        this.resizeStartRect = null;
        this.resizeStartMouse = null;
        this.unbindGlobalEvents();
    }

    private getMousePos(e: MouseEvent) {
        const container = this.editor.getOptions().container;
        const rect = container.getBoundingClientRect();
        const transform = this.editor.viewportManager.getTransform();
        const scale = transform.scale;
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        };
    }

    onMouseDown(e: MouseEvent): void {
        const pos = this.getMousePos(e);
        const { x, y } = pos;

        // 1) Check if we clicked on a resize handle of the currently selected delta
        if (this.editor.selectionManager.selectedDeltaId) {
            const handle = this.editor.getLayerManager().interactionLayer.hitTestHandle(x, y);
            if (handle) {
                this.isResizing = true;
                this.activeHandle = handle;
                const delta = this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId);
                if (delta) {
                    this.resizeStartRect = {
                        x: delta.x, y: delta.y, width: delta.width, height: delta.height,
                        constraintW: (delta as TextDelta).layoutConstraintW,
                        constraintH: (delta as TextDelta).layoutConstraintH
                    };
                    this.resizeStartMouse = { x, y };
                    this.bindGlobalEvents();
                }
                return; // Don't process as a regular click
            }
        }

        // 2) Check Text Selection (Click on selected text)
        const hitDelta = this.editor.deltas.hitTest(x, y);
        if (hitDelta && this.editor.selectionManager.selectedDeltaId === hitDelta.id && hitDelta instanceof TextDelta) {
            // @ts-ignore
            const ctx = this.editor.getLayerManager().canvasLayer.ctx;
            const mode = this.editor.getOptions().mode || 'vertical';
            const width = this.editor.getLayerManager().canvasLayer.width;
            const height = this.editor.getLayerManager().canvasLayer.height;

            const idx = hitDelta.getCharIndexAt(ctx, x, y, mode, width, height);

            if (idx !== -1) {
                this.isSelectingText = true;
                this.editor.selectionManager.selectionRange = { start: idx, end: idx };

                const inputElement = this.editor.getInputElement();
                if (inputElement) {
                    inputElement.setSelectionRange(idx, idx);
                    // Focus the input to ensure keyboard inputs are caught
                    setTimeout(() => inputElement.focus(), 0);
                }

                this.isDragging = false; // Prevent dragging
                this.editor.refresh();
                this.bindGlobalEvents();
                return;
            }
        }

        // 3) Otherwise, normal select/drag logic
        this.editor.deltas.forEach(d => d.selected = false);

        if (hitDelta) {
            hitDelta.selected = true;
            this.editor.selectionManager.selectedDeltaId = hitDelta.id;
            this.isDragging = true;
            this.lastMousePos = { x, y };
            this.dragStartRect = { x: hitDelta.x, y: hitDelta.y };
            this.editor.selectionManager.selectionRange = null; // Reset text selection on new delta select

            // Focus input if text (to allow editing)
            if (hitDelta.type === 'text') {
                const inputElement = this.editor.getInputElement();
                if (inputElement) {
                    inputElement.value = (hitDelta as TextDelta).content;
                    setTimeout(() => inputElement.focus(), 0);
                }
            }
            this.bindGlobalEvents();
        } else {
            this.editor.selectionManager.selectedDeltaId = null;
            this.editor.selectionManager.selectionRange = null;
            setTimeout(() => this.editor.getInputElement()?.focus(), 0);
        }

        this.editor.refresh();
    }

    private bindGlobalEvents() {
        document.addEventListener('mousemove', this.onMouseMoveGlobal);
        document.addEventListener('mouseup', this.onMouseUpGlobal);
    }

    private unbindGlobalEvents() {
        document.removeEventListener('mousemove', this.onMouseMoveGlobal);
        document.removeEventListener('mouseup', this.onMouseUpGlobal);
    }

    onMouseMove(e: MouseEvent): void {
        // --- Hover: show resize cursor on handles ---
        // (This happens locally on the container)
        if (this.isDragging || this.isResizing || this.isSelectingText) return;

        const pos = this.getMousePos(e);
        const handle = this.editor.getLayerManager().interactionLayer.hitTestHandle(pos.x, pos.y);

        this.editor.getOptions().container.style.cursor = handle
            ? InteractionLayer.getCursor(handle)
            : 'default';
    }

    private onMouseMoveGlobal(e: MouseEvent): void {
        const { x, y } = this.getMousePos(e);

        // --- Resize mode ---
        if (this.isResizing && this.editor.selectionManager.selectedDeltaId && this.resizeStartRect && this.resizeStartMouse && this.activeHandle) {
            const dx = x - this.resizeStartMouse.x;
            const dy = y - this.resizeStartMouse.y;
            const delta = this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId);
            if (!delta) return;

            const r = this.resizeStartRect;
            let newX = r.x, newY = r.y, newW = r.width, newH = r.height;

            switch (this.activeHandle) {
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

            // For ImageDelta: lock aspect ratio only on corner handles by default
            if (delta instanceof ImageDelta) {
                const isEdgeHandle = this.activeHandle === 'mr' || this.activeHandle === 'ml' || this.activeHandle === 'mt' || this.activeHandle === 'mb';

                if (!isEdgeHandle) {
                    const aspect = r.width / r.height;
                    if (this.activeHandle === 'br' || this.activeHandle === 'tl') {
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

                    // Recalculate position for TL/BL/TR handles based on locked ratio
                    if (this.activeHandle === 'tl') {
                        newX = r.x + r.width - newW;
                        newY = r.y + r.height - newH;
                    } else if (this.activeHandle === 'bl') {
                        newX = r.x + r.width - newW;
                    } else if (this.activeHandle === 'tr') {
                        newY = r.y + r.height - newH;
                    }
                }
            }

            delta.x = newX;
            delta.y = newY;
            delta.width = newW;
            delta.height = newH;

            // For text deltas, set layout constraints so text reflows within the resized area
            if (delta instanceof TextDelta) {
                delta.layoutConstraintW = newW;
                delta.layoutConstraintH = newH;
            }

            this.editor.refresh();
            return;
        }

        // --- Text Selection mode ---
        if (this.isSelectingText && this.editor.selectionManager.selectedDeltaId && this.editor.selectionManager.selectionRange) {
            const delta = this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId);
            if (delta instanceof TextDelta) {
                // @ts-ignore
                const ctx = this.editor.getLayerManager().canvasLayer.ctx;
                const mode = this.editor.getOptions().mode || 'vertical';
                const width = this.editor.getLayerManager().canvasLayer.width;
                const height = this.editor.getLayerManager().canvasLayer.height;

                const idx = delta.getCharIndexAt(ctx, x, y, mode, width, height);
                if (idx !== -1) {
                    this.editor.selectionManager.selectionRange.end = idx;

                    const inputElement = this.editor.getInputElement();
                    if (inputElement) {
                        const start = Math.min(this.editor.selectionManager.selectionRange.start, this.editor.selectionManager.selectionRange.end);
                        const end = Math.max(this.editor.selectionManager.selectionRange.start, this.editor.selectionManager.selectionRange.end);
                        inputElement.setSelectionRange(start, end, this.editor.selectionManager.selectionRange.start > this.editor.selectionManager.selectionRange.end ? "backward" : "forward");
                    }

                    this.editor.refresh();
                }
            }
            return;
        }

        // --- Drag mode ---
        if (this.isDragging && this.editor.selectionManager.selectedDeltaId) {
            const dx = x - this.lastMousePos.x;
            const dy = y - this.lastMousePos.y;
            const delta = this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId);

            if (delta) {
                delta.move(dx, dy);
                this.editor.refresh();
            }

            this.lastMousePos = { x, y };
            return;
        }
    }

    private onMouseUpGlobal(e: MouseEvent): void {
        const delta = this.editor.selectionManager.selectedDeltaId ? this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId) : null;

        // Record history for Drag
        if (this.isDragging && delta && this.dragStartRect) {
            if (delta.x !== this.dragStartRect.x || delta.y !== this.dragStartRect.y) {
                this.editor.history.push([new UpdateOp(
                    delta.id,
                    { x: this.dragStartRect.x, y: this.dragStartRect.y },
                    { x: delta.x, y: delta.y }
                )]);
            }
        }

        // Record history for Resize
        if (this.isResizing && delta && this.resizeStartRect) {
            if (delta.width !== this.resizeStartRect.width || delta.height !== this.resizeStartRect.height) {
                const oldState = {
                    x: this.resizeStartRect.x, y: this.resizeStartRect.y,
                    width: this.resizeStartRect.width, height: this.resizeStartRect.height
                };
                const newState = {
                    x: delta.x, y: delta.y,
                    width: delta.width, height: delta.height
                };

                if (delta instanceof TextDelta) {
                    // @ts-ignore
                    oldState.layoutConstraintW = this.resizeStartRect.constraintW || 0;
                    // @ts-ignore
                    oldState.layoutConstraintH = this.resizeStartRect.constraintH || 0;
                    // @ts-ignore
                    newState.layoutConstraintW = delta.layoutConstraintW;
                    // @ts-ignore
                    newState.layoutConstraintH = delta.layoutConstraintH;
                }

                this.editor.history.push([new UpdateOp(delta.id, oldState, newState)]);
            }
        }

        this.resetState();
        // Reset hover cursor
        this.onMouseMove(e);
    }
}
