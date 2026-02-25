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

        // Pointer Interaction Delegated to activeState (supports mouse & touch)
        eventBase.addEventListener('pointerdown', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onMouseDown(e as MouseEvent);
        }) as EventListener);

        eventBase.addEventListener('pointermove', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onMouseMove(e as MouseEvent);
        }) as EventListener);

        eventBase.addEventListener('pointerup', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onMouseUp(e as MouseEvent);
        }) as EventListener);

        eventBase.addEventListener('pointercancel', ((e: Event) => {
            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onMouseUp(e as MouseEvent);
        }) as EventListener);

        // [Infinite Panning / Zooming] Wheel Support (Trackpad/Mouse Wheel)
        eventBase.addEventListener('wheel', ((e: WheelEvent) => {
            if (e.ctrlKey) {
                // Desktop Pinch-to-Zoom or Ctrl + Wheel
                e.preventDefault();
                // e.deltaY is negative when zooming in (scrolling up), positive when zooming out (scrolling down)
                const zoomFactor = -e.deltaY * 0.01;
                // e.g., if deltaY is -100, zoomFactor = 1 -> newScale = oldScale * (1 + 1) -> zoomed x2.
                // However, a smoother formula is Math.exp
                const scaleMulti = Math.exp(zoomFactor);
                this.editor.viewportManager.zoomBy(scaleMulti, e.clientX, e.clientY);
                this.editor.refresh();
                return;
            }

            const activeState = this.editor.getActiveState();
            if (activeState) activeState.onWheel(e);
        }) as EventListener, { passive: false });

        // [Mobile Pinch-to-Zoom] Touch Events
        let initialPinchDistance = 0;
        let isPinching = false;

        eventBase.addEventListener('touchstart', ((e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                isPinching = true;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDistance = Math.hypot(dx, dy);
            }
        }) as EventListener, { passive: false });

        eventBase.addEventListener('touchmove', ((e: TouchEvent) => {
            if (e.touches.length === 2 && isPinching) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.hypot(dx, dy);

                if (initialPinchDistance > 0) {
                    const scaleMulti = currentDistance / initialPinchDistance;
                    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                    this.editor.viewportManager.zoomBy(scaleMulti, centerX, centerY);
                    this.editor.refresh();
                }

                initialPinchDistance = currentDistance;
            }
        }) as EventListener, { passive: false });

        eventBase.addEventListener('touchend', ((e: TouchEvent) => {
            if (e.touches.length < 2) {
                isPinching = false;
            }
        }) as EventListener);

        // Track currently pressed keys for smooth diagonal movement
        const activeKeys = new Set<string>();
        let nudgingFrameId: number | null = null;
        let isShiftDown = false;
        let lastNudgeTime = 0;
        let isFirstNudge = true;

        const performNudge = () => {
            if (this.editor.selectionManager.selectedDeltaId) {
                const delta = this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId);
                if (delta) {
                    const step = isShiftDown ? 10 : 1;
                    let moved = false;

                    if (activeKeys.has('ArrowUp')) {
                        delta.y -= step;
                        moved = true;
                    }
                    if (activeKeys.has('ArrowDown')) {
                        delta.y += step;
                        moved = true;
                    }
                    if (activeKeys.has('ArrowLeft')) {
                        delta.x -= step;
                        moved = true;
                    }
                    if (activeKeys.has('ArrowRight')) {
                        delta.x += step;
                        moved = true;
                    }

                    if (moved) {
                        this.editor.refresh();
                    }
                }
            }
        };

        const startNudging = () => {
            if (nudgingFrameId !== null) return; // already looping

            isFirstNudge = true;
            lastNudgeTime = performance.now();
            performNudge(); // Move immediately on first key down

            const tick = (now: DOMHighResTimeStamp) => {
                if (activeKeys.size === 0) {
                    nudgingFrameId = null;
                    return;
                }

                // Simulate OS key repeat behavior: initial delay of 250ms, then move every ~40ms
                const delay = isFirstNudge ? 250 : 40;

                if (now - lastNudgeTime >= delay) {
                    isFirstNudge = false;
                    performNudge();
                    lastNudgeTime = now;
                }

                nudgingFrameId = requestAnimationFrame(tick);
            };

            nudgingFrameId = requestAnimationFrame(tick);
        };

        const stopNudging = () => {
            if (activeKeys.size === 0 && nudgingFrameId !== null) {
                cancelAnimationFrame(nudgingFrameId);
                nudgingFrameId = null;
            }
        };

        window.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') isShiftDown = false;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                activeKeys.delete(e.key);
                stopNudging();
            }
        });

        // Keyboard shortcuts for Undo/Redo & Nudging
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') isShiftDown = true;

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
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                if (this.editor.selectionManager.selectedDeltaId) {
                    activeKeys.add(e.key);
                    startNudging();
                    e.preventDefault(); // Prevent page scrolling
                    return;
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
