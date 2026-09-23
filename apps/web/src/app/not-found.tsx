import Link from "next/link";
import { PageEnter } from "@/components/page-enter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <PageEnter className="text-center max-w-md">
        <div className="text-6xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-bold text-forest mb-2">Page not found</h1>
        <p className="text-muted mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary inline-flex">
          Go home
        </Link>
      </PageEnter>
    </div>
  );
}
