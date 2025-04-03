import { execa } from "execa";

export type PackageManager = "npm" | "bun" | "deno" | "pnpm" | "yarn";

export const knownPackageManagers: Record<PackageManager, string> = {
  npm: "npm install",
  bun: "bun install",
  deno: "deno install",
  pnpm: "pnpm install",
  yarn: "yarn",
};

export const knownPackageManagerNames = Object.keys(
  knownPackageManagers,
) as PackageManager[];

export function checkPackageManagerInstalled(packageManager: string) {
  return new Promise<boolean>((resolve) => {
    execa(packageManager, ["--version"])
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
}

export function getCurrentPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent || "npm"; // Types say it might be undefined, just being cautious;

  if (agent.startsWith("bun")) return "bun";
  if (agent.startsWith("deno")) return "deno";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";

  return "npm";
}
