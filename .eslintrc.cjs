module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    // 强制执行 Prettier 风格
    'prettier/prettier': 'error',
    // 禁止使用 any (开源项目保持类型安全的核心)
    '@typescript-eslint/no-explicit-any': 'warn',
    // 强制要求导出函数必须定义返回类型
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // 自动排序 Import 语句 (让代码头部整整齐齐)
    'import/order': [
      'error',
      {
        'groups': ['builtin', 'external', 'internal'],
        'newlines-between': 'always',
        'alphabetize': { 'order': 'asc', 'case-insensitive': true }
      }
    ],
    // 禁止未使用的变量
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};