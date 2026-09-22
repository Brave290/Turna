import Link from "next/link";
import { AuthLogo } from "@/app/auth/layout";

export default function AuthSplashPage() {
  return (
    <div className="animate-fade-in flex flex-col items-center text-center py-6">
      <AuthLogo className="w-24 h-24 text-primary mb-8" />

      <h1 className="font-display text-6xl font-bold tracking-tight mb-4">
        Turna
      </h1>

      <p className="text-lg text-white/60 mb-12">
        Save Together. Grow Together.
      </p>

      <div className="w-full space-y-4">
        <Link href="/auth/signup" className="btn-primary w-full">
          Get Started
        </Link>
        <Link
          href="/auth/login"
          className="btn w-full border border-white/20 bg-transparent text-white hover:bg-white/10 rounded-xl px-6 py-3"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
