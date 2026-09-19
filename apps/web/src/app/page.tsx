import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-white">
              Turna<span className="text-primary">.</span>
            </h1>
            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6">
            Your turn to <span className="text-primary">collect</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-lg mx-auto">
            Turna brings esusu, ajo, and chama into one simple app. Track contributions, know your payout date, and build real trust.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/signup" className="btn-primary text-lg py-3 px-8">
              Start saving
            </Link>
            <Link href="/auth/login" className="btn-secondary text-lg py-3 px-8">
              Sign in
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-muted">
          <p>Built by Akanji Mus&lsquo;ab · Brave hx Technology · Founda Technologies</p>
        </div>
      </footer>
    </div>
  );
}