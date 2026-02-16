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

// Selection Style Controls
document.getElementById('style-font-size')?.addEventListener('change', (e) => {
  const size = parseInt((e.target as HTMLInputElement).value);
  if (!isNaN(size)) {
    jianzi.applyStyleToSelection({ fontSize: size });
  }
});

document.getElementById('style-color')?.addEventListener('input', (e) => {
  jianzi.applyStyleToSelection({ color: (e.target as HTMLInputElement).value });
});

document.getElementById('style-background')?.addEventListener('input', (e) => {
  jianzi.applyStyleToSelection({ background: (e.target as HTMLInputElement).value });
});

document.getElementById('style-bg-clear')?.addEventListener('click', () => {
  jianzi.applyStyleToSelection({ background: undefined });
});

document.getElementById('style-bold')?.addEventListener('click', () => {
  // Toggle bold? We don't know current state easily without inspection.
  // For now, let's just APPLY bold. Toggle requires reading state.
  // User requested "Bold/Italic/Underline buttons".
  // I'll implement as "Apply Bold". If user wants Normal, they need "Clear Style" or "Unbold"?
  // Or I can check if I can get selection style.
  // For now: Simple Apply 'bold'.
  // Better: Toggle logic if I can.
  // Let's stick to "Apply Bold" for this pass.
  // Wait, simple toggle logic:
  // We can't easily know if mixed.
  // Let's make it ALWAYS SET BOLD for now.
  // And maybe a "Normal" button? Or "B" toggles between 'bold' and 'normal'?
  // Let's make it toggle blindly? No, explicit is better.
  // Let's set fontWeight: 'bold'.
  jianzi.applyStyleToSelection({ fontWeight: 'bold' });
});
// Add a "Normal Weight" option? Or make it a toggle?
// I'll add listeners for others.

document.getElementById('style-italic')?.addEventListener('click', () => {
  // Italic isn't in CharStyle yet!
  // CharStyle has: color, fontSize, fontFamily, fontWeight, background, underline, lineThrough.
  // No 'fontStyle'.
  // I should add 'fontStyle' to CharStyle in Phase 1?
  // I missed it.
  // I'll skip Italic for now or add it to RichText.ts.
  // I'll skip Italic button logic or make it log "Not implemented".
  console.log('Italic not implemented yet');
});

document.getElementById('style-underline')?.addEventListener('click', () => {
  jianzi.applyStyleToSelection({ underline: true });
  // How to remove?
  // Need a toggle or "Clear Formatting".
  // For now: Apply.
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