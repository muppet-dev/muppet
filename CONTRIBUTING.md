# Contributing

Thanks for showing interest in contributing to Muppet 💖, you rock!

When it comes to open source, you can contribute in different ways, all of which are valuable.

## Setting up the project

The repository uses pnpm workspaces and nx to manage the monorepo. Project structure is as follows:

- `docs/`: Documentation for the project, built with fuma docs and nextjs.
- `packages/`: Contains the core packages of the project.
- `examples/`: Contains example projects that use the packages in the monorepo. These are also used as templates for the `create-muppet` CLI.

To get started, make sure you have [pnpm](https://pnpm.io/) installed. Then, clone the repository and install the dependencies:

```bash
pnpm install
```
