"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, AlertTriangle, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };

type ToastFn = {
  (options: ToastOptions | string): void;
  success: (message: string, options?: Omit<ToastOptions, "description" | "variant">) => void;
  error: (message: string, options?: Omit<ToastOptions, "description" | "variant">) => void;
  info: (message: string, options?: Omit<ToastOptions, "description" | "variant">) => void;
  warning: (message: string, options?: Omit<ToastOptions, "description" | "variant">) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastFn | null>(null);

const DEFAULT_DURATION = 4200;

const variantStyles: Record<ToastVariant, { ring: string; icon: ReactNode; title: string }> = {
  success: {
    ring: "border-primary/40 shadow-glow/20",
    icon: <CheckCircle2 className="w-5 h-5 text-primary shrink-0" aria-hidden />,
    title: "text-forest",
  },
  error: {
    ring: "border-error/40 shadow-[0_8px_30px_rgba(244,63,94,0.15)]",
    icon: <XCircle className="w-5 h-5 text-error shrink-0" aria-hidden />,
    title: "text-forest",
  },
  warning: {
    ring: "border-warning/40 shadow-[0_8px_30px_rgba(245,158,11,0.15)]",
    icon: <AlertTriangle className="w-5 h-5 text-warning shrink-0" aria-hidden />,
    title: "text-forest",
  },
  info: {
    ring: "border-sky/40 shadow-[0_8px_30px_rgba(56,189,248,0.15)]",
    icon: <Info className="w-5 h-5 text-sky shrink-0" aria-hidden />,
    title: "text-forest",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (options: ToastOptions | string) => {
      const opts: ToastOptions = typeof options === "string" ? { description: options } : options;
      const id = ++idRef.current;
      const item: ToastItem = {
        id,
        variant: opts.variant ?? "info",
        title: opts.title,
        description: opts.description,
        duration: opts.duration ?? DEFAULT_DURATION,
      };
      setToasts((prev) => [...prev.slice(-4), item]);
      const t = setTimeout(() => dismiss(id), item.duration);
      timersRef.current.set(id, t);
    },
    [dismiss]
  );

  const api = useMemo(() => {
    const fn = ((options: ToastOptions | string) => push(options)) as ToastFn;
    fn.success = (message, options) => push({ ...options, description: message, variant: "success" });
    fn.error = (message, options) => push({ ...options, description: message, variant: "error", duration: options?.duration ?? 5200 });
    fn.info = (message, options) => push({ ...options, description: message, variant: "info" });
    fn.warning = (message, options) => push({ ...options, description: message, variant: "warning" });
    fn.dismiss = dismiss;
    return fn;
  }, [push, dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Always dead-center of the viewport — never bottom/side (user requirement).
  // Portaled to body so parent transform/filter cannot re-anchor fixed.
  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="no-print fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const style = variantStyles[t.variant ?? "info"];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", bounce: 0.28, duration: 0.45 }}
              className={`pointer-events-auto w-full max-w-sm rounded-2xl border bg-white/98 backdrop-blur-xl px-4 py-3.5 shadow-card ${style.ring}`}
              role="status"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  {t.title && (
                    <p className={`text-sm font-semibold ${style.title}`}>{t.title}</p>
                  )}
                  {t.description && (
                    <p className="text-sm text-muted leading-snug mt-0.5 break-words">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-lg p-1 text-muted hover:text-forest hover:bg-border/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
