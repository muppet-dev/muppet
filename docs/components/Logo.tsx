"use client";
import Image from "next/image";
import MuppetLightLogo from "@/public/logo-light.png";
import MuppetDarkLogo from "@/public/logo-dark.png";

export function Logo() {
  return (
    <>
      <Image
        src={MuppetDarkLogo}
        className="hidden dark:block"
        alt="muppet logo"
        width={100}
      />
      <Image
        src={MuppetLightLogo}
        className="block dark:hidden"
        alt="muppet logo"
        width={100}
      />
    </>
  );
}
