<div align="center">

# 🤝 Contributing to Turna

**Thank you for your interest in contributing!**

</div>

---

## 📋 Table of Contents

- [🚀 Getting Started](#-getting-started)
- [🔧 Development Setup](#-development-setup)
- [📝 Commit Convention](#-commit-convention)
- [🔀 Pull Request Process](#-pull-request-process)
- [🐛 Bug Reports](#-bug-reports)
- [✨ Feature Requests](#-feature-requests)
- [📚 Documentation](#-documentation)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.0.0
- **Docker** (for local Supabase)
- **Git**

### 1️⃣ Fork & Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/Turna.git
cd Turna
```

### 2️⃣ Install Dependencies

```bash
pnpm install
```

### 3️⃣ Environment Setup

```bash
cp .env.local.example .env.local
# Edit .env.local with your keys
```

### 4️⃣ Start Development

```bash
# Start Supabase
supabase start

# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Start web app
pnpm dev:web
```

---

## 🔧 Development Setup

### Available Scripts

```bash
# Development
pnpm dev:web          # Start web dev server
pnpm dev:mobile       # Start mobile dev server

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed development data
pnpm db:reset         # Reset database
pnpm db:generate      # Generate TypeScript types

# Quality
pnpm lint             # Run linter
pnpm typecheck        # Type check
pnpm test             # Run tests

# Build
pnpm build            # Build all packages
```

### Code Style

- **TypeScript** for all code
- **2 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** required
- **No unused variables**

### File Naming

```
components/
├── Button.tsx          # PascalCase for components
├── useAuth.ts          # camelCase for hooks
├── api.ts              # camelCase for utilities
└── types.ts            # camelCase for types
```

---

## 📝 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add Google OAuth` |
| `fix` | Bug fix | `fix: resolve login timeout` |
| `docs` | Documentation | `docs: update README` |
| `style` | Formatting | `style: fix indentation` |
| `refactor` | Code restructuring | `refactor: extract auth logic` |
| `test` | Adding tests | `test: add login tests` |
| `chore` | Maintenance | `chore: update dependencies` |

### Examples

```bash
feat(circles): add circle creation flow
fix(ledger): correct hash chain calculation
docs(security): add RLS policy documentation
test(auth): add Google OAuth callback tests
```

---

## 🔀 Pull Request Process

### 1️⃣ Create Branch

```bash
git checkout -b feature/amazing-feature
```

### 2️⃣ Make Changes

- Write clean code
- Follow code style
- Add tests if needed
- Update documentation

### 3️⃣ Commit

```bash
git commit -m "feat(circles): add circle creation flow"
```

### 4️⃣ Push & PR

```bash
git push origin feature/amazing-feature
```

Then open a Pull Request on GitHub.

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing done

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console logs left
```

---

## 🐛 Bug Reports

When filing a bug report, include:

1. **Description** — What happened?
2. **Steps to reproduce** — How can we reproduce it?
3. **Expected behavior** — What should happen?
4. **Actual behavior** — What actually happened?
5. **Environment** — OS, browser, Node version
6. **Screenshots** — If applicable

---

## ✨ Feature Requests

We welcome ideas! When suggesting features:

1. **Problem** — What problem does it solve?
2. **Solution** — How should it work?
3. **Alternatives** — Any other approaches?
4. **Context** — Any additional info?

---

## 📚 Documentation

Help improve our docs:

- Fix typos
- Add examples
- Improve clarity
- Add missing sections

---

<div align="center">

**Thank you for contributing!** 🙏

</div>