import { build } from "esbuild";

build({
  bundle: true,
  entryPoints: ["./src/index.ts"],
  banner: {
    js: "#!/usr/bin/env node",
  },
  platform: "node",
  outfile: "bin",
  format: "cjs",
  minify: true,
});
