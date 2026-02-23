import type { LayoutMode } from './model/Delta';
export type { LayoutMode };


/** 
 * 信笺格线样式
 *  */
export interface GridOptions {
  /** 格线类型：'none' (无)、'line' (横/竖线)、'grid' (方格) */
  type: 'none' | 'line' | 'grid';

  /** 线条颜色，如：'#cc0000' (朱砂) 或 '#000000' (乌丝) */
  color?: string;

  /** 线条宽度，默认为 1 */
  lineWidth?: number;

  /** 线条透明度，建议 0.2 - 0.5 之间以保持素雅 */
  opacity?: number;
}

/**
 * 引擎初始化配置接口
 */
export interface JianZiOptions {
  /** 挂载的 DOM 容器 */
  container: HTMLElement;

  /** 画布逻辑宽度 */
  width: number;

  /** 画布逻辑高度 */
  height: number;

  /** 排版模式，默认为 'vertical' */
  mode?: LayoutMode;

  /** 内边距，防止文字紧贴边缘 */
  padding?: number;

  /** 默认字体配置 */
  defaultFont?: string;

  /** 是否开启高清屏适配，默认为 true */
  dprEnabled?: boolean;

  /** 是否有网格 */
  grid?: GridOptions;

  /** 用于绑定全局事件的容器（如 viewport），默认回退到 container */
  eventTarget?: HTMLElement | Window | Document;
}

/**
 * 渲染节点接口
 * 描述单个字符在 Canvas 坐标系中的最终物理位置
 */
export interface RenderNode {
  /** 待渲染的单字符 */
  char: string;

  /** 字符在 Canvas 上的绝对 X 坐标 (逻辑像素) */
  x: number;

  /** 字符在 Canvas 上的绝对 Y 坐标 (逻辑像素) */
  y: number;

  /** 字符使用的字号 */
  fontSize: number;
}