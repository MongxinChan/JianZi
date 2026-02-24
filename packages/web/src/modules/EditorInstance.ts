import { Editor } from '@jianzi/core';

// ============================================================
// Editor Initialization
// ============================================================
const container = document.querySelector('#app');
if (!container) throw new Error('找不到 #app 容器');

// We use an explicit element as eventTarget for infinite panning. 
// See index.html layout where .viewport contains the scrollable/pannable area.
const eventTarget = document.querySelector('.viewport') as HTMLElement;

export const jianzi = new Editor({
    container: container as HTMLElement,
    eventTarget: eventTarget || document.body,
    width: 500,
    height: 700,
    padding: 60,
    grid: { type: 'line', color: '#cc0000', opacity: 0.2 },
    defaultFont: "'STKaiti', 'KaiTi', serif"
});

// Seed initial content
jianzi.setValue('以此为凭，书写寂静。');
