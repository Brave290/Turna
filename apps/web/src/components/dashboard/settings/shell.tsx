'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { SETTINGS_SECTIONS, findSettingsItem } from './nav-config';

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = findSettingsItem(pathname);
  const isIndex = pathname === '/dashboard/settings' || pathname === '/dashboard/settings/';

  return (
    <div className="animate-fade-in max-w-5xl" data-no-swipe>
      {/* Header — simple, no hero */}
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
        {/* Desktop left nav */}
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

        {/* Content */}
        <div className="flex-1 min-w-0 w-full">{children}</div>
      </div>
    </div>
  );
}

/** Standard settings navigation row — icon, label, description, chevron. */
export function SettingsRow({
  href,
  icon: Icon,
  label,
  description,
  value,
  onClick,
  danger,
  type = 'link',
  children,
}: {
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  type?: 'link' | 'button';
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          danger ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
        }`}
      >
        {Icon ? <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-medium ${danger ? 'text-error' : 'text-forest'}`}
        >
          {label}
        </span>
        {description && (
          <span className="block text-xs text-muted mt-0.5 truncate">{description}</span>
        )}
      </span>
      {value && (
        <span className="text-sm text-muted shrink-0 max-w-[40%] truncate">{value}</span>
      )}
      {children}
      {type === 'link' && href && !children && (
        <ChevronRight className="w-4 h-4 text-muted shrink-0" />
      )}
    </>
  );

  const className =
    'w-full flex items-center gap-3 px-1 py-3 min-h-[56px] text-left transition-colors hover:bg-white rounded-xl -mx-1 px-1';

  if (type === 'button' || (!href && onClick)) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return (
    <Link href={href ?? '#'} prefetch className={className}>
      {body}
    </Link>
  );
}

export function SettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      {title && (
        <p className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </p>
      )}
      <div className="rounded-2xl border border-border bg-white divide-y divide-border/60 px-3 shadow-card">
        {children}
      </div>
    </section>
  );
}

export function SettingsPanel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-6">
      {title && (
        <h2 className="font-semibold text-forest mb-1">{title}</h2>
      )}
      {description && <p className="text-sm text-muted mb-5">{description}</p>}
      {children}
    </section>
  );
}
