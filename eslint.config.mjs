import antfu from "@antfu/eslint-config";
import boundaries from "eslint-plugin-boundaries";

const APP_TYPESCRIPT_FILES = ["apps/**/*.{ts,tsx}"];
const BACKEND_SOURCE_FILES = ["apps/backend/src/**/*.ts"];
const FRONTEND_SOURCE_FILES = ["apps/frontend/src/**/*.{ts,tsx}"];
const FRONTEND_ROUTE_AND_TEST_FILES = [
  "apps/frontend/src/routes/**/*.{ts,tsx}",
  "apps/frontend/src/**/*.{test,spec}.{ts,tsx}",
];
const FRONTEND_UI_FILES = ["apps/frontend/src/components/ui/**/*.{ts,tsx}"];

const backendBoundaryElements = [
  { type: "application", pattern: "apps/backend/src/app/**", partialMatch: false },
  { type: "commands", pattern: "apps/backend/src/commands/**", partialMatch: false },
  { type: "config", pattern: "apps/backend/src/config/**", partialMatch: false },
  { type: "catalogs", pattern: "apps/backend/src/catalogs/**", partialMatch: false },
  { type: "core", pattern: "apps/backend/src/core/**", partialMatch: false },
  { type: "features", pattern: "apps/backend/src/features/*" },
  { type: "db", pattern: "apps/backend/src/db/**", partialMatch: false },
];

const backendBoundaryPolicies = [
  // application 是组合层，可以连接所有应用内能力。
  { from: { element: { type: "application" } }, allow: { to: { element: { type: ["application", "catalogs", "config", "core", "db", "features"] } } } },
  // 独立命令负责应用编排，但不直接依赖 feature 内部实现。
  { from: { element: { type: "commands" } }, allow: { to: { element: { type: ["catalogs", "commands", "config", "core", "db"] } } } },
  // catalog 是显式的应用级契约汇总点，可以聚合 feature 定义。
  { from: { element: { type: "catalogs" } }, allow: { to: { element: { type: ["catalogs", "core", "features"] } } } },
  // core 只依赖 core/db/config，禁止反向依赖业务 feature。
  { from: { element: { type: "core" } }, allow: { to: { element: { type: ["config", "core", "db"] } } } },
  // feature 可以复用 core/db/catalog；同 feature 内部依赖由元素捕获语义约束。
  { from: { element: { type: "features" } }, allow: { to: { element: { type: ["catalogs", "core", "db"] } } } },
  // db 仅依赖数据库自身、配置和跨业务基础设施。
  { from: { element: { type: "db" } }, allow: { to: { element: { type: ["config", "core", "db"] } } } },
  { from: { element: { type: "config" } }, allow: { to: { element: { type: "config" } } } },
];

const frontendBoundaryElements = [
  { type: "routes", pattern: "apps/frontend/src/routes/**", partialMatch: false },
  { type: "features", pattern: "apps/frontend/src/features/*" },
  { type: "components", pattern: "apps/frontend/src/components/**", partialMatch: false },
  { type: "hooks", pattern: "apps/frontend/src/hooks/**", partialMatch: false },
  { type: "lib", pattern: "apps/frontend/src/lib/**", partialMatch: false },
  { type: "types", pattern: "apps/frontend/src/types/**", partialMatch: false },
  { type: "api", pattern: "apps/frontend/src/api/**", partialMatch: false },
];

const frontendBoundaryFiles = [
  { category: "bootstrap", pattern: "apps/frontend/src/main.tsx" },
  { category: "application", pattern: "apps/frontend/src/app.tsx" },
  { category: "router", pattern: "apps/frontend/src/router.tsx" },
  { category: "route-tree", pattern: "apps/frontend/src/routeTree.gen.ts" },
];

const frontendBoundaryPolicies = [
  // bootstrap 只挂载应用和全局展示 Provider，不直接进入路由或业务 feature。
  { from: { file: { categories: "bootstrap" } }, allow: { to: { file: { categories: "application" } } } },
  { from: { file: { categories: "bootstrap" } }, allow: { to: { element: { type: "components" } } } },
  // App 只负责恢复 session 并把它注入 RouterProvider。
  { from: { file: { categories: "application" } }, allow: { to: { file: { categories: "router" } } } },
  { from: { file: { categories: "application" } }, allow: { to: { element: { type: "lib" } } } },
  // router 只定义路由树实例；实际页面组合由 routes 承担。
  { from: { file: { categories: "router" } }, allow: { to: { file: { categories: "route-tree" } } } },
  // routes 是装配层，可以组合业务 feature 和所有通用层。
  { from: { element: { type: "routes" } }, allow: { to: { element: { type: ["features", "components", "hooks", "lib", "types", "api"] } } } },
  // feature 间禁止直接依赖；共享能力应下沉到通用层或由 route 装配。
  { from: { element: { type: "features" } }, allow: { to: { element: { type: ["components", "hooks", "lib", "types", "api"] } } } },
  // 通用层不能反向依赖业务 feature 或 route。
  { from: { element: { type: "components" } }, allow: { to: { element: { type: ["components", "hooks", "lib", "types"] } } } },
  // 导航配置消费生成路由联合，仅形成类型依赖，不反向调用 route 实现。
  { from: { element: { type: "components" } }, allow: { to: { file: { categories: "route-tree" } } } },
  { from: { element: { type: "hooks" } }, allow: { to: { element: { type: ["hooks", "lib", "types"] } } } },
  { from: { element: { type: "lib" } }, allow: { to: { element: { type: ["lib", "types", "api"] } } } },
  { from: { element: { type: "types" } }, allow: { to: { element: { type: ["types", "api", "lib"] } } } },
  { from: { element: { type: "api" } }, allow: { to: { element: { type: ["api", "lib", "types"] } } } },
];

