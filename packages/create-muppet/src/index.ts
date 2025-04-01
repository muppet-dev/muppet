import { program, Option, type Command } from "commander";
import pkg from "../package.json" assert { type: "json" };
import chalk from "chalk";

const TEMPLATES = ["nodejs"];

program
  .name("create-muppet")
  .description("Create a new Muppet project")
  .version(pkg.version)
  .arguments("[target]")
  .addOption(new Option("-i, --install", "Install dependencies"))
  .addOption(new Option("-p, --pm <pm>", "Package manager to use").choices([]))
  .addOption(
    new Option("-t, --template <template>", "Template to use").choices(
      TEMPLATES,
    ),
  )
  .addOption(new Option("-o, --offline", "Use offline mode").default(false))
  .action(main);

type ArgOptions = {
  pm?: string;
  offline: boolean;
  install?: boolean;
  template?: string;
};

async function main(
  targetDir: string | undefined,
  options: ArgOptions,
  command: Command,
) {
  console.log(chalk.gray(`${command.name()} version ${command.version()}`));
}

program.parse();
