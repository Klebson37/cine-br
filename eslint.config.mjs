import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Copias locais das skills do plugin superpowers. Nao sao codigo do
    // projeto e ja estao no .gitignore; sem isto o lint reprova por erros
    // que nao temos como corrigir.
    ".claude/**",
  ]),
]);

export default eslintConfig;
