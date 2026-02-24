import { jianzi } from './EditorInstance';
import { ImageDelta } from '@jianzi/core';

export function initRightPanel() {
    // ============================================================
    // Right Panel Toggle
    // ============================================================
    const rightPanel = document.getElementById('right-panel');
    const togglePanelBtn = document.getElementById('toggle-right-panel');

    togglePanelBtn?.addEventListener('click', () => {
        if (rightPanel) {
            const isOpen = rightPanel.classList.toggle('open');
            if (togglePanelBtn) {
                togglePanelBtn.textContent = isOpen ? '>' : '<';
            }
        }
    });

    // ============================================================
    // Canvas Size Controls
    // ============================================================
    const widthInput = document.getElementById('canvas-width') as HTMLInputElement;
    const heightInput = document.getElementById('canvas-height') as HTMLInputElement;

    function updateCanvasSize() {
        const w = parseInt(widthInput.value) || 500;
        const h = parseInt(heightInput.value) || 700;
        jianzi.updateOptions({ width: w, height: h });
    }

    widthInput?.addEventListener('change', updateCanvasSize);
    heightInput?.addEventListener('change', updateCanvasSize);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = (e.target as HTMLElement).closest('.preset-btn') as HTMLElement;
            const w = target?.getAttribute('data-w');
            const h = target?.getAttribute('data-h');
            if (w && h) {
                if (widthInput) widthInput.value = w;
                if (heightInput) heightInput.value = h;
                jianzi.updateOptions({ width: parseInt(w), height: parseInt(h) });
            }
        });
    });

    // Layout mode radios
    document.querySelectorAll('input[name="layout-mode"]').forEach(el => {
        el.addEventListener('change', (e) => {
            const mode = (e.target as HTMLInputElement).value as 'vertical' | 'horizontal';
            jianzi.updateOptions({ mode });
        });
    });

    const fontSelect = document.getElementById('font-family') as HTMLSelectElement;
    fontSelect?.addEventListener('change', () => jianzi.setFont(fontSelect.value));

    // Background color swatches
    document.querySelectorAll('.bg-color-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            document.querySelectorAll('.bg-color-swatch').forEach(s => s.classList.remove('active'));
            const target = e.target as HTMLElement;
            target.classList.add('active');
            const color = target.dataset.color || '#fdfaf5';
            jianzi.updateOptions({ backgroundColor: color });
        });
    });

    // Export Settings
    const watermarkCheck = document.getElementById('export-watermark') as HTMLInputElement;
    watermarkCheck?.addEventListener('change', () => {
        jianzi.updateOptions({ watermark: watermarkCheck.checked });
    });

    const dateSelect = document.getElementById('export-date') as HTMLSelectElement;
    dateSelect?.addEventListener('change', () => {
        jianzi.updateOptions({ dateDisplay: dateSelect.value as 'none' | 'gregorian' | 'lunar' });
    });

    const dateDayCheck = document.getElementById('export-date-day') as HTMLInputElement;
    dateDayCheck?.addEventListener('change', () => {
        jianzi.updateOptions({ dateIncludeDay: dateDayCheck.checked });
    });

    // Initial read for export settings
    jianzi.updateOptions({
        backgroundColor: '#fdfaf5',
        watermark: watermarkCheck?.checked ?? false,
        dateDisplay: (dateSelect?.value as 'none' | 'gregorian' | 'lunar') || 'none',
        dateIncludeDay: dateDayCheck?.checked ?? false
    });

    // ============================================================
    // Image Properties Panel
    // ============================================================
    const panelCanvas = document.getElementById('panel-canvas');
    const panelImage = document.getElementById('panel-image');

    function showImagePanel(delta: ImageDelta) {
        if (panelCanvas) panelCanvas.style.display = 'none';
        if (panelImage) panelImage.style.display = 'block';

        // Update coordinates
        document.getElementById('coord-tl')!.textContent = `[${Math.round(delta.x)}, ${Math.round(delta.y)}]`;
        document.getElementById('coord-tr')!.textContent = `[${Math.round(delta.x + delta.width)}, ${Math.round(delta.y)}]`;
        document.getElementById('coord-bl')!.textContent = `[${Math.round(delta.x)}, ${Math.round(delta.y + delta.height)}]`;
        document.getElementById('coord-br')!.textContent = `[${Math.round(delta.x + delta.width)}, ${Math.round(delta.y + delta.height)}]`;

        // Sync draw mode radios
        document.querySelectorAll<HTMLInputElement>('input[name="img-draw-mode"]').forEach(r => {
            r.checked = r.value === delta.drawMode;
        });

        // Sync border inputs
        const borderColorInput = document.getElementById('img-border-color') as HTMLInputElement;
        const borderWidthInput = document.getElementById('img-border-width') as HTMLInputElement;
        if (borderColorInput) {
            borderColorInput.value = (delta.borderColor && delta.borderColor !== 'transparent')
                ? delta.borderColor : '#000000';
        }
        if (borderWidthInput) {
            borderWidthInput.value = String(delta.borderWidth ?? 0);
        }
    }

    function showCanvasPanel() {
        if (panelCanvas) panelCanvas.style.display = 'block';
        if (panelImage) panelImage.style.display = 'none';
    }

    // Draw mode radio change
    document.querySelectorAll('input[name="img-draw-mode"]').forEach(el => {
        el.addEventListener('change', (e) => {
            const mode = (e.target as HTMLInputElement).value as 'fill' | 'cover' | 'contain';
            const delta = jianzi.selectionManager.selectedDeltaId ? jianzi.deltas.get(jianzi.selectionManager.selectedDeltaId) : null;
            if (delta && delta.type === 'image') {
                (delta as ImageDelta).drawMode = mode;
                jianzi.refresh();
            }
        });
    });

    // Border color change
    document.getElementById('img-border-color')?.addEventListener('input', (e) => {
        const color = (e.target as HTMLInputElement).value;
        const delta = jianzi.selectionManager.selectedDeltaId ? jianzi.deltas.get(jianzi.selectionManager.selectedDeltaId) : null;
        if (delta && delta.type === 'image') {
            (delta as ImageDelta).borderColor = color;
            jianzi.refresh();
        }
    });

    // Border width change
    document.getElementById('img-border-width')?.addEventListener('input', (e) => {
        const width = parseFloat((e.target as HTMLInputElement).value) || 0;
        const delta = jianzi.selectionManager.selectedDeltaId ? jianzi.deltas.get(jianzi.selectionManager.selectedDeltaId) : null;
        if (delta && delta.type === 'image') {
            (delta as ImageDelta).borderWidth = width;
            jianzi.refresh();
        }
    });

    // Upload image from panel
    document.getElementById('upload-image-link')?.addEventListener('click', () => {
        document.getElementById('image-file-input')?.click();
    });

    // Update panel whenever mouse is released (selection may have changed)
    document.addEventListener('mouseup', () => {
        requestAnimationFrame(() => {
            const sel = jianzi.selectionManager.selectedDeltaId ? jianzi.deltas.get(jianzi.selectionManager.selectedDeltaId) : null;
            if (sel && sel.type === 'image') {
                showImagePanel(sel as ImageDelta);
            } else {
                showCanvasPanel();
            }
        });
    });
}
