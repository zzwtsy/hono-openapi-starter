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
    "apps/backend/openapi.json",
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
});
