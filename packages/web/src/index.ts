import { Editor, ImageDelta } from '@jianzi/core';
import './style.css';

// ============================================================
// 1. Editor Initialization
// ============================================================
const container = document.querySelector('#app');
if (!container) throw new Error('找不到 #app 容器');

const jianzi = new Editor({
  container: container as HTMLElement,
  eventTarget: document.querySelector('.viewport') as HTMLElement,
  width: 500,
  height: 700,
  padding: 60,
  grid: { type: 'line', color: '#cc0000', opacity: 0.2 },
  defaultFont: "'STKaiti', 'KaiTi', serif"
});

// Seed initial content
jianzi.setValue('以此为凭，书写寂静。');

// ============================================================
// 1b. Right Panel Toggle
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
// 2. Tool Buttons
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
// 3. Add Text / Add Image
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
// 4. Undo / Redo
// ============================================================
document.getElementById('undo')?.addEventListener('click', () => jianzi.undo());
document.getElementById('redo')?.addEventListener('click', () => jianzi.redo());

// ============================================================
// 5. Dropdown menus (open / close)
// ============================================================
function setupDropdown(triggerID: string, menuID: string) {
  const trigger = document.getElementById(triggerID);
  const menu = document.getElementById(menuID);
  if (!trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !menu.classList.contains('open');
    // Close all dropdowns first
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    if (opening) menu.classList.add('open');
  });
}

setupDropdown('action-menu-trigger', 'action-menu');
setupDropdown('export-menu-trigger', 'export-menu');

// Close dropdowns on outside click
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

// ============================================================
// 6. Open File (JSON)
// ============================================================
const jsonFileInput = document.getElementById('json-file-input') as HTMLInputElement;

document.getElementById('open-file')?.addEventListener('click', () => {
  jsonFileInput?.click();
});

jsonFileInput?.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const json = reader.result as string;
    jianzi.loadJSON(json);
    // Sync canvas size inputs
    const opts = jianzi.getOptions();
    const wi = document.getElementById('canvas-width') as HTMLInputElement;
    const hi = document.getElementById('canvas-height') as HTMLInputElement;
    if (wi) wi.value = String(opts.width);
    if (hi) hi.value = String(opts.height);
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = '';
});

// ============================================================
// 7. Clear Canvas
// ============================================================
document.getElementById('clear-canvas')?.addEventListener('click', () => {
  if (confirm('确定要清空画布吗？')) jianzi.clear();
});

// ============================================================
// 8. Export — PNG
// ============================================================
document.getElementById('export-png')?.addEventListener('click', () => {
  try {
    const dataUrl = jianzi.exportImage();
    const link = document.createElement('a');
    link.download = `jianzi-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    alert('导出失败，请检查控制台');
    console.error(e);
  }
});

// ============================================================
// 9. Export — PDF
// ============================================================
document.getElementById('export-pdf')?.addEventListener('click', () => {
  try {
    const jspdfAny = (window as any).jspdf;
    if (!jspdfAny) { alert('jsPDF 未加载，请检查网络连接'); return; }
    const { jsPDF } = jspdfAny;
    const opts = jianzi.getOptions();
    const doc = new jsPDF({ unit: 'px', format: [opts.width, opts.height], orientation: 'portrait' });
    const imgData = jianzi.exportImage();
    doc.addImage(imgData, 'PNG', 0, 0, opts.width, opts.height, undefined, 'FAST');
    doc.save(`jianzi-${Date.now()}.pdf`);
  } catch (e) {
    alert('PDF 导出失败，请检查控制台');
    console.error(e);
  }
});

// ============================================================
// 10. Export — JSON
// ============================================================
document.getElementById('export-json')?.addEventListener('click', () => {
  const json = jianzi.exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `jianzi-${Date.now()}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

// ============================================================
// 11. Canvas Size Controls
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
// 12. Image Properties Panel
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
    const delta = jianzi.selectedDeltaId ? jianzi.deltas.get(jianzi.selectedDeltaId) : null;
    // Use type check to avoid instanceof module mismatch issues
    if (delta && delta.type === 'image') {
      (delta as ImageDelta).drawMode = mode;
      jianzi.refresh();
    }
  });
});

// Border color change
document.getElementById('img-border-color')?.addEventListener('input', (e) => {
  const color = (e.target as HTMLInputElement).value;
  const delta = jianzi.selectedDeltaId ? jianzi.deltas.get(jianzi.selectedDeltaId) : null;
  if (delta && delta.type === 'image') {
    (delta as ImageDelta).borderColor = color;
    jianzi.refresh();
  }
});

// Border width change
document.getElementById('img-border-width')?.addEventListener('input', (e) => {
  const width = parseFloat((e.target as HTMLInputElement).value) || 0;
  const delta = jianzi.selectedDeltaId ? jianzi.deltas.get(jianzi.selectedDeltaId) : null;
  if (delta && delta.type === 'image') {
    (delta as ImageDelta).borderWidth = width;
    jianzi.refresh();
  }
});

// Upload image from panel
document.getElementById('upload-image-link')?.addEventListener('click', () => {
  imageFileInput?.click();
});

// Update panel whenever mouse is released (selection may have changed)
document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    const sel = jianzi.selectedDeltaId ? jianzi.deltas.get(jianzi.selectedDeltaId) : null;
    if (sel && sel.type === 'image') {
      showImagePanel(sel as ImageDelta);
    } else {
      showCanvasPanel();
    }
    // Update toolbar too
    updateFloatingToolbar();
  });
});

// ============================================================
// 13. Floating Text Toolbar
// ============================================================
const floatingToolbar = document.getElementById('floating-toolbar');

