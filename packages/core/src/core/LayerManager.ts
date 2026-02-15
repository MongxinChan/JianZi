import { JianZiOptions } from '../types';
import { CanvasLayer } from './CanvasLayer';
import { InteractionLayer } from './InteractionLayer';
import { DeltaSet } from '../model/DeltaSet';

export class LayerManager {
    public canvasLayer: CanvasLayer;
    public interactionLayer: InteractionLayer;
    private container: HTMLElement;

    constructor(options: JianZiOptions) {
        this.container = options.container;
        // Ensure container is relative for absolute children
        this.container.style.position = 'relative';
        this.container.style.width = `${options.width}px`;
        this.container.style.height = `${options.height}px`;

        this.canvasLayer = new CanvasLayer(options);
        this.interactionLayer = new InteractionLayer(options);

        this.canvasLayer.mount(this.container);
        this.interactionLayer.mount(this.container);
    }

    public getContainer() {
        return this.container;
    }

    public render(deltas: DeltaSet) {
        this.canvasLayer.render(deltas);
    }

    public resize(width: number, height: number) {
        // Update container size to allow flex centering
        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;

        this.canvasLayer.resize(width, height);
        this.interactionLayer.resize(width, height);
    }
}
