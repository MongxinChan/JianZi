// 导出所有的类型定义，方便外部进行类型约束
export * from './types.ts';

// 导出核心 Stage 类，用于初始化画布和管理 DPI
export * from './Stage.ts';

// 导出排版引擎，处理文字的几何计算
export * from './Layout.ts';

// 导出编辑器交互类，处理用户输入和渲染同步
export * from './Editor';

// 导出
export { Renderer } from './Renderer';