"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ToastProvider, useToast } from "@/components/toast";
import { ThemeProvider } from "@/components/theme-toggle";

type ActionState = {
  error?: Record<string, string[] | undefined> & { form?: string[] };
  success?: string;
  circleId?: string;
} | null;

/**
 * Syncs server-action state to toast notifications.
 * Returns nothing — combine with useFormState in the consumer.
 */
export function useActionToast<TState extends ActionState>(state: TState) {
  const toast = useToast();
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    if (state.success) {
      toast.success(state.success);
    } else if (state.error?.form?.[0]) {
      toast.error(state.error.form[0]);
    }
  }, [state, toast]);
}

/** Mount once in root layout. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
