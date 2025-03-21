// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://muppet.dev",
  redirects: {
    "/": {
      status: 301,
      destination: "/introduction",
    },
  },
  integrations: [
    starlight({
      title: "muppet",
      logo: {
        light: "./src/assets/logo-light.png",
        dark: "./src/assets/logo-dark.png",
        replacesTitle: true,
      },
      social: {
        blueSky: "https://bsky.app/profile/muppet.dev",
        "x.com": "https://x.com/muppetdev",
        github: "https://github.com/muppet-dev/muppet",
      },
      editLink: {
        baseUrl: "https://github.com/muppet-dev/muppet/tree/main/docs",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "introduction" },
            {
              label: "Quickstart",
              items: [
                {
                  label: "For Server Developers",
                  slug: "quickstart/server",
                },
                {
                  label: "For Users",
                  slug: "quickstart/user",
                },
              ],
            },
            { label: "Examples", slug: "examples" },
          ],
        },
        {
          label: "Tutorials",
          items: [
            { label: "Debugging", slug: "tutorials/debugging" },
            { label: "Inspector", slug: "tutorials/inspector" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { label: "Core architecture", slug: "concepts/architecture" },
            { label: "Resources", slug: "concepts/resources" },
            { label: "Prompts", slug: "concepts/prompts" },
            { label: "Tools", slug: "concepts/tools" },
          ],
        },
        {
          label: "Development",
          items: [{ label: "Contributing", slug: "development/contributing" }],
        },
      ],
    }),
  ],
});
