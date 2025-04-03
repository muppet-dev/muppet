import * as p from "@clack/prompts";
import chalk from "chalk";
import { type Command, Option, program } from "commander";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chdir, exit } from "node:process";
import pkg from "../package.json" assert { type: "json" };
import { cleanup } from "./cleanup";
import { figureOutPackageManager } from "./package-manager";
import {
  ALL_TRANSPORT_LAYERS,
  ALL_UNIQUE_TEMPLATES,
  RUNTIMES_BY_TRANSPORT_LAYER,
  TRANSPORT_LAYERS,
  download,
} from "./template";
import {
  type PackageManager,
  knownPackageManagerNames,
  knownPackageManagers,
} from "./utils";

const IS_CURRENT_DIR_REGEX = /^(\.\/|\.\\|\.)$/;

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
      ALL_TRANSPORT_LAYERS,
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
  p.intro(`${command.name()} v${command.version()}`);

  const { install, pm, offline, transport, runtime } = options;

  let target: string;
  if (targetDir) {
    target = targetDir;
    p.note(`Using target directory - ${chalk.green(chalk.bold(target))}`);
  } else {
    const answer = await p.text({
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

  const transportName =
    transport ||
    (await p
      .select({
        message: "Which transport layer do you want to use?",
        options: Object.values(TRANSPORT_LAYERS),
      })
      .then((answer) => String(answer)));

  if (!transportName) {
    throw new Error("No transport layer was selected!");
  }

  if (!ALL_TRANSPORT_LAYERS.includes(transportName)) {
    throw new Error(`Invalid template selected: ${transportName}`);
  }

  const runtimeName =
    runtime ||
    (await p
      .select({
        message: "Which runtime do you want to use?",
        options: RUNTIMES_BY_TRANSPORT_LAYER[transportName].map((template) =>
          typeof template === "string" ? { value: template } : template,
        ),
      })
      .then((answer) => String(answer)));

  if (!runtimeName) {
    throw new Error("No runtime was selected!");
  }

  if (!RUNTIMES_BY_TRANSPORT_LAYER[transportName].includes(runtimeName)) {
    throw new Error(`Invalid template selected: ${runtimeName}`);
  }

  if (fs.existsSync(target)) {
    if (fs.readdirSync(target).length > 0) {
      const response = await p.confirm({
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

  try {
    // Default package manager
    const packageManager = await figureOutPackageManager({
      runtime: runtimeName,
      pm,
      install,
    });

    let spin = p.spinner({ indicator: "timer" });
    spin.start("Cloning project files");

    await download({
      runtime: runtimeName,
      transport: transportName,
      dir: targetDirectoryPath,
      offline,
    });

    spin.stop("Cloned project files");

    chdir(targetDirectoryPath);

    if (packageManager) {
      const installCommand =
        knownPackageManagers[packageManager as PackageManager];

      if (!installCommand) {
        exit(1);
      }

      spin = p.spinner({ indicator: "timer" });
      spin.start("Installing project dependencies");
      const proc = exec(installCommand);

      const procExit: number = await new Promise((res) => {
        proc.on("exit", (code) => res(code == null ? 0xff : code));
      });

      if (procExit === 0) {
        spin.stop("Installed project dependencies");
      } else {
        spin.stop("Failed to install project dependencies", 2);
        exit(procExit);
      }
    }

    cleanup({
      dir: targetDirectoryPath,
      name: projectName,
      runtime: runtimeName,
    });
  } catch (e) {
    throw new Error(
      `Error running hook for ${runtimeName}-${transportName}: ${
        e instanceof Error ? e.message : e
      }`,
    );
  }

  p.note(`Get started with - ${chalk.green(chalk.bold(`cd ${target}`))}`);
  p.outro(`${chalk.bold("Muppet project created successfully!")}`);
  process.exit(0);
}

program.parse();
