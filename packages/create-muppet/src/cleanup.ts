import fs from "node:fs";
import path from "node:path";

const PROJECT_NAME = new RegExp(/%%PROJECT_NAME.*%%/g);
const WRANGLER_FILES = ["wrangler.toml", "wrangler.json", "wrangler.jsonc"];
const COMPATIBILITY_DATE_TOML = /compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/;
const COMPATIBILITY_DATE_JSON =
  /"compatibility_date"\s*:\s*"\d{4}-\d{2}-\d{2}"/;

type CleanupOptions = {
  dir: string;
  name: string;
  runtime: string;
};

export function cleanup(options: CleanupOptions) {
  const { dir, name, runtime } = options;

  if (runtime === "cloudflare-workers") {
    for (const filename of WRANGLER_FILES) {
      try {
        const wranglerPath = path.join(dir, filename);
        const wrangler = fs.readFileSync(wranglerPath, "utf-8");
        // Get current date in YYYY-MM-DD format
        const currentDate = new Date().toISOString().split("T")[0];
        const convertProjectName = name
          .toLowerCase()
          .replaceAll(/[^a-z0-9\-_]/gm, "-");
        const rewritten = wrangler
          .replaceAll(PROJECT_NAME, convertProjectName)
          .replace(
            COMPATIBILITY_DATE_TOML,
            `compatibility_date = "${currentDate}"`,
          )
          .replace(
            COMPATIBILITY_DATE_JSON,
            `"compatibility_date": "${currentDate}"`,
          );
        fs.writeFileSync(wranglerPath, rewritten);
      } catch {}
    }
  }

  const packageJsonPath = path.join(dir, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readFileSync(packageJsonPath, "utf-8");

    const packageJsonParsed = JSON.parse(packageJson);
    const newPackageJson = {
      name,
      ...packageJsonParsed,
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
  }
}
