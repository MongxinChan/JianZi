import { Editor } from '../Editor';
import { Delta } from '../model/Delta';

/**
 * 代表一次可撤销/重做的编辑操作
 */
export interface Operation {
    /** 撤销该操作 */
    undo(editor: Editor): void;
    /** 重做该操作 */
    redo(editor: Editor): void;
}

/**
 * 获取 Delta 的深拷贝数据，用于历史记录还原
 */
function cloneDelta(delta: Delta): Delta {
    // 假设 Delta 的构造函数可以接受自身作为参数进行克隆
    // 这里因为是针对 JianZi 的定制实现，我们需要根据类型来 clone
    // JianZi 目前没有直接提供 clone()，我们通过原型或重新实例化来简单处理

    // @ts-ignore
    const Constructor = delta.constructor as any;
    const cloned = new Constructor(delta);

    // 特殊属性拷贝
    if (delta.type === 'text') {
        // @ts-ignore
        cloned.fragments = JSON.parse(JSON.stringify(delta.fragments));
        // @ts-ignore
        cloned.layoutConstraintW = delta.layoutConstraintW;
        // @ts-ignore
        cloned.layoutConstraintH = delta.layoutConstraintH;
    }

    return cloned;
}


/**
 * 属性更新操作 (移动、Resize、修改文本/颜色等)
 */
export class UpdateOp implements Operation {
    private deltaId: string;
    private oldState: Partial<Delta>;
    private newState: Partial<Delta>;

    constructor(deltaId: string, oldState: Partial<Delta>, newState: Partial<Delta>) {
        this.deltaId = deltaId;
        // 深拷贝关键属性防止被引用污染
        this.oldState = JSON.parse(JSON.stringify(oldState));
        this.newState = JSON.parse(JSON.stringify(newState));
    }

    undo(editor: Editor): void {
        const delta = editor.deltas.get(this.deltaId);
        if (delta) {
            Object.assign(delta, this.oldState);
            editor.refresh();
        }
    }

    redo(editor: Editor): void {
        const delta = editor.deltas.get(this.deltaId);
        if (delta) {
            Object.assign(delta, this.newState);
            editor.refresh();
        }
    }
}

/**
 * 添加图元操作
 */
export class AddOp implements Operation {
    private delta: Delta;

    constructor(delta: Delta) {
        this.delta = cloneDelta(delta);
    }

    undo(editor: Editor): void {
        editor.deltas.remove(this.delta.id);
        editor.selectedDeltaId = null;
        editor.refresh();
    }

    redo(editor: Editor): void {
        const cloned = cloneDelta(this.delta);
        editor.deltas.add(cloned);
        editor.selectedDeltaId = cloned.id;
        cloned.selected = true;
        editor.refresh();
    }
}

/**
 * 删除图元操作
 */
export class RemoveOp implements Operation {
    private delta: Delta;

    constructor(delta: Delta) {
        this.delta = cloneDelta(delta);
    }

    undo(editor: Editor): void {
        const cloned = cloneDelta(this.delta);
        editor.deltas.add(cloned);
        editor.selectedDeltaId = cloned.id;
        cloned.selected = true;
        editor.refresh();
    }

    redo(editor: Editor): void {
        editor.deltas.remove(this.delta.id);
        editor.selectedDeltaId = null;
        editor.refresh();
    }
}
