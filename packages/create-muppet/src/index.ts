import { program, Option, type Command } from "commander";
import pkg from "../package.json" assert { type: "json" };
import { exec } from "node:child_process";
import { text, select, confirm, spinner } from "@clack/prompts";
import { chdir, exit } from "node:process";
import fs from "node:fs";
import path from "node:path";
import { downloadTemplate } from "giget";
import chalk from "chalk";
import {
  checkPackageManagerInstalled,
  getCurrentPackageManager,
  knownPackageManagerNames,
  knownPackageManagers,
  type PackageManager,
} from "./utils";
import { execa } from "execa";

const TRANSPORT_LAYERS = {
  STDIO: "stdio",
  CLASSIC_SSE: "sse",
  HONO_SSE: "hono-sse",
};

const RUNTIMES_BY_TRANSPORT_LAYER = {
  [TRANSPORT_LAYERS.STDIO]: ["bun", "deno", "nodejs"],
  [TRANSPORT_LAYERS.CLASSIC_SSE]: ["bun", "nodejs"],
  [TRANSPORT_LAYERS.HONO_SSE]: ["bun", "cloudflare-workers", "deno", "nodejs"],
};

const ALL_UNIQUE_TEMPLATES = Array.from(
  new Set(Object.values(RUNTIMES_BY_TRANSPORT_LAYER).flat()),
);

const IS_CURRENT_DIR_REGEX = /^(\.\/|\.\\|\.)$/;
const PROJECT_NAME = new RegExp(/%%PROJECT_NAME.*%%/g);
const WRANGLER_FILES = ["wrangler.toml", "wrangler.json", "wrangler.jsonc"];
const COMPATIBILITY_DATE_TOML = /compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/;
const COMPATIBILITY_DATE_JSON =
  /"compatibility_date"\s*:\s*"\d{4}-\d{2}-\d{2}"/;

// Deno and Netlify need no dependency installation step
const EXCLUDE_TEMPLATES = ["deno", "netlify"];

function mkdirp(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    if (e instanceof Error) {
      if ("code" in e && e.code === "EEXIST") return;
    }
    throw e;
  }
}

program
  .name("create-muppet")
  .description("Create a new Muppet project")
  .version(pkg.version)
  .arguments("[target]")
  .addOption(new Option("-i, --install", "Install dependencies"))
  .addOption(
    new Option("-p, --pm <pm>", "Package manager to use").choices(
      knownPackageManagerNames,
    ),
  )
  .addOption(
    new Option("-t, --transport <transport>", "Transport to use").choices(
      ALL_UNIQUE_TEMPLATES,
    ),
  )
  .addOption(
    new Option("-r, --runtime <template>", "Runtime to use").choices(
      ALL_UNIQUE_TEMPLATES,
    ),
  )
  .addOption(new Option("-o, --offline", "Use offline mode").default(false))
  .action(main);

type ArgOptions = {
  pm?: string;
  offline: boolean;
  install?: boolean;
  transport?: string;
  runtime?: string;
};

