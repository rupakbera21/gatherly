import React from "react";
import Link from "next/link";
import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

const heightClasses = {
  sm: "h-8",
  md: "h-9 sm:h-10",
  lg: "h-10 sm:h-11",
};

const dimensions = {
  sm: { width: 95, height: 32 },
  md: { width: 119, height: 40 },
  lg: { width: 131, height: 44 },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = "md",
  href = "/",
}) => {
  const { width, height } = dimensions[size];

  const content = (
    <div className={`inline-flex items-center select-none overflow-hidden max-w-full ${className}`}>
      {/* Light theme logo: displays on light background with explicit dimensions */}
      <Image
        src="/logo-opt.png"
        alt="Gatherly"
        width={width}
        height={height}
        priority
        className={`brand-logo-light ${heightClasses[size]} w-auto max-w-full object-contain`}
        style={{ maxHeight: `${height}px`, width: "auto" }}
      />
      {/* Dark theme logo: displays on dark background with explicit dimensions */}
      <Image
        src="/logo-dark-opt.png"
        alt="Gatherly"
        width={width}
        height={height}
        loading="lazy"
        className={`brand-logo-dark ${heightClasses[size]} w-auto max-w-full object-contain`}
        style={{ maxHeight: `${height}px`, width: "auto" }}
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="no-underline rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center max-w-full"
        aria-label="Gatherly Home"
      >
        {content}
      </Link>
    );
  }

  return content;
};


