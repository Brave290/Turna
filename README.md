<div align="center">

# 🔶 Turna

### *Your turn to collect.*

<br/>

[![CI](https://github.com/Brave290/Turna/actions/workflows/ci.yml/badge.svg)](https://github.com/Brave290/Turna/actions/workflows/ci.yml)
[![Release](https://github.com/Brave290/Turna/actions/workflows/release.yml/badge.svg)](https://github.com/Brave290/Turna/actions/workflows/release.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<br/>

**Turna** brings 🌍 **esusu**, **ajo**, and **chama** into one simple app.<br/>
Track contributions, know your payout date, and build **real trust**.

<br/>

[🚀 Get Started](#-quick-start) · [📦 Deploy](#-deployment) · [📖 Docs](#-documentation) · [🤝 Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#%EF%B8%8F-architecture)
- [🎨 Design System](#-design-system)
- [⚡ Tech Stack](#-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [📦 Deployment](#-deployment)
- [📖 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [🔒 Security](#-security)
- [📜 License](#-license)

---

## ✨ Features

<table>
<tr>
<td>

**💰 Savings Circles**
- Create & join circles
- Set contribution amounts
- Automatic cycle management
- Real-time balance tracking

</td>
<td>

**👥 Member Management**
- Invite via email/phone
- Role-based access (owner/treasurer/member)
- Two-party confirmation system
- Activity audit trail

</td>
<td>

**📊 Ledger & Tracking**
- Append-only event log
- Hash-chained integrity
- Contribution tracking
- Payout history

</td>
</tr>
<tr>
<td>

**🔔 Notifications**
- Contribution reminders
- Payout alerts
- Cycle updates
- Email notifications (Gmail SMTP via nodemailer)

</td>
<td>

**🔒 Security**
- Row-Level Security (RLS)
- Encrypted at rest
- SOC 2 compliant paths
- No floating-point money

</td>
<td>

**📱 Cross-Platform**
- Web (Next.js)
- Android (React Native)
- iOS (planned)
- Real-time sync

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                            │
├──────────────────────┬──────────────────────────────────┤
│   🌐 Web (Next.js)   │   📱 Mobile (React Native)       │
│   App Router          │   Android + iOS                  │
│   Server Components   │   Native modules                 │
└──────────┬───────────┴──────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API LAYER                             │
├──────────────────────┬──────────────────────────────────┤
│  Server Actions      │   Edge Functions                 │
│  Type-safe           │   Real-time subscriptions        │
└──────────┬───────────┴──────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                  CORE SERVICES                           │
├─────────────────────────────────────────────────────────┤
│  @turna/core          │  Business logic                 │
│  @turna/validation    │  Zod schemas                    │
│  @turna/types         │  TypeScript types                │
└──────────────────────┴──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE                                │
├─────────────────────────────────────────────────────────┤
│  🐘 PostgreSQL (Supabase)                                │
│  🔐 Row-Level Security (RLS)                             │
│  📡 Realtime subscriptions                               │
│  🔑 Auth (Email + Google OAuth)                          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| 🌐 **Frontend** | Next.js 14 | App Router, Server Components, SEO |
| 📱 **Mobile** | React Native CLI | Native Android/iOS |
| 🗄️ **Database** | PostgreSQL (Supabase) | Data storage, Auth, Realtime |
| 🔐 **Auth** | Supabase Auth | Email/Password + Google OAuth |
| 📧 **Email** | Gmail SMTP (nodemailer) | Transactional emails from support.turna@gmail.com |
| 🎨 **Styling** | Tailwind CSS | Utility-first styling |
| 📝 **Validation** | Zod | Schema validation |
| 🔷 **Language** | TypeScript | Type safety |
| 📦 **Package Manager** | pnpm | Monorepo workspace |
| 🚀 **CI/CD** | GitHub Actions | Automated testing & deployment |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.0.0
- **Docker** (for local Supabase)
- **Supabase CLI** ≥ 1.145.0

### 1️⃣ Clone & Install

```bash
git clone https://github.com/Brave290/Turna.git
cd Turna
pnpm install
```

### 2️⃣ Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support.turna@gmail.com
SMTP_PASS=your-gmail-app-password
```

### 3️⃣ Start Supabase

```bash
supabase start
```

Get your keys from the output.

### 4️⃣ Run Migrations

```bash
pnpm db:migrate
```

### 5️⃣ Seed Development Data

```bash
pnpm db:seed
```

### 6️⃣ Start Development

```bash
pnpm dev:web
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Forest | `#03251B` |
| Dark Green | `#06382A` |
| Primary | `#00A878` |
| Mint | `#35D6A0` |
| Cream | `#F7F7F0` |
| Muted | `#8D9B95` |
| Border | `#DDE5E0` |
| Error | `#D94A4A` |
| Warning | `#D9A441` |

**Fonts**: Playfair Display (display) + Plus Jakarta Sans (body), max 97px  
**Logo**: unified SVG/PNG/WebP/JPG exports in `apps/web/public/` (`logo.svg`, `app-icon.png`, `splash.svg`)  
**Icons**: inline SVG only — no emoji anywhere in UI

---

## 📁 Project Structure

```
Turna/
├── 📱 apps/
│   ├── 🌐 web/                    # Next.js 14 App Router
│   │   ├── src/
│   │   │   ├── app/               # Pages & Routes
│   │   │   │   ├── auth/          # Authentication pages
│   │   │   │   ├── dashboard/     # Dashboard
│   │   │   │   └── api/           # API routes
│   │   │   ├── lib/               # Utilities
│   │   │   └── middleware.ts      # Auth middleware
│   │   └── public/                # Static assets
│   └── 📱 mobile/                 # React Native CLI
│       ├── android/               # Android config
│       └── ios/                   # iOS config
│
├── 📦 packages/
│   ├── 🗄️ database/              # Supabase client, migrations
│   ├── 📋 types/                 # TypeScript types (generated)
│   ├── ✅ validation/            # Zod schemas
│   ├── ⚙️ core/                  # Business logic
│   └── 🔧 config/                # Shared config
│
├── 🗃️ supabase/
│   ├── migrations/                # SQL migrations
│   ├── seed/                      # Dev seed data
│   └── config.toml               # Local Supabase config
│
├── 📖 docs/                       # Documentation
└── 🔧 .github/workflows/         # CI/CD pipelines
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | ✅ | App base URL |
| `SMTP_*` | ✅ | Gmail SMTP (host/port/user/pass/from) for all site emails |
| `GOOGLE_CLIENT_ID` | ⚠️ | Google OAuth (optional) |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | Google OAuth (optional) |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://turna.name.ng/auth/callback` (production)

### Gmail SMTP Setup

1. Sign up at [resend.com](https://resend.com/)
2. Get your API key
3. Verify your domain for production

---

## 📦 Deployment

### Vercel (Web)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables for Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://turna.name.ng`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`

### Android (APK/AAB)

```bash
# Build release APK
cd apps/mobile/android
./gradlew assembleRelease

# Build release AAB (for Play Store)
./gradlew bundleRelease
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design & decisions |
| [Security Audit](SECURITY_AUDIT.md) | Security review process |
| [Build Checklist](BUILD_AND_DEPLOYMENT_CHECKLIST.md) | Pre-deploy checks |
| [Project State](PROJECT_STATE.md) | Current phase status |
| [Continuity](PROJECT_CONTINUITY.md) | Session handoff guide |

---

## 🤝 Contributing

We love contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing`)
5. **Open** a Pull Request

### Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance
```

---

## 🔒 Security

**Never commit secrets!** Add these to `.gitignore`:

```bash
.env.local
.env.*.local
```

### Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

- **Email**: [legateakanjimusab@gmail.com](mailto:legateakanjimusab@gmail.com)
- **GitHub**: [Create an issue](https://github.com/Brave290/Turna/issues/new)

---

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

### 🙏 Acknowledgments

Built with ❤️ by

**Akanji Mus'ab** · **Brave hx Technology** · **Founda Technologies**

<br/>

**West African savings circles, digitized.** 🌍

<br/>

⭐ **Star this repo if you find it useful!**

</div>