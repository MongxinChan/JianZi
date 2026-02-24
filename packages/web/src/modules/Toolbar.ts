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
}