export default antfu(
  {
    formatters: true,
    // 保证 IDE、Codex 与 CI 使用相同的规则严重级别和修复行为。
    isInEditor: false,
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
      // 文档和 agent 资产不属于 ESLint 的职责范围。
      "**/*.md",
      "**/.agents/**",
      // 生成物和不可手改的数据库产物。
      "apps/frontend/src/routeTree.gen.ts",
      "apps/backend/src/db/migrations",
      "apps/backend/src/db/schema/auth-schema.ts",
      "apps/frontend/src/api/apiDefinitions.ts",
      "apps/frontend/src/api/createApis.ts",
      "apps/frontend/src/api/globals.d.ts",
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
      // describe 是主题分组，允许 PascalCase 类名/模块名；it 保持小写行为描述。
      "test/prefer-lowercase-title": ["error", { ignore: ["describe"] }],
    },
  },
  {
    name: "project/typescript-safety",
    files: APP_TYPESCRIPT_FILES,
    rules: {
      // 对应用源码、测试和工具配置使用同一套严格布尔语义。
      "ts/strict-boolean-expressions": ["error", {
        allowString: true,
        allowNumber: false,
        allowNullableObject: true,
        allowNullableBoolean: false,
      }],
    },
  },
  {
    name: "project/backend-boundaries",
    files: BACKEND_SOURCE_FILES,
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "apps/backend/tsconfig.json" },
      },
      "boundaries/elements": backendBoundaryElements,
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "disallow",
        policies: backendBoundaryPolicies,
      }],
    },
  },
  {
    name: "project/backend-feature-isolation",
    files: ["apps/backend/src/features/**/*.ts"],
    rules: {
      // feature 内统一使用相对路径；任何 feature alias import 都视为跨 feature 依赖。
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/*", "@/features/*/**"],
          message: "feature 之间不得直接依赖；请经 application composition 或 core port 装配。",
        }],
      }],
    },
  },
  {
    name: "project/backend-code-quality",
    files: BACKEND_SOURCE_FILES,
    ignores: ["apps/backend/src/**/*.test.ts"],
    rules: {
      // 先以当前可通过的阈值建立棘轮，阻止业务源码继续膨胀。
      "complexity": ["error", 15],
      "max-lines-per-function": ["error", { max: 150, skipComments: true }],
      "max-lines": ["error", 350],
    },
  },
  {
    name: "project/frontend-source",
    files: FRONTEND_SOURCE_FILES,
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "apps/frontend/tsconfig.json" },
      },
      "boundaries/elements": frontendBoundaryElements,
      "boundaries/files": frontendBoundaryFiles,
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "disallow",
        policies: frontendBoundaryPolicies,
      }],
      // alova Method 是 thenable，返回它的函数无需伪装成 async。
      "ts/promise-function-async": "off",
      // 存量已归零，代码品味规则作为强制门禁执行。
      "complexity": ["error", 15],
      "max-lines-per-function": ["error", { max: 150, skipComments: true }],
      "max-lines": ["error", 300],
      "no-nested-ternary": "error",
      "unicorn/filename-case": ["error", { cases: { kebabCase: true } }],
    },
  },
  {
    name: "project/frontend-feature-isolation",
    files: ["apps/frontend/src/features/**/*.{ts,tsx}"],
    rules: {
      // feature 内统一使用相对路径；任何 feature alias import 都视为跨 feature 依赖。
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/*", "@/features/*/**"],
          message: "feature 之间不得直接依赖；请经 route 装配或下沉到通用层。",
        }],
      }],
    },
  },
  {
    name: "project/frontend-route-and-test-overrides",
    files: FRONTEND_ROUTE_AND_TEST_FILES,
    rules: {
      // route 必须同时导出 Route 和组件；测试文件也不是 HMR 组件模块。
      "react-refresh/only-export-components": "off",
    },
  },
  {
    name: "project/frontend-vendored-ui-overrides",
    files: FRONTEND_UI_FILES,
    rules: {
      // shadcn 生成物由 CLI 维护，只保留通用语法规则，不用项目品味规则改写。
      "react-refresh/only-export-components": "off",
      "ts/strict-boolean-expressions": "off",
      "react/no-context-provider": "off",
      "react/no-nested-component-definitions": "off",
      "react/no-array-index-key": "off",
      "react/use-state": "off",
      "react/no-use-context": "off",
      "complexity": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
      "no-nested-ternary": "off",
      "unicorn/filename-case": "off",
    },
  },
);
