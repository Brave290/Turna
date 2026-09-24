import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-forest text-white flex flex-col app-bg">
      {/* Header */}
      <header className="px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <Logo variant="on-dark" size={24} />
          <span className="font-display text-lg font-bold tracking-tight">Turna</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer — big-company style */}
      <footer className="px-6 py-5 text-center text-sm text-white/60">
        &copy; {new Date().getFullYear()} Turna. All rights reserved.
      </footer>
    </div>
  );
}
