import antfu from "@antfu/eslint-config";

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
  files: ["apps/frontend/src/**/*.{ts,tsx}"],
  rules: {
    "react-refresh/only-export-components": "off",
    "ts/strict-boolean-expressions": ["error", {
      allowString: true,
      allowNumber: false,
      allowNullableObject: true,
      allowNullableBoolean: false,
    }],
  },
});
