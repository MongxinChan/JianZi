// 导出所有的类型定义，方便外部进行类型约束
export * from './types.ts';

// 导出 Delta 数据模型 (TextDelta, ImageDelta, etc.)
export * from './model/Delta';
export * from './model/DeltaSet';

// 导出编辑器交互类，处理用户输入和渲染同步
export * from './Editor';
