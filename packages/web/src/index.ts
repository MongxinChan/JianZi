import { Editor } from '@jianzi/core';
import './style.css';

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

// 3. 页面淡入动画 (你原本写的逻辑，保留)
const stage = document.querySelector('.canvas-stage') as HTMLElement;
if (stage) {
  stage.style.opacity = '0';
  setTimeout(() => {
    stage.style.transition = 'opacity 1s ease';
    stage.style.opacity = '1';
  }, 100);
}

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
document.querySelector('#layout-mode')?.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  const mode = target.value as 'vertical' | 'horizontal';
  jianzi.updateOptions({ mode });
});