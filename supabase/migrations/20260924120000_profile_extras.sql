-- Profile extras for the fintech profile page (name, DOB, phone, bio, etc.)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'NG';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_version INT NOT NULL DEFAULT 0;
