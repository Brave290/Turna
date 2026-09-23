"use client";

import {
  motion,
  type Variants,
  type HTMLMotionProps,
  useReducedMotion,
} from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, filter: "blur(10px)" },
  show: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease },
  },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease } },
};

type MotionDivProps = Omit<HTMLMotionProps<"div">, "style"> & {
  children: ReactNode;
  variant?: "fade-in" | "fade-up" | "scale-in" | "slide-left" | "slide-right";
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
};

const variantMap = {
  "fade-up": fadeUp,
  "fade-in": fadeIn,
  "scale-in": scaleIn,
  "slide-left": slideLeft,
  "slide-right": slideRight,
} as const;

export function Motion({
  children,
  variant = "fade-up",
  delay = 0,
  y,
  ...props
}: MotionDivProps) {
  const reduce = useReducedMotion();
  const key = variant === "fade-in" || variant === "fade-up" || variant === "scale-in" || variant === "slide-left" || variant === "slide-right"
    ? variant
    : "fade-up";
  const v = variantMap[key];

  if (reduce) {
    return (
      <div className={props.className} style={props.style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -40px 0px" }}
      variants={v}
      transition={delay ? { delay, duration: 0.55, ease } : undefined}
      style={y !== undefined ? { ...props.style, y } : props.style}
      className={props.className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  stagger = 0.07,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export { motion };
