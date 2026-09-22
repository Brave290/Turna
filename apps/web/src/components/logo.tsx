import type { SVGProps, HTMLAttributes } from "react";

type LogoVariant = "default" | "dark" | "primary" | "on-dark";

interface LogoProps extends SVGProps<SVGSVGElement> {
  variant?: LogoVariant;
  size?: number;
}

interface WordmarkProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: LogoVariant;
  size?: number;
}

/**
 * Turna logo — single source of truth.
 * Static exports live in /public: logo.svg, logo-dark.svg,
 * logo-primary.svg, logo-white.svg, logo-on-dark.svg, favicon.svg
 * Raster versions: logo.png, logo.webp, logo.jpg (in /public)
 */
export function Logo({ variant = "default", size = 32, ...props }: LogoProps) {
  const palettes: Record<
    LogoVariant,
    { bg?: string; arc1: string; arc2: string; t: string; node: string }
  > = {
    default: { arc1: "#00A878", arc2: "#35D6A0", t: "#03251B", node: "#00A878" },
    dark: { bg: "#03251B", arc1: "#00A878", arc2: "#35D6A0", t: "#FFFFFF", node: "#00A878" },
    primary: { bg: "#00A878", arc1: "#FFFFFF", arc2: "#E8FFF5", t: "#03251B", node: "#03251B" },
    "on-dark": { arc1: "#FFFFFF", arc2: "#35D6A0", t: "#FFFFFF", node: "#00A878" },
  };

  const c = palettes[variant];
  const hasBg = Boolean(c.bg);

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Turna logo"
      {...props}
    >
      {hasBg && (
        <rect width="128" height="128" rx="28" fill={c.bg} />
      )}
      {/* Outer cycle */}
      <path
        d={hasBg ? "M64 20a44 44 0 1 1-31.11 12.89" : "M64 12a52 52 0 1 1-36.77 15.23"}
        stroke={c.arc1}
        strokeWidth={hasBg ? 9 : 10}
        strokeLinecap="round"
      />
      {/* Inner cycle */}
      <path
        d={hasBg ? "M64 40a24 24 0 1 0 16.97 7.03" : "M64 36a28 28 0 1 0 19.8 8.2"}
        stroke={c.arc2}
        strokeWidth={hasBg ? 9 : 10}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* T stem */}
      <path
        d={hasBg ? "M64 47v34" : "M64 44v40"}
        stroke={c.t}
        strokeWidth={hasBg ? 8 : 9}
        strokeLinecap="round"
      />
      {/* T crossbar */}
      <path
        d={hasBg ? "M47 54h34" : "M44 52h40"}
        stroke={c.t}
        strokeWidth={hasBg ? 8 : 9}
        strokeLinecap="round"
      />
      {/* Center node */}
      <circle cx="64" cy={hasBg ? 54 : 52} r={hasBg ? 6 : 7} fill={c.node} />
    </svg>
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
