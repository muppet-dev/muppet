import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import SeoBanner from "@/public/banner.png";
import type { ReactNode } from "react";

const inter = Geist({
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const title = {
    template: "%s | muppet",
    default: "muppet - Toolkit for building MCPs",
  };
  const description =
    "Muppet is an open toolkit which standardizes the way you build, test, and deploy your MCPs. If MCP is the USB-C port for AI applications, think of Muppet as the assembly line that produces the USB-C port.";

  return {
    title,
    description,
    keywords: [
      "MCP",
      "MCPs",
      "MCP toolkit",
      "MCP development",
      "Honojs",
      "toolkit",
      "javascript",
      "typescript",
      "hono",
    ],
    metadataBase: new URL("https://muppet.dev"),
    category: "education",
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: {
        width: SeoBanner.width,
        height: SeoBanner.height,
        url: SeoBanner.src,
      },
    },
    openGraph: {
      title,
      description,
      images: {
        width: SeoBanner.width,
        height: SeoBanner.height,
        url: SeoBanner.src,
      },
      siteName: "Muppet Docs",
      url: "/",
      locale: "en_US",
      type: "website",
    },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
