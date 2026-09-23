import type { HTMLAttributes } from "react";
import Image from "next/image";

type LogoVariant = "default" | "dark" | "primary" | "on-dark";

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
}

interface WordmarkProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: LogoVariant;
  size?: number;
}

const VARIANT_SRC: Record<LogoVariant, string> = {
  default: "/logo.png",
  dark: "/logo-dark.png",
  primary: "/logo.png",
  "on-dark": "/logo-on-dark.png",
};

/**
 * Turna logo — real brand assets from /public.
 * Variants map to logo.png / logo-dark.png / logo-on-dark.png.
 */
export function Logo({
  variant = "default",
  size = 32,
  alt = "Turna",
  className,
  priority,
}: LogoProps) {
  return (
    <Image
      src={VARIANT_SRC[variant]}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-contain${className ? ` ${className}` : ""}`}
    />
  );
}

export function LogoWordmark({
  variant = "on-dark",
  size = 32,
  ...props
}: WordmarkProps) {
  const textColor =
    variant === "on-dark" || variant === "dark"
      ? "text-white"
      : "text-forest";

  return (
    <span className={`inline-flex items-center gap-2 ${textColor}`} {...props}>
      <Logo variant={variant} size={size} />
      <span className="font-display text-xl font-bold tracking-tight">
        Turna
      </span>
    </span>
  );
}
