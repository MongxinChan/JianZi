import { Editor } from '@jianzi/core';
import './style.css';

const jianzi = new Editor({
  container: document.querySelector('#app')!,
  width: 500, // 稍微缩小尺寸，让呼吸感更强
  height: 700,
  padding: 60,
  grid: { type: 'line', color: '#cc0000', opacity: 0.2 }
});

// 初始化完成后显示舞台
const stage = document.querySelector('.canvas-stage') as HTMLElement;
if (stage) {
  stage.style.opacity = '0';
  setTimeout(() => {
    stage.style.transition = 'opacity 1s ease';
    stage.style.opacity = '1';
  }, 100);
}

// 模拟初始文字
jianzi.setValue("以此为凭，\n书写寂静。");

// 监听内边距变化
document.querySelector('#padding')?.addEventListener('input', (e) => {
  const value = parseInt((e.target as HTMLInputElement).value);
  jianzi.updateOptions({ padding: value });
});

// 监听格线透明度变化
document.querySelector('#grid-opacity')?.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  // 注意：grid 是嵌套对象，我们需要保持其他属性不变
  jianzi.updateOptions({ 
    grid: { ...jianzi.getOptions().grid, opacity: value } 
  });
});