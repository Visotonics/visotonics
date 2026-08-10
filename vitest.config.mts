import { defineConfig } from "vitest/config";
import path from "node:path";

/* ---------------------------------------------------------------------------
   Test config. The only thing worth knowing here is the `@/` alias — it has
   to mirror tsconfig.json's paths or every import of `@/lib/...` fails.

   `tests/**` only. Deliberately NOT picking up anything under app/ or
   components/, so this never tries to run the three.js scenes.
--------------------------------------------------------------------------- */

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Integration tests hit a real server and a real Supabase project; running
    // them in parallel would have them fighting over the same rows.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