async function main(
  targetDir: string | undefined,
  options: ArgOptions,
  command: Command,
) {
  console.log(chalk.gray(`${command.name()} version ${command.version()}`));

  const { install, pm, offline, transport, runtime } = options;

  let target: string;
  if (targetDir) {
    target = targetDir;
    console.log(
      `${chalk.bold(`${chalk.green("✔")} Using target directory`)} … ${target}`,
    );
  } else {
    const answer = await text({
      message: "Target directory",
      defaultValue: "my-app",
    });
    target = String(answer);
  }

  let projectName: string;
  if (IS_CURRENT_DIR_REGEX.test(target)) {
    projectName = path.basename(process.cwd());
  } else {
    projectName = path.basename(target);
  }

  const allTransportLayers = Object.values(TRANSPORT_LAYERS);

  const transportName =
    transport ||
    (await select({
      message: "Which transport layer do you want to use?",
      options: allTransportLayers.map((template) => ({
        value: template,
      })),
    }).then((answer) => String(answer)));

  if (!transportName) {
    throw new Error("No transport layer was selected!");
  }

  if (!allTransportLayers.includes(transportName)) {
    throw new Error(`Invalid template selected: ${transportName}`);
  }

  const runtimeName =
    runtime ||
    (await select({
      message: "Which template do you want to use?",
      options: RUNTIMES_BY_TRANSPORT_LAYER[transportName].map((template) => ({
        value: template,
      })),
    }).then((answer) => String(answer)));

  if (!runtimeName) {
    throw new Error("No runtime was selected!");
  }

  if (!RUNTIMES_BY_TRANSPORT_LAYER[transportName].includes(runtimeName)) {
    throw new Error(`Invalid template selected: ${runtimeName}`);
  }

  if (fs.existsSync(target)) {
    if (fs.readdirSync(target).length > 0) {
      const response = await confirm({
        message: "Directory not empty. Continue?",
        initialValue: false,
      });
      if (!response) {
        process.exit(1);
      }
    }
  } else {
    mkdirp(target);
  }

  const targetDirectoryPath = path.join(process.cwd(), target);

  // Default package manager
  let packageManager = pm ?? "npm";

  try {
    if (!EXCLUDE_TEMPLATES.includes(runtimeName)) {
      let installDeps = false;

      const installedPackageManagerNames = await Promise.all(
        knownPackageManagerNames.map(checkPackageManagerInstalled),
      ).then((results) =>
        knownPackageManagerNames.filter((_, index) => results[index]),
      );

      // hide install dependencies option if no package manager is installed
      if (installedPackageManagerNames.length > 0) {
        // If version 1 of Deno is installed, it will not be suggested because it doesn't have "deno install".
        if (installedPackageManagerNames.includes("deno")) {
          let isVersion1 = false;
          try {
            const { stdout } = await execa("deno", ["-v"]);
            isVersion1 = stdout.split(" ")[1].split(".")[0] === "1";
          } catch {
            isVersion1 = true;
          }
          if (isVersion1) {
            installedPackageManagerNames.splice(
              installedPackageManagerNames.indexOf("deno"),
              1,
            );
          }
        }

        if (typeof install === "boolean") {
          installDeps = install;
        } else {
          installDeps = await confirm({
            message: "Do you want to install project dependencies?",
            initialValue: true,
          }).then((answer) => Boolean(answer));
        }

        if (installDeps) {
          if (
            pm &&
            installedPackageManagerNames.includes(pm as PackageManager)
          ) {
            packageManager = pm;
          } else {
            packageManager = await select({
              message: "Which package manager do you want to use?",
              options: installedPackageManagerNames.map((template) => ({
                value: template,
              })),
              initialValue: getCurrentPackageManager(),
            }).then((answer) => String(answer));
          }
        }
      }
    }

    const spin = spinner();
    spin.start("Cloning the template");

    await downloadTemplate(
      `gh:muppet-dev/muppet/examples/${runtimeName}-${transportName}`,
      {
        dir: targetDirectoryPath,
        offline,
        force: true,
      },
    );

    spin.stop("Cloned", 200);

    chdir(targetDirectoryPath);

    const installCommand =
      knownPackageManagers[packageManager as PackageManager];

    if (!installCommand) {
      exit(1);
    }

    const iSpin = spinner();
    iSpin.start("Installing project dependencies");
    const proc = exec(installCommand);

    const procExit: number = await new Promise((res) => {
      proc.on("exit", (code) => res(code == null ? 0xff : code));
    });

    if (procExit === 0) {
      iSpin.stop("Success");
    } else {
      iSpin.stop("Failed to install project dependencies");
      exit(procExit);
    }

    if (runtimeName === "cloudflare-workers") {
      for (const filename of WRANGLER_FILES) {
        try {
          const wranglerPath = path.join(targetDirectoryPath, filename);
          const wrangler = fs.readFileSync(wranglerPath, "utf-8");
          // Get current date in YYYY-MM-DD format
          const currentDate = new Date().toISOString().split("T")[0];
          const convertProjectName = projectName
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
  } catch (e) {
    throw new Error(
      `Error running hook for ${runtimeName}-${transportName}: ${
        e instanceof Error ? e.message : e
      }`,
    );
  }

  const packageJsonPath = path.join(targetDirectoryPath, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readFileSync(packageJsonPath, "utf-8");

    const packageJsonParsed = JSON.parse(packageJson);
    const newPackageJson = {
      name: projectName,
      ...packageJsonParsed,
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
  }

  console.log(chalk.green(`🎉 ${chalk.bold("Copied project files")}`));
  console.log(chalk.gray("Get started with:"), chalk.bold(`cd ${target}`));
  process.exit(0);
}

program.parse();
