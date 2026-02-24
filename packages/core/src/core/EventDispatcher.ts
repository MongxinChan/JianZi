import { Editor } from '../Editor';

export class EventDispatcher {
    private editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
        this.bindEvents();
    }

    private bindEvents(): void {
        const options = this.editor.getOptions();
        const eventBase = (options.eventTarget as HTMLElement | Window | Document) || options.container;

        // Mouse Interaction Delegated to activeState
        eventBase.addEventListener('mousedown', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onMouseDown(e as MouseEvent);
        }) as EventListener);

        eventBase.addEventListener('mousemove', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onMouseMove(e as MouseEvent);
        }) as EventListener);

        eventBase.addEventListener('mouseup', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onMouseUp(e as MouseEvent);
        }) as EventListener);

        // [Infinite Panning] Wheel Support (Trackpad/Mouse Wheel)
        eventBase.addEventListener('wheel', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onWheel(e as WheelEvent);
        }) as EventListener, { passive: false });

        // Keyboard shortcuts for Undo/Redo & Nudging
        window.addEventListener('keydown', (e) => {
            // Identify if the keydown happened while our hidden bridge textarea has focus
            const target = e.target as HTMLElement;
            const isOurTextarea = target === this.editor.inputManager.inputElement;

            // Ignore if user is typing in generic page inputs
            if (target && target.tagName === 'INPUT') {
                return;
            }

            if (target && target.tagName === 'TEXTAREA') {
                // If it's our hidden textarea, only ignore arrow keys if the user is actively editing text inside it
                if (isOurTextarea && this.editor.selectionManager.selectionRange !== null) {
                    return;
                }
                // If it's some other random textarea on the page, ignore it entirely
                if (!isOurTextarea) {
                    return;
                }
            }

            // Arrow keys to nudge selection
            if (this.editor.selectionManager.selectedDeltaId) {
                const delta = this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId);
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
                        this.editor.refresh();
                        // Optional: push to history (debounced or on keyup ideally, but fine for now if omitted for small nudges)
                        e.preventDefault();
                        return;
                    }
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) {
                    this.editor.redo();
                } else {
                    this.editor.undo();
                }
                e.preventDefault();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                this.editor.redo();
                e.preventDefault();
            }
        });
    }
}
