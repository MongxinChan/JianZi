import { Editor } from '@jianzi/core';
import './style.css';
// HMR Trigger

// 1. 初始化编辑器核心
const container = document.querySelector('#app');
if (!container) throw new Error("找不到 #app 容器");

const jianzi = new Editor({
  container: container as HTMLElement,
  width: 500, // 稍微缩小尺寸，让呼吸感更强
  height: 700,
  padding: 60,
  grid: { type: 'line', color: '#cc0000', opacity: 0.2 },
  // 建议加上字体设置，否则默认黑体不好看
  defaultFont: "28px 'STKaiti', 'KaiTi', serif"
});

// 2. 模拟初始文字
jianzi.setValue("以此为凭，书写寂静。我在这寂静中，发现了自己的力量。");

// [添加文本框]
document.querySelector('#add-text')?.addEventListener('click', () => {
  jianzi.addText();
});


// [导出功能]
document.querySelector('#export')?.addEventListener('click', () => {
  console.log("点击了导出..."); // 方便调试
  try {
    const dataUrl = jianzi.exportImage();

    // 创建一个临时的下载链接
    const link = document.createElement('a');
    link.download = `jianzi-${Date.now()}.png`;
    link.href = dataUrl;

    // 必须加入文档流才能点击生效
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error("导出失败，请检查 Renderer 是否实现了 getCanvas", e);
    alert("导出失败，请按 F12 查看控制台报错");
  }
});

// [清除功能]
document.querySelector('#clear')?.addEventListener('click', () => {
  // 加上确认弹窗，防止误触
  if (confirm('确定要清空画纸吗？')) {
    jianzi.clear();
  }
});

// [布局联动：内边距]
document.querySelector('#padding')?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  // 实时更新配置
  jianzi.updateOptions({ padding: parseInt(target.value) });
  // 更新 UI 显示数值
  const display = target.nextElementSibling;
  if (display) display.textContent = target.value;
});

// [字体选择] - Moved and modified from original position
document.getElementById('font-family')?.addEventListener('change', (e) => {
  const selectElement = e.target as HTMLSelectElement;
  jianzi.setFont(selectElement.value);
});


// [布局联动：格线透明度]
document.querySelector('#grid-opacity')?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  const currentGrid = jianzi.getOptions().grid || { type: 'line', color: '#cc0000' };

  // 深度合并 grid 对象
  jianzi.updateOptions({
    grid: { ...currentGrid, opacity: parseFloat(target.value) }
  });
});

// [布局联动：排版模式]
const radioInputs = document.querySelectorAll('input[name="layout-mode"]');
radioInputs.forEach(input => {
  input.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.checked) {
      const mode = target.value as 'vertical' | 'horizontal';
      jianzi.updateOptions({ mode });
    }
  });
});

// [画布尺寸：自定义输入]
const widthInput = document.querySelector('#canvas-width') as HTMLInputElement;
const heightInput = document.querySelector('#canvas-height') as HTMLInputElement;

const updateCanvasSize = () => {
  const width = parseInt(widthInput.value) || 500;
  const height = parseInt(heightInput.value) || 700;
  jianzi.updateOptions({ width, height });
};

widthInput?.addEventListener('change', updateCanvasSize);
heightInput?.addEventListener('change', updateCanvasSize);

// [画布尺寸：预设按钮]
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const w = target.getAttribute('data-w');
    const h = target.getAttribute('data-h');

    if (w && h) {
      widthInput.value = w;
      heightInput.value = h;
      updateCanvasSize();
    }
  });
});

// [图片上传功能]
const addImageBtn = document.querySelector('#add-image');
const imageFileInput = document.querySelector('#image-file-input') as HTMLInputElement;

addImageBtn?.addEventListener('click', () => {
  imageFileInput?.click();
});

imageFileInput?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    jianzi.addImage(dataUrl);
  };
  reader.readAsDataURL(file);

  // Reset input so the same file can be re-selected
  target.value = '';
});

// [字体选择]
const fontSelect = document.querySelector('#font-family') as HTMLSelectElement;
fontSelect?.addEventListener('change', () => {
  jianzi.setFont(fontSelect.value);
});

