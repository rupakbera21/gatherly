"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

const heightClasses = {
  sm: "h-8",
  md: "h-9 sm:h-10",
  lg: "h-11 sm:h-12",
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = "md",
  href = "/",
}) => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const checkTheme = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      if (currentTheme === "dark") setTheme("dark");
      else if (currentTheme === "light") setTheme("light");
      else setTheme("system");
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const logoSrc =
    theme === "dark"
      ? "/logo-dark.png"
      : theme === "light"
      ? "/logo.png"
      : undefined;

  const content = (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {logoSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoSrc}
          alt="Gatherly Logo"
          className={`${heightClasses[size]} w-auto object-contain`}
        />
      ) : (
        <picture>
          <source srcSet="/logo-dark.png" media="(prefers-color-scheme: dark)" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Gatherly Logo"
            className={`${heightClasses[size]} w-auto object-contain`}
          />
        </picture>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="no-underline rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center"
        aria-label="Gatherly Home"
      >
        {content}
      </Link>
    );
  }

  return content;
};
