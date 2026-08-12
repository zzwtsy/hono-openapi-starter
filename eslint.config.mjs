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
  { type: "core", pattern: "apps/backend/src/core/**", partialMatch: false },
  { type: "features", pattern: "apps/backend/src/features/*" },
  { type: "db", pattern: "apps/backend/src/db/**", partialMatch: false },
];

const backendBoundaryPolicies = [
  // core 只依赖 core/db，禁止反向依赖业务 feature。
  { from: { element: { type: "core" } }, allow: { to: { element: { type: ["core", "db"] } } } },
  // feature 可以复用 core/db；同 feature 内部依赖由元素捕获语义约束。
  { from: { element: { type: "features" } }, allow: { to: { element: { type: ["core", "db", "features"] } } } },
  // db 脚本可以复用 core 的日志、配置等基础设施。
  { from: { element: { type: "db" } }, allow: { to: { element: { type: ["db", "core"] } } } },
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

const frontendBoundaryPolicies = [
  // routes 是装配层，可以组合业务 feature 和所有通用层。
  { from: { element: { type: "routes" } }, allow: { to: { element: { type: ["features", "components", "hooks", "lib", "types", "api"] } } } },
  // feature 间禁止直接依赖；共享能力应下沉到通用层或由 route 装配。
  { from: { element: { type: "features" } }, allow: { to: { element: { type: ["components", "hooks", "lib", "types", "api"] } } } },
  // 通用层不能反向依赖业务 feature 或 route。
  { from: { element: { type: "components" } }, allow: { to: { element: { type: ["components", "hooks", "lib", "types", "api"] } } } },
  { from: { element: { type: "hooks" } }, allow: { to: { element: { type: ["hooks", "lib", "types", "api", "components"] } } } },
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
    name: "project/frontend-source",
    files: FRONTEND_SOURCE_FILES,
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "apps/frontend/tsconfig.json" },
      },
      "boundaries/elements": frontendBoundaryElements,
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