// [Floating Toolbar Logic]
const floatingToolbar = document.getElementById('floating-toolbar');
const bindToolbar = () => {
  if (!floatingToolbar) return;

  // Bind Buttons
  floatingToolbar.querySelector('#ft-bold')?.addEventListener('click', () => {
    const currentStyle = jianzi.getSelectionStyle();
    const isBold = currentStyle?.fontWeight === 'bold';
    jianzi.applyStyleToSelection({ fontWeight: isBold ? 'normal' : 'bold' });
  });
  floatingToolbar.querySelector('#ft-italic')?.addEventListener('click', () => {
    const currentStyle = jianzi.getSelectionStyle();
    const isItalic = currentStyle?.fontStyle === 'italic';
    jianzi.applyStyleToSelection({ fontStyle: isItalic ? 'normal' : 'italic' });
  });
  floatingToolbar.querySelector('#ft-underline')?.addEventListener('click', () => {
    const currentStyle = jianzi.getSelectionStyle();
    const isUnderline = !!currentStyle?.underline;
    jianzi.applyStyleToSelection({ underline: !isUnderline });
  });
  // Color Palette logic
  const ftColorPalette = document.getElementById('ft-color-palette');
  const ftBgPalette = document.getElementById('ft-bg-palette');
  const ftColorBar = document.getElementById('ft-color-bar');
  const ftBgBar = document.getElementById('ft-bg-bar');

  const closeAllPalettes = () => {
    ftColorPalette?.classList.remove('open');
    ftBgPalette?.classList.remove('open');
  };

  // Toggle font color palette
  floatingToolbar.querySelector('#ft-color-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = ftColorPalette?.classList.contains('open');
    closeAllPalettes();
    if (!isOpen) ftColorPalette?.classList.add('open');
  });

  // Toggle highlight palette
  floatingToolbar.querySelector('#ft-bg-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = ftBgPalette?.classList.contains('open');
    closeAllPalettes();
    if (!isOpen) ftBgPalette?.classList.add('open');
  });

  // Font color swatches
  ftColorPalette?.querySelectorAll('.ft-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = (swatch as HTMLElement).dataset.color || '#2c3e50';

      jianzi.applyStyleToSelection({ color });
      if (ftColorBar) ftColorBar.style.background = color;
      closeAllPalettes();
    });
  });

  // Highlight color swatches
  ftBgPalette?.querySelectorAll('.ft-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = (swatch as HTMLElement).dataset.color;
      if (color) {
        jianzi.applyStyleToSelection({ background: color });
        if (ftBgBar) ftBgBar.style.background = color;
      } else {
        // Clear highlight
        jianzi.applyStyleToSelection({ background: undefined });
        if (ftBgBar) ftBgBar.style.background = 'transparent';
      }
      closeAllPalettes();
    });
  });

  // Close palettes when clicking outside
  document.addEventListener('click', () => closeAllPalettes());

  floatingToolbar.querySelector('#ft-clear')?.addEventListener('click', () => {
    jianzi.applyStyleToSelection({
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false,
      color: '#2c3e50',
      background: undefined
    });
    if (ftColorBar) ftColorBar.style.background = '#2c3e50';
    if (ftBgBar) ftBgBar.style.background = 'transparent';
    closeAllPalettes();
  });

  // Handle Selection Change
  const updateToolbar = () => {
    const range = jianzi.selectionRange;
    const delta = jianzi.selectedDeltaId ? jianzi.deltas.get(jianzi.selectedDeltaId) : null;


    if (range && delta && delta.type === 'text' && Math.abs(range.start - range.end) > 0) {

      // Show Toolbar
      // Using 'any' to bypass TS check for TextDelta specific method if not imported
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
            mode,
            jianzi.getOptions().width,
            jianzi.getOptions().height
          );


          if (rects && rects.length > 0) {
            const rect = rects[0];
            // Calculate position
            const canvasRect = canvas?.getBoundingClientRect();


            if (canvasRect) {
              // Delta (x,y) + Rect (x,y) + Canvas (left, top)
              const absX = canvasRect.left + textDelta.x + rect.x;
              const absY = canvasRect.top + textDelta.y + rect.y;


              floatingToolbar.style.left = `${absX}px`;
              floatingToolbar.style.top = `${absY - 50}px`; // 50px above
              floatingToolbar.classList.add('visible');
              return;
            }
          }
        }
      }
    }

    // Hide if no selection
    floatingToolbar.classList.remove('visible');
  };


  document.addEventListener('mouseup', () => requestAnimationFrame(updateToolbar));
  document.addEventListener('keyup', () => requestAnimationFrame(updateToolbar));

  // Prevent focus loss when clicking toolbar
  floatingToolbar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
};
bindToolbar();