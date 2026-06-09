import antfu from "@antfu/eslint-config";

const appSourceFiles = ["apps/{frontend,backend}/src/**/*.{ts,tsx}"];
const backendBootstrapFiles = ["apps/backend/src/index.ts"];
const frontendSourceFiles = ["apps/frontend/src/**/*.{ts,tsx}"];

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
    "apps/backend/src/db/migrations/**",
  ],
  rules: {
    "style/brace-style": ["error", "1tbs", { allowSingleLine: true }],
    "jsdoc/check-param-names": "off",
  },
}).append({
  files: appSourceFiles,
  rules: {
    "ts/strict-boolean-expressions": ["error", {
      allowString: true,
      allowNumber: false,
      allowNullableObject: true,
      allowNullableBoolean: false,
    }],
  },
}).append({
  files: frontendSourceFiles,
  rules: {
    "react-refresh/only-export-components": "off",
  },
}).append({
  files: backendBootstrapFiles,
  rules: {
    "no-console": ["error", { allow: ["log", "warn", "error"] }],
  },
});
