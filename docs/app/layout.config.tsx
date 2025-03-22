import { Logo } from "@/components/Logo";
import { FaBluesky, FaXTwitter } from "react-icons/fa6";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <Logo />,
  },
  links: [
    {
      type: "icon",
      icon: <FaBluesky />,
      text: "X",
      url: "https://x.com/muppetdev",
    },
    {
      type: "icon",
      icon: <FaXTwitter />,
      text: "BlueSky",
      url: "https://bsky.app/profile/muppet.dev",
    },
  ],
  githubUrl: "https://github.com/muppet-dev/muppet",
};
