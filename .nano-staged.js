module.exports = {
  "{apps,packages}/**/*.{js,jsx,ts,tsx,json}": (api) =>
    `pnpm dlx @biomejs/biome check --write ${api.filenames.join(" ")}`,
};
