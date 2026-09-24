'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SETTINGS_SECTIONS, findSettingsItem } from './nav-config';

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = findSettingsItem(pathname);
  const isIndex = pathname === '/dashboard/settings' || pathname === '/dashboard/settings/';

  return (
    <div className="animate-fade-in max-w-5xl" data-no-swipe>
      <div className="mb-6">
        {!isIndex && (
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Settings
          </Link>
        )}
        <h1 className="font-display text-3xl font-bold tracking-tight text-forest">
          {active?.label ?? 'Settings'}
        </h1>
        <p className="text-muted mt-1">
          {active?.description ?? 'Manage your account and preferences'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        <aside className="hidden lg:block w-56 shrink-0 sticky top-6">
          <nav className="space-y-6" aria-label="Settings sections">
            {SETTINGS_SECTIONS.map((section) => (
              <div key={section.id}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          prefetch
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-forest/80 hover:bg-white hover:text-forest'
                          }`}
                        >
                          <item.icon className="w-4 h-4 shrink-0 opacity-70" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 w-full">{children}</div>
      </div>
    </div>
  );
}
