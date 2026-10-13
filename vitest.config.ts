import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

const alias = {
  "@": path.resolve(__dirname, "client"),
  "@shared": path.resolve(__dirname, "shared"),
};

const apiIndex = path.resolve(__dirname, "api/index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    env: {
      VITEST: "true",
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "node",
          include: [
            "api/**/*.test.ts",
            "shared/**/*.spec.ts",
            "client/**/*.spec.ts",
            "lib/**/*.spec.ts",
          ],
          environment: "node",
          env: { VITEST: "true" },
          testTimeout: 20_000,
          hookTimeout: 90_000,
          fileParallelism: 2,
          maxWorkers: 2,
          pool: "forks",
          execArgv: ["--import", "tsx/esm"],
          server: {
            deps: {
              external: [apiIndex, /api\/index\.ts$/],
            },
          },
          sequence: { groupOrder: 0 },
        },
      },
    ],
  },
});
