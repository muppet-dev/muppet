import { confirm, select } from "@clack/prompts";
import { execa } from "execa";
import {
  checkPackageManagerInstalled,
  getCurrentPackageManager,
  knownPackageManagerNames,
  type PackageManager,
} from "./utils";

// Deno and Netlify need no dependency installation step
const EXCLUDE_TEMPLATES = ["deno", "netlify"];

type FigureOutPackageManagerOptions = {
  runtime: string;
  pm?: string;
  install?: boolean;
};

export async function figureOutPackageManager(
  options: FigureOutPackageManagerOptions,
) {
  const { runtime, pm, install } = options;

  if (EXCLUDE_TEMPLATES.includes(runtime)) return;

  let installDeps = false;

  const installedPackageManagerNames = await Promise.all(
    knownPackageManagerNames.map(checkPackageManagerInstalled),
  ).then((results) =>
    knownPackageManagerNames.filter((_, index) => results[index]),
  );

  // hide install dependencies option if no package manager is installed
  if (installedPackageManagerNames.length === 0) return;

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

  if (!installDeps) return;

  if (pm && installedPackageManagerNames.includes(pm as PackageManager)) {
    return pm;
  }

  return await select({
    message: "Which package manager do you want to use?",
    options: installedPackageManagerNames.map((template) => ({
      value: template,
    })),
    initialValue: getCurrentPackageManager(),
  }).then((answer) => String(answer));
}
