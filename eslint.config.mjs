import antfu from "@antfu/eslint-config";
import boundaries from "eslint-plugin-boundaries";

export default antfu({
  formatters: true,
  react: true,
  typescript: {
    tsconfigPath: "tsconfig.json",
  },
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  ignores: [
    "**/*.md",
    "**/.agents/**",
    "apps/frontend/src/routeTree.gen.ts",
    "apps/backend/src/db/migrations",
    "apps/backend/src/db/schema/auth-schema.ts",
    "apps/frontend/src/api/*",
    "!apps/frontend/src/api/index.ts",
  ],
  overrides: {
    javascript: {
      "no-console": "error",
    },
    typescript: {
      "no-console": "error",
    },
  },
  rules: {
    "style/brace-style": ["error", "1tbs", { allowSingleLine: true }],
    "jsdoc/check-param-names": "off",
    // describe 是主题分组,常用类名/模块名(PascalCase)作标题;it 是行为描述,保持小写句子。
    "test/prefer-lowercase-title": ["error", { ignore: ["describe"] }],
  },
}).append({
  files: [
    "apps/frontend/src/**/*.{ts,tsx}",
    "apps/backend/src/**/*.ts",
  ],
  rules: {
    "ts/strict-boolean-expressions": ["error", {
      allowString: true,
      allowNumber: false,
      allowNullableObject: true,
      allowNullableBoolean: false,
    }],
  },
}).append({
  files: ["apps/backend/src/**/*.ts"],
  plugins: { boundaries },
  settings: {
    "import/resolver": {
      typescript: { project: "apps/backend/tsconfig.json" },
    },
    "boundaries/elements": [
      { type: "core", pattern: "apps/backend/src/core/**", partialMatch: false },
      { type: "features", pattern: "apps/backend/src/features/*" },
      { type: "db", pattern: "apps/backend/src/db/**", partialMatch: false },
    ],
  },
  rules: {
    // core 只依赖 core/db(禁 features)
    // features 可依赖 core/db/features
    // db 可依赖 db/core(db 脚本用 core 基础设施)
    "boundaries/dependencies": ["error", {
      default: "disallow",
      policies: [
        { from: { element: { type: "core" } }, allow: { to: { element: { type: ["core", "db"] } } } },
        { from: { element: { type: "features" } }, allow: { to: { element: { type: ["core", "db", "features"] } } } },
        { from: { element: { type: "db" } }, allow: { to: { element: { type: ["db", "core"] } } } },
      ],
    }],
  },
}).append({
  files: ["apps/frontend/src/components/ui/**/*.{ts,tsx}"],
  rules: {
    // shadcn 生成物(vendored 不手改):豁免
    "react-refresh/only-export-components": "off",
    "ts/strict-boolean-expressions": "off",
    "react/no-context-provider": "off",
    "react/no-nested-component-definitions": "off",
  },
}).append({
  files: ["apps/frontend/src/routes/**/*.{ts,tsx}"],
  rules: {
    // route 文件必须导出 Route(createFileRoute 返回值,非字面量常量)+ 组件,豁免 react-refresh
    "react-refresh/only-export-components": "off",
  },
}).append({
  files: ["apps/frontend/src/**/*.{ts,tsx}"],
  rules: {
    // alova Method 是 thenable(promise-like),ts/promise-function-async 误报返回 promise 未标 async,前端 off
    "ts/promise-function-async": "off",
  },
}).append({
  files: ["apps/frontend/src/**/*.{test,spec}.{ts,tsx}"],
  rules: {
    // 测试文件导出 describe/fixture 非常规组件,豁免 react-refresh
    "react-refresh/only-export-components": "off",
  },
}).append({
  files: ["apps/frontend/src/**/*.{ts,tsx}"],
  plugins: { boundaries },
  settings: {
    "import/resolver": {
      typescript: { project: "apps/frontend/tsconfig.json" },
    },
    "boundaries/elements": [
      { type: "routes", pattern: "apps/frontend/src/routes/**", partialMatch: false },
      { type: "features", pattern: "apps/frontend/src/features/*" },
      { type: "components", pattern: "apps/frontend/src/components/**", partialMatch: false },
      { type: "hooks", pattern: "apps/frontend/src/hooks/**", partialMatch: false },
      { type: "lib", pattern: "apps/frontend/src/lib/**", partialMatch: false },
      { type: "types", pattern: "apps/frontend/src/types/**", partialMatch: false },
      { type: "api", pattern: "apps/frontend/src/api/**", partialMatch: false },
    ],
  },
  rules: {
    // 扁平 feature-based:routes(路由)-> features/components/hooks/lib/types/api;
    // features(业务)-> components/hooks/lib/types/api(**features 间禁**);
    // components/hooks/lib/types/api(通用)-> 同层自由(**不依赖 features/routes**)。
    "boundaries/dependencies": ["error", {
      default: "disallow",
      policies: [
        { from: { element: { type: "routes" } }, allow: { to: { element: { type: ["features", "components", "hooks", "lib", "types", "api"] } } } },
        { from: { element: { type: "features" } }, allow: { to: { element: { type: ["components", "hooks", "lib", "types", "api"] } } } },
        { from: { element: { type: "components" } }, allow: { to: { element: { type: ["components", "hooks", "lib", "types", "api"] } } } },
        { from: { element: { type: "hooks" } }, allow: { to: { element: { type: ["hooks", "lib", "types", "api", "components"] } } } },
        { from: { element: { type: "lib" } }, allow: { to: { element: { type: ["lib", "types", "api"] } } } },
        { from: { element: { type: "types" } }, allow: { to: { element: { type: ["types", "api", "lib"] } } } },
        { from: { element: { type: "api" } }, allow: { to: { element: { type: ["api", "lib", "types"] } } } },
      ],
    }],
  },
}).append({
  // 代码品味:渐进 warn,存量修完升 error(见 docs/conventions/frontend/code-style.md)
  files: ["apps/frontend/src/**/*.{ts,tsx}"],
  rules: {
    "complexity": ["warn", 15],
    "max-lines-per-function": ["warn", { max: 150, skipComments: true }],
    "max-lines": ["warn", 300],
    "no-nested-ternary": "warn",
    // 文件名统一 kebab-case(api/* 已 ignore,ui/* 在下方豁免)
    "unicorn/filename-case": ["error", { cases: { kebabCase: true } }],
  },
}).append({
  // shadcn 生成物:豁免品味规则(cva 变体、单文件多导出、嵌套结构、文件名由 CLI 决定)
  files: ["apps/frontend/src/components/ui/**/*.{ts,tsx}"],
  rules: {
    "complexity": "off",
    "max-lines-per-function": "off",
    "max-lines": "off",
    "no-nested-ternary": "off",
    "unicorn/filename-case": "off",
  },
});
