import { defineConfig, type PluginOption } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

const NODEJS_COMPAT_DEFAULT_ON_DATE = "2024-09-23";
const WRANGLER_CONFIG_PATH = "dist/server/wrangler.json";

/** Drops the redundant `nodejs_compat` flag when the compat date already enables it. */
function stripRedundantNodejsCompatFlag(): PluginOption {
  let root = process.cwd();
  return {
    name: "strip-redundant-nodejs-compat",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    buildApp: {
      order: "post",
      handler: async () => {
        const { readFile, writeFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const configPath = join(root, WRANGLER_CONFIG_PATH);
        let config: Record<string, unknown>;
        try {
          config = JSON.parse(await readFile(configPath, "utf8"));
        } catch {
          return;
        }
        const date = config['compatibility_date'];
        const flags = config['compatibility_flags'];
        if (typeof date !== "string" || date < NODEJS_COMPAT_DEFAULT_ON_DATE) return;
        if (!Array.isArray(flags)) return;
        const next = flags.filter((flag) => flag !== "nodejs_compat");
        if (next.length === flags.length) return;
        await writeFile(configPath, JSON.stringify({ ...config, compatibility_flags: next }, null, 2));
      },
    },
  } as PluginOption;
}

export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
  ];

  // Production server bundle (Cloudflare Workers) — only needed for builds.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(
      nitro({
        preset: "cloudflare-module",
        output: {
          dir: "dist",
          serverDir: "dist/server",
          publicDir: "dist/client",
        },
        cloudflare: { nodeCompat: true, deployConfig: true },
      }) as unknown as PluginOption,
      stripRedundantNodejsCompatFlag(),
    );
  }

  plugins.push(viteReact());

  return {
    plugins,
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
