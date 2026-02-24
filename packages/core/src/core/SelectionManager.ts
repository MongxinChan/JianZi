import { Editor } from '../Editor';
import { Delta, TextDelta } from '../model/Delta';
import { CharStyle } from '../model/RichText';
import { applyStyleToContent } from '../model/RichText';
import { UpdateOp } from '../history/Operation';

export class SelectionManager {
    private editor: Editor;
    public selectedDeltaId: string | null = null;
    public selectionRange: { start: number; end: number } | null = null;
    public caretElement: HTMLDivElement | null = null;

    constructor(editor: Editor) {
        this.editor = editor;
        this.initCaret();
    }

    private initCaret(): void {
        const caret = document.createElement('div');
        Object.assign(caret.style, {
            position: 'absolute',
            pointerEvents: 'none',
            backgroundColor: '#1890ff',
            zIndex: '20',
            display: 'none',
            animation: 'caret-blink 1s step-end infinite'
        });
        this.editor.getOptions().container.appendChild(caret);
        this.caretElement = caret;

        if (!document.getElementById('caret-blink-style')) {
            const style = document.createElement('style');
            style.id = 'caret-blink-style';
            style.innerHTML = `@keyframes caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`;
            document.head.appendChild(style);
        }
    }

    public get selectedDelta() {
        if (this.selectedDeltaId) {
            return this.editor.deltas.get(this.selectedDeltaId);
        }
        return null;
    }

    public drawSelection(): void {
        if (this.caretElement) {
            this.caretElement.style.display = 'none';
        }

        const mode = this.editor.getOptions().mode || 'vertical';
        const delta = this.selectedDelta;
        if (delta) {
            // @ts-ignore (Assuming Editor's InteractionLayer is accessible)
            this.editor.getLayerManager().interactionLayer.drawSelection(delta.getRect());

            // Draw text selection
            if (delta instanceof TextDelta && this.selectionRange) {
                const s = Math.min(this.selectionRange.start, this.selectionRange.end);
                const e = Math.max(this.selectionRange.start, this.selectionRange.end);

                if (s === e) {
                    // @ts-ignore
                    const caretRect = delta.getCaretRect(this.editor.getLayerManager().canvasLayer.ctx, s, mode, this.editor.getLayerManager().canvasLayer.width, this.editor.getLayerManager().canvasLayer.height);
                    if (caretRect && this.caretElement && this.editor.toolMode === 'select') {
                        this.caretElement.style.display = 'block';
                        this.caretElement.style.left = `${caretRect.x}px`;
                        this.caretElement.style.top = `${caretRect.y}px`;
                        this.caretElement.style.width = `${caretRect.width}px`;
                        this.caretElement.style.height = `${caretRect.height}px`;
                    }
                } else {
                    // Inclusive - Inclusive (Character Box Selection)
                    const rects = delta.getRectsForRange(
                        // @ts-ignore
                        this.editor.getLayerManager().canvasLayer.ctx,
                        s,
                        e + 1,
                        mode,
                        this.editor.getLayerManager().canvasLayer.width,
                        this.editor.getLayerManager().canvasLayer.height
                    );
                    this.editor.getLayerManager().interactionLayer.drawTextSelection(rects);
                }
            }
        }
    }

    public setFont(fontFamily: string): void {
        this.editor.currentFont = fontFamily;

        const delta = this.selectedDelta;
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
                    // Cursor mode: Insert style
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
            this.editor.history.push([new UpdateOp(delta.id, oldState, newState)]);
        }

        this.editor.refresh();
    }

    public applyStyleToSelection(style: Partial<CharStyle>): void {
        const delta = this.selectedDelta;
        if (delta instanceof TextDelta && this.selectionRange) {
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
            this.editor.history.push([new UpdateOp(delta.id, oldState, newState)]);

            this.editor.refresh();
        }
    }

    public getSelectionStyle(): Partial<CharStyle> | null {
        const delta = this.selectedDelta;
        if (delta instanceof TextDelta && this.selectionRange) {
            const start = Math.min(this.selectionRange.start, this.selectionRange.end);
            const end = Math.max(this.selectionRange.start, this.selectionRange.end);
            if (start === end) {
                return delta.getStyleAt(start);
            }
            return delta.getCommonStyle(start, end);
        }
        return null;
    }
}
