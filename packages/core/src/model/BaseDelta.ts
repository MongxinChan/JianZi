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

export type LayoutMode = 'vertical' | 'horizontal';
