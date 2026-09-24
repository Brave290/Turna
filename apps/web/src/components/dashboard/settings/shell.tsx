import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** Standard settings navigation row — icon, label, description, chevron. */
export function SettingsRow({
  href,
  icon: Icon,
  label,
  description,
  value,
  danger,
  type = 'link',
  onClick,
  children,
}: {
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  value?: string;
  danger?: boolean;
  type?: 'link' | 'button';
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          danger ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
        }`}
      >
        {Icon ? <Icon className="w-[18px] h-[18px]" /> : null}
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
    'w-full flex items-center gap-3 px-1 py-3 min-h-[56px] text-left transition-colors hover:bg-white rounded-xl -mx-1';

  if (type === 'button') {
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
      {title && <h2 className="font-semibold text-forest mb-1">{title}</h2>}
      {description && <p className="text-sm text-muted mb-5">{description}</p>}
      {children}
    </section>
  );
}
