import eslintPluginAstro from "eslint-plugin-astro";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...eslintPluginAstro.configs.recommended.filter((conf) => conf.files),
  ...eslintPluginAstro.configs["jsx-a11y-strict"].filter((conf) => conf.files),
  {
    files: ["**/*.astro"],
    extends: [
      ...eslintPluginAstro.configs.recommended.filter((conf) => !conf.files),
      ...eslintPluginAstro.configs["jsx-a11y-strict"].filter(
        (conf) => !conf.files
      ),
    ],
  },
  {
    files: ["src/**/*.css"],
    plugins: {
      css,
    },
    language: "css/css",
    rules: {
      "css/no-duplicate-imports": "error",
      // Lint CSS files to ensure they are using
      // only Baseline Widely available features:
      "css/use-baseline": [
        "error",
        {
          available: "widely",
        },
      ],
    },
  },
]);
