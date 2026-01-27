import { Renderer } from '@jianzi/core';

const container = document.querySelector('#app') as HTMLElement;

if (!container) {
  throw new Error('未找到渲染容器 #app');
}

const jianzi = new Renderer({
  container,
  width: 600,
  height: 800,
  padding: 40
});

jianzi.render("见字如面。在这个数字化时代，我们重新定义书写的温度。");