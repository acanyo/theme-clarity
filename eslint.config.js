import parser from "@typescript-eslint/parser";
import typescript from "@typescript-eslint/eslint-plugin";

export default [
  { ignores: ["node_modules/**", "templates/assets/**", "dist/**"] },
  {
    files: ["src/**/*.{js,ts,tsx,cjs,mjs,cts,mts}"],
    languageOptions: { parser, parserOptions: { ecmaVersion: "latest", sourceType: "module" } },
    plugins: { "@typescript-eslint": typescript },
    rules: {
      ...typescript.configs.recommended.rules,
      // Existing Alpine and plugin integrations expose untyped third-party data.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
];
