import { jianzi } from './EditorInstance';

export function initFloatingToolbar() {
    // ============================================================
    // Floating Text Toolbar
    // ============================================================
    const floatingToolbar = document.getElementById('floating-toolbar');

    function closeAllPalettes() {
        document.getElementById('ft-color-palette')?.classList.remove('open');
        document.getElementById('ft-bg-palette')?.classList.remove('open');
        document.getElementById('ft-font-size-dropdown')?.classList.remove('open');
    }

    function updateFloatingToolbar() {
        if (!floatingToolbar) return;
        const range = jianzi.selectionManager.selectionRange;
        const delta = jianzi.selectionManager.selectedDeltaId ? jianzi.deltas.get(jianzi.selectionManager.selectedDeltaId) : null;

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
    document.addEventListener('mouseup', () => requestAnimationFrame(updateFloatingToolbar));

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
}
