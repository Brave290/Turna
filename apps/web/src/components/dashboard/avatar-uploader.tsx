'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { Camera, X, Upload } from 'lucide-react';
import {
  uploadAvatar,
  removeAvatar,
  type AvatarActionState,
} from '@/lib/auth-actions';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';
import { getInitials } from '@/lib/utils';

/**
 * Profile picture picker — upload / preview / remove.
 * Avatar stored as data URL on profiles.avatar_url (small images, 5MB cap).
 */
export function AvatarUploader({
  displayName,
  email,
  avatarUrl,
  avatarVersion,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  avatarVersion?: number | null;
}) {
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useFormState(uploadAvatar, null as AvatarActionState);
  const lastKeyRef = useRef('');

  useEffect(() => {
    setPreview(avatarUrl);
  }, [avatarUrl, avatarVersion]);

  useEffect(() => {
    if (!state) return;
    const key = JSON.stringify({
      s: state.success ?? null,
      e: state.error?.form?.[0] ?? null,
    });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (state.success) toast.success(state.success);
    else if (state.error?.form?.[0]) toast.error(state.error.form[0]);
  }, [state, toast]);

  const initials = getInitials(displayName || email || 'TU');

  async function onRemove() {
    setBusy(true);
    try {
      const res = await removeAvatar();
      if (res?.success) {
        toast.success(res.success);
        setPreview(null);
      } else if (res?.error?.form?.[0]) {
        toast.error(res.error.form[0]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative group">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={displayName || 'Profile'}
            className="w-20 h-20 rounded-2xl object-cover shadow-card border border-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-forest text-primary-light flex items-center justify-center font-display text-2xl font-bold shadow-card">
            {initials}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-card hover:bg-primary-light transition-colors"
          aria-label="Change profile picture"
          disabled={busy}
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline text-sm py-2" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="w-4 h-4 mr-1.5" />
            Upload picture
          </button>
          {preview && (
            <button type="button" className="btn-outline text-sm py-2" onClick={onRemove} disabled={busy}>
              {busy ? <Spinner /> : <X className="w-4 h-4 mr-1.5" />}
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-muted">JPG or PNG · up to 5MB</p>
        {state?.error?.form?.[0] && (
          <p className="text-sm text-error" role="alert">
            {state.error.form[0]}
          </p>
        )}
      </div>

      <form action={formAction} className="hidden">
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) {
              toast.error('Image must be 5MB or smaller.');
              e.target.value = '';
              return;
            }
            const reader = new FileReader();
            reader.onload = () => setPreview(String(reader.result));
            reader.readAsDataURL(f);
            // Auto-submit upload
            e.target.form?.requestSubmit();
          }}
        />
        <button type="submit" hidden />
      </form>
    </div>
  );
}
