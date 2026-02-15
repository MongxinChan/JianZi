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