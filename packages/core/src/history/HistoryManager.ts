import { Operation } from './Operation';
import { Editor } from '../Editor';

export class HistoryManager {
    private undoStack: Operation[][] = [];
    private redoStack: Operation[][] = [];
    private STACK_SIZE = 100;
    private editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    public push(ops: Operation[]) {
        if (!ops || ops.length === 0) return;

        this.undoStack.push(ops);
        // Once we push a new operation, the redo stack is invalidated
        this.redoStack = [];

        if (this.undoStack.length > this.STACK_SIZE) {
            this.undoStack.shift();
        }
    }

    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    public undo() {
        if (!this.canUndo()) return;

        const ops = this.undoStack.pop();
        if (ops) {
            // Apply undo in reverse order
            for (let i = ops.length - 1; i >= 0; i--) {
                ops[i].undo(this.editor);
            }
            this.redoStack.push(ops);
        }
    }

    public redo() {
        if (!this.canRedo()) return;

        const ops = this.redoStack.pop();
        if (ops) {
            // Apply redo in normal order
            for (const op of ops) {
                op.redo(this.editor);
            }
            this.undoStack.push(ops);
        }
    }

    public clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}
