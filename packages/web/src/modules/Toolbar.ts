import { jianzi } from './EditorInstance';

export function initToolbar() {
    // ============================================================
    // Tool Buttons
    // ============================================================
    const toolSelectBtn = document.getElementById('tool-select');
    const toolHandBtn = document.getElementById('tool-hand');

    function setActiveTool(mode: 'select' | 'hand') {
        jianzi.setTool(mode);
        toolSelectBtn?.classList.toggle('active', mode === 'select');
        toolHandBtn?.classList.toggle('active', mode === 'hand');
    }

    toolSelectBtn?.addEventListener('click', () => setActiveTool('select'));
    toolHandBtn?.addEventListener('click', () => setActiveTool('hand'));

    // ============================================================
    // Add Text / Add Image
    // ============================================================
    document.getElementById('add-text')?.addEventListener('click', () => {
        jianzi.addText();
    });

    const imageFileInput = document.getElementById('image-file-input') as HTMLInputElement;
    document.getElementById('add-image')?.addEventListener('click', () => imageFileInput?.click());

    imageFileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { jianzi.addImage(reader.result as string); };
        reader.readAsDataURL(file);
        (e.target as HTMLInputElement).value = '';
    });

    // ============================================================
    // Undo / Redo
    // ============================================================
    document.getElementById('undo')?.addEventListener('click', () => jianzi.undo());
    document.getElementById('redo')?.addEventListener('click', () => jianzi.redo());

    // ============================================================
    // Zoom Controls
    // ============================================================
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');

    const updateZoomLabel = () => {
        if (!zoomResetBtn) return;
        const scale = jianzi.viewportManager.getTransform().scale;
        zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
    };

    zoomInBtn?.addEventListener('click', () => {
        const t = jianzi.viewportManager.getTransform();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        jianzi.viewportManager.zoomBy(1.2, centerX, centerY);
        updateZoomLabel();
        jianzi.refresh();
    });

    zoomOutBtn?.addEventListener('click', () => {
        const t = jianzi.viewportManager.getTransform();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        jianzi.viewportManager.zoomBy(1 / 1.2, centerX, centerY);
        updateZoomLabel();
        jianzi.refresh();
    });

    zoomResetBtn?.addEventListener('click', () => {
        const t = jianzi.viewportManager.getTransform();
        jianzi.viewportManager.setTransform(t.x, t.y, 1);
        updateZoomLabel();
        jianzi.refresh();
    });

    // Since users can also zoom using trackpad/pinch gesture, 
    // we should occasionally update the label to keep it in sync.
    // A robust way would be listening to generic editor events, 
    // but a quick raf or simple hook works for now:
    let lastScale = 1;
    function checkZoomLoop() {
        const currentScale = jianzi.viewportManager.getTransform().scale;
        if (currentScale !== lastScale) {
            lastScale = currentScale;
            updateZoomLabel();
        }
        requestAnimationFrame(checkZoomLoop);
    }
    checkZoomLoop();
}
