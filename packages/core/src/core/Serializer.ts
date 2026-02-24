import { Editor } from '../Editor';
import { TextDelta, ImageDelta } from '../model/Delta';

export class Serializer {
    private editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    /**
     * 导出当前画布内容为图片
     * @param scale 导出放大倍数，默认 3x (相当于 ~300 DPI) 以保证 PDF 和图片的绝对清晰度
     */
    public exportImage(scale: number = 3): string {
        const options = this.editor.getOptions();
        const mode = options.mode || 'vertical';
        // @ts-ignore
        return this.editor.getLayerManager().canvasLayer.exportHighRes(this.editor.deltas, mode, scale);
    }

    /**
     * 序列化当前画布为 JSON 字符串
     */
    public exportJSON(): string {
        const options = this.editor.getOptions();
        const deltas = this.editor.deltas.getAll().map(d => {
            if (d instanceof TextDelta) {
                return {
                    id: d.id,
                    type: 'text',
                    x: d.x,
                    y: d.y,
                    width: d.width,
                    height: d.height,
                    fontFamily: d.fontFamily,
                    fontSize: d.fontSize,
                    layoutConstraintW: d.layoutConstraintW,
                    layoutConstraintH: d.layoutConstraintH,
                    fragments: d.fragments,
                };
            } else if (d instanceof ImageDelta) {
                return {
                    id: d.id,
                    type: 'image',
                    x: d.x,
                    y: d.y,
                    width: d.width,
                    height: d.height,
                    src: d.src,
                    drawMode: d.drawMode,
                    borderColor: d.borderColor,
                    borderWidth: d.borderWidth,
                };
            }
            return null;
        }).filter(Boolean);

        const payload = {
            version: '1.0',
            canvas: {
                width: options.width,
                height: options.height,
                padding: options.padding ?? 60,
                mode: options.mode ?? 'vertical',
            },
            deltas,
        };

        return JSON.stringify(payload, null, 2);
    }

    /**
     * 从 JSON 字符串恢复画布内容
     */
    public loadJSON(json: string): void {
        try {
            const payload = JSON.parse(json);

            // Restore canvas size and options
            if (payload.canvas) {
                this.editor.updateOptions({
                    width: payload.canvas.width,
                    height: payload.canvas.height,
                    padding: payload.canvas.padding,
                    mode: payload.canvas.mode,
                });
            }

            // Clear existing content
            this.editor.deltas.clear();
            this.editor.selectionManager.selectedDeltaId = null;
            this.editor.selectionManager.selectionRange = null;
            this.editor.history.clear();

            // Rebuild deltas
            for (const raw of payload.deltas ?? []) {
                if (raw.type === 'text') {
                    const td = new TextDelta({
                        id: raw.id,
                        type: 'text' as any,
                        x: raw.x,
                        y: raw.y,
                        width: raw.width,
                        height: raw.height,
                        fontFamily: raw.fontFamily,
                        fontSize: raw.fontSize,
                        fragments: raw.fragments,
                    });
                    td.layoutConstraintW = raw.layoutConstraintW ?? 0;
                    td.layoutConstraintH = raw.layoutConstraintH ?? 0;
                    this.editor.deltas.add(td);
                } else if (raw.type === 'image') {
                    const imgDelta = new ImageDelta(
                        {
                            id: raw.id,
                            x: raw.x,
                            y: raw.y,
                            width: raw.width,
                            height: raw.height,
                            src: raw.src,
                            drawMode: raw.drawMode ?? 'cover',
                            borderColor: raw.borderColor ?? 'transparent',
                            borderWidth: raw.borderWidth ?? 0,
                        },
                        () => this.editor.refresh(),
                    );
                    this.editor.deltas.add(imgDelta);
                }
            }

            this.editor.refresh();
        } catch (e) {
            console.error('loadJSON: failed to parse JSON', e);
        }
    }
}
