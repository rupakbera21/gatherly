import React from "react";
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
  const content = (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* Light theme logo: displays on light background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Gatherly"
        className={`brand-logo-light ${heightClasses[size]} w-auto object-contain`}
      />
      {/* Dark theme logo: displays on dark background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.png"
        alt="Gatherly"
        className={`brand-logo-dark ${heightClasses[size]} w-auto object-contain`}
      />
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