function closeAllPalettes() {
  document.getElementById('ft-color-palette')?.classList.remove('open');
  document.getElementById('ft-bg-palette')?.classList.remove('open');
  document.getElementById('ft-font-size-dropdown')?.classList.remove('open');
}

function updateFloatingToolbar() {
  if (!floatingToolbar) return;
  const range = jianzi.selectionRange;
  const delta = jianzi.selectedDeltaId ? jianzi.deltas.get(jianzi.selectedDeltaId) : null;

  if (range && delta && delta.type === 'text' && Math.abs(range.start - range.end) > 0) {
    // Update font size
    const ftSizeInput = document.getElementById('ft-font-size-input') as HTMLInputElement;
    const currentStyle = jianzi.getSelectionStyle();
    if (ftSizeInput && document.activeElement !== ftSizeInput) {
      ftSizeInput.value = currentStyle?.fontSize ? `${currentStyle.fontSize}px` : '';
    }

    // Position toolbar
    if ('getRectsForRange' in delta) {
      const textDelta = delta as any;
      const canvas = document.querySelector('canvas');
      const ctx = canvas?.getContext('2d');
      const mode = jianzi.getOptions().mode || 'vertical';
      if (ctx) {
        const rects = textDelta.getRectsForRange(
          ctx,
          Math.min(range.start, range.end),
          Math.max(range.start, range.end),
          mode, jianzi.getOptions().width, jianzi.getOptions().height
        );
        if (rects && rects.length > 0) {
          const rect = rects[0];
          const canvasRect = canvas?.getBoundingClientRect();
          if (canvasRect) {
            floatingToolbar.style.left = `${canvasRect.left + textDelta.x + rect.x}px`;
            floatingToolbar.style.top = `${canvasRect.top + textDelta.y + rect.y - 50}px`;
            floatingToolbar.classList.add('visible');
            return;
          }
        }
      }
    }
  }
  floatingToolbar.classList.remove('visible');
}

document.addEventListener('keyup', () => requestAnimationFrame(updateFloatingToolbar));

if (floatingToolbar) {
  // Bold / Italic / Underline
  floatingToolbar.querySelector('#ft-bold')?.addEventListener('click', () => {
    const s = jianzi.getSelectionStyle();
    jianzi.applyStyleToSelection({ fontWeight: s?.fontWeight === 'bold' ? 'normal' : 'bold' });
  });
  floatingToolbar.querySelector('#ft-italic')?.addEventListener('click', () => {
    const s = jianzi.getSelectionStyle();
    jianzi.applyStyleToSelection({ fontStyle: s?.fontStyle === 'italic' ? 'normal' : 'italic' });
  });
  floatingToolbar.querySelector('#ft-underline')?.addEventListener('click', () => {
    const s = jianzi.getSelectionStyle();
    jianzi.applyStyleToSelection({ underline: !s?.underline });
  });
  floatingToolbar.querySelector('#ft-clear')?.addEventListener('click', () => {
    jianzi.applyStyleToSelection({ fontWeight: 'normal', fontStyle: 'normal', underline: false, color: '#2c3e50', background: undefined });
  });

  // Font size combobox
  const ftSizeInput = floatingToolbar.querySelector('#ft-font-size-input') as HTMLInputElement;
  const ftSizeDropdown = document.getElementById('ft-font-size-dropdown');
  const ftSizeTrigger = document.getElementById('ft-font-size-trigger');

  ftSizeInput?.addEventListener('change', () => {
    const size = parseInt(ftSizeInput.value);
    if (!isNaN(size) && size > 0) {
      ftSizeInput.value = size + 'px';
      jianzi.applyStyleToSelection({ fontSize: size });
    }
  });

  ftSizeTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = ftSizeDropdown?.classList.contains('open');
    closeAllPalettes();
    if (!isOpen) ftSizeDropdown?.classList.add('open');
  });

  ftSizeDropdown?.querySelectorAll('.ft-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = (opt as HTMLElement).dataset.value;
      if (val) {
        ftSizeInput.value = val + 'px';
        jianzi.applyStyleToSelection({ fontSize: parseInt(val) });
      }
      ftSizeDropdown.classList.remove('open');
    });
  });

  // Color palettes
  const ftColorPalette = document.getElementById('ft-color-palette');
  const ftBgPalette = document.getElementById('ft-bg-palette');
  const ftColorBar = document.getElementById('ft-color-bar');
  const ftBgBar = document.getElementById('ft-bg-bar');

  floatingToolbar.querySelector('#ft-color-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = ftColorPalette?.classList.contains('open');
    closeAllPalettes();
    if (!isOpen) ftColorPalette?.classList.add('open');
  });

  floatingToolbar.querySelector('#ft-bg-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = ftBgPalette?.classList.contains('open');
    closeAllPalettes();
    if (!isOpen) ftBgPalette?.classList.add('open');
  });

  ftColorPalette?.querySelectorAll('.ft-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = (swatch as HTMLElement).dataset.color || '#2c3e50';
      jianzi.applyStyleToSelection({ color });
      if (ftColorBar) ftColorBar.style.background = color;
      closeAllPalettes();
    });
  });

  ftBgPalette?.querySelectorAll('.ft-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = (swatch as HTMLElement).dataset.color;
      jianzi.applyStyleToSelection({ background: color || undefined });
      if (ftBgBar) ftBgBar.style.background = color || 'transparent';
      closeAllPalettes();
    });
  });

  document.addEventListener('click', closeAllPalettes);

  // Prevent losing textarea focus when clicking toolbar
  floatingToolbar.addEventListener('mousedown', (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName !== 'SELECT' && t.tagName !== 'OPTION' && t.tagName !== 'INPUT') {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}