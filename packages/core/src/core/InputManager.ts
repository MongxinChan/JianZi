import { Editor } from '../Editor';
import { TextDelta } from '../model/Delta';

export class InputManager {
    private editor: Editor;
    public inputElement: HTMLTextAreaElement;
    private isComposing = false;

    constructor(editor: Editor) {
        this.editor = editor;
        this.inputElement = this.createInputElement();
        this.bindEvents();
    }

    private createInputElement(): HTMLTextAreaElement {
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
        return input;
    }

    private bindEvents() {
        this.inputElement.addEventListener('compositionstart', () => {
            this.isComposing = true;
        });

        this.inputElement.addEventListener('compositionend', (e) => {
            this.isComposing = false;
            this.handleInput((e.target as HTMLTextAreaElement).value);
        });

        this.inputElement.addEventListener('input', (e) => {
            if (!this.isComposing) {
                this.handleInput((e.target as HTMLTextAreaElement).value);
            }
        });

        // selectionchange is on document and checks activeElement
        // We keep it here since it relates to the inputElement's native selection
        document.addEventListener('selectionchange', () => {
            if (document.activeElement === this.inputElement && this.editor.selectionManager.selectedDeltaId && this.editor.toolMode === 'select') {
                const start = this.inputElement.selectionStart;
                const end = this.inputElement.selectionEnd;
                if (!this.editor.selectionManager.selectionRange || this.editor.selectionManager.selectionRange.start !== start || this.editor.selectionManager.selectionRange.end !== end) {
                    this.editor.selectionManager.selectionRange = { start, end };
                    this.editor.refresh();
                }
            }
        });
    }

    private handleInput(text: string) {
        if (this.editor.selectionManager.selectedDeltaId) {
            const delta = this.editor.deltas.get(this.editor.selectionManager.selectedDeltaId);
            if (delta instanceof TextDelta) {
                delta.content = text;
                this.editor.refresh();
            }
        } else {
            // If no selection, maybe creating a new text block?
            // For now, let's keep the "Main Text" behavior if nothing selected but canvas is empty
            if (this.editor.deltas.getAll().length === 0) {
                const textDelta = new TextDelta({
                    id: 'main-text',
                    x: this.editor.getOptions().padding || 60,
                    y: this.editor.getOptions().padding || 60,
                    width: 500,
                    height: 500,
                    type: 'text' as any,
                    content: text,
                    fontSize: 28,
                    fontFamily: this.editor.currentFont
                });
                this.editor.deltas.add(textDelta);
                this.editor.selectionManager.selectedDeltaId = textDelta.id; // Auto select
                this.editor.refresh();
            }
        }
    }

    public setValue(val: string) {
        this.inputElement.value = val;
    }
}
