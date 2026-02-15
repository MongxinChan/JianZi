export enum DeltaType {
    Text = 'text',
    Image = 'image',
    Rect = 'rect',
}

export interface DeltaLike {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: DeltaType;
}

export abstract class Delta {
    public id: string;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public type: DeltaType;
    public selected: boolean = false;

    constructor(attr: DeltaLike) {
        this.id = attr.id;
        this.x = attr.x;
        this.y = attr.y;
        this.width = attr.width;
        this.height = attr.height;
        this.type = attr.type;
    }

    abstract draw(ctx: CanvasRenderingContext2D): void;

    public getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }

    public move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }
}

export class TextDelta extends Delta {
    public content: string;
    public fontFamily: string;
    public fontSize: number;
    public lineHeight: number;
    public letterSpacing: number;

    constructor(attr: DeltaLike & { content: string; fontFamily?: string; fontSize?: number }) {
        super({ ...attr, type: DeltaType.Text });
        this.content = attr.content;
        this.fontFamily = attr.fontFamily || 'serif';
        this.fontSize = attr.fontSize || 28;
        this.lineHeight = 1.5;
        this.letterSpacing = 0;
    }

    measure(ctx: CanvasRenderingContext2D): { width: number; height: number } {
        ctx.save();
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const metrics = ctx.measureText(this.content);
        ctx.restore();
        return {
            width: metrics.width,
            height: this.fontSize * this.lineHeight, // Simple height
        };
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#2c3e50';

        // Update dimensions on draw (lazy update)
        // ideally we update this on content change
        const size = this.measure(ctx);
        this.width = size.width;
        this.height = size.height;

        // Simple rendering for now (no wrapping)
        ctx.fillText(this.content, this.x, this.y);

        // Draw selection box if selected
        if (this.selected) {
            ctx.strokeStyle = '#1890ff';
            ctx.lineWidth = 1;
            // Pad the selection box slightly
            const padding = 4;
            ctx.strokeRect(this.x - padding, this.y - padding, this.width + padding * 2, this.height + padding * 2);
        }

        ctx.restore();
    }
}
