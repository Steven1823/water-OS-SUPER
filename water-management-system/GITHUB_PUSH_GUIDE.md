# GitHub Push Guide - Water Management System

This guide explains how to push your water management system to GitHub **securely**, file by file, without exposing sensitive information.

## ⚠️ Security First

**NEVER push these files:**
- `.env` or `.env.local` (contains Supabase credentials)
- `.vscode/` folder (contains personal VS Code settings)
- `node_modules/` (auto-generated, recreated with npm install)
- Any IDE configuration files (.idea/, *.swp, etc.)

The `.gitignore` file already prevents these from being committed.

---

## Step 1: Create a GitHub Repository

### Option A: Using GitHub Web Interface (Easy)
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `water-management-system`
3. Description: "Enterprise water utility fleet management system with IoT machine provisioning"
4. Visibility: **Public** (or Private if preferred)
5. **Do NOT** initialize with README (we have one already)
6. Click **Create repository**
7. Copy the repository URL (HTTPS or SSH)

### Option B: Using GitHub CLI
```bash
gh repo create water-management-system --public --source=. --remote=origin --push
```

---

## Step 2: Initialize Git & Configure

```bash
cd c:\Users\kings\Downloads\water-management-system\water-management-system

# Initialize git (if not already done)
git init

# Configure user (one-time setup)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/water-management-system.git

# Or if using SSH:
git remote add origin git@github.com:YOUR_USERNAME/water-management-system.git

# Verify remote
git remote -v
```

---

## Step 3: Push Files One by One (Recommended for Clarity)

### 3.1: Push Core Configuration Files First

```bash
# Stage and commit root-level config files
git add .gitignore package.json package-lock.json
git add tsconfig.json tsconfig.app.json tsconfig.node.json
git add vite.config.ts index.html
git add .env.example
git commit -m "config: initial project configuration (gitignore, vite, typescript, package.json)"
git push -u origin main
```

### 3.2: Push Documentation

```bash
# Push documentation
git add README.md
git add docs/ARCHITECTURE.md
git add docs/HARDWARE_INTEGRATION.md
git add docs/DEPLOYMENT_GUIDE.md
git add docs/GENERATE_BILLS_EDGE_FUNCTION.md
git add docs/IMPLEMENTATION_SUMMARY.md
git commit -m "docs: comprehensive project documentation"
git push
```

### 3.3: Push Database & Migrations

```bash
# Push Supabase schema and migrations
git add supabase/schema.sql
git add supabase/migrations/
git commit -m "database: 11 migrations with RLS policies and analytics views"
git push
```

### 3.4: Push Edge Functions

```bash
# Ingest Reading Function (Device Telemetry)
git add supabase/functions/ingest-reading/
git commit -m "feat: ingest-reading edge function with per-machine secret verification"
git push

# Provision Machine Function
git add supabase/functions/provision-machine/
git commit -m "feat: provision-machine edge function for secure machine provisioning"
git push

# Regenerate Secret Function
git add supabase/functions/regenerate-secret/
git commit -m "feat: regenerate-secret edge function for secret rotation"
git push

# Generate Bills Function
git add supabase/functions/generate-bills/
git commit -m "feat: generate-bills edge function for automated monthly billing"
git push
```

### 3.5: Push Firmware

```bash
# Push ESP32 firmware
git add firmware/
git commit -m "firmware: ESP32 + SIM7000 cellular telemetry code"
git push
```

### 3.6: Push Frontend - Types & Configuration

```bash
# Types and configuration
git add src/types.ts
git add src/main.tsx
git commit -m "feat: TypeScript types and application entry point"
git push
```

### 3.7: Push Frontend - Library & Utilities

```bash
# Supabase client
git add src/lib/supabaseClient.ts
git commit -m "feat: Supabase client initialization"
git push
```

### 3.8: Push Frontend - Hooks (Real-time Data)

```bash
# Real-time data hooks
git add src/hooks/
git commit -m "feat: real-time Supabase subscription hooks (machines, customers, meters, bills, payments, dashboard)"
git push
```

### 3.9: Push Frontend - Components (Reusable UI)

```bash
# Reusable UI components
git add src/components/
git commit -m "feat: reusable components (Layout, StatCard, SalesChart, AlertsPanel, LiquidGauge, MachineCard)"
git push
```

### 3.10: Push Frontend - Styles

```bash
# Stylesheet
git add src/styles/
git commit -m "style: dark-themed responsive CSS (layout, dashboard, list-page, connect-machine)"
git push
```

### 3.11: Push Frontend - Pages (Dashboard & Operations)

```bash
# Dashboard page
git add src/pages/Dashboard.tsx
git commit -m "feat: dashboard page with KPIs and analytics"
git push

# Machine management pages
git add src/pages/ConnectMachine.tsx
git add src/pages/Machines.tsx
git commit -m "feat: connect-machine wizard and fleet management"
git push

# Operations pages
git add src/pages/Customers.tsx
git add src/pages/Meters.tsx
git add src/pages/Readings.tsx
git add src/pages/Maintenance.tsx
git commit -m "feat: customer, meter, readings, and maintenance pages"
git push

# Billing & Revenue pages
git add src/pages/Billing.tsx
git add src/pages/Payments.tsx
git add src/pages/Reports.tsx
git commit -m "feat: billing, payments, and reports pages"
git push

# Admin pages
git add src/pages/Staff.tsx
git add src/pages/Inventory.tsx
git commit -m "feat: staff and inventory management pages"
git push
```

### 3.12: Push Frontend - Main App Router

```bash
# Main app router
git add src/App.tsx
git commit -m "feat: React Router setup with 11 routes"
git push
```

### 3.13: Push Public Assets (if any)

```bash
# Public assets
git add public/
git commit -m "assets: public static files"
git push
```

---

## Alternative: Push Everything at Once (Faster)

If you trust `.gitignore` and want to push everything in one go:

```bash
# Stage ALL files (respecting .gitignore)
git add .

# Verify what will be committed
git status

# Make sure NO .env, .vscode, or node_modules are staged!

# Commit with descriptive message
git commit -m "Initial commit: water management system with IoT fleet monitoring, machine provisioning, and automated billing"

# Push to GitHub
git push -u origin main
```

---

## Step 4: Verify on GitHub

1. Go to your repository: `https://github.com/YOUR_USERNAME/water-management-system`
2. Verify all files are present
3. Check that `.env` and `.vscode/` are NOT present (security check)
4. Review commit history in the "Commits" tab

---

## Step 5: Future Updates

For new features or bug fixes:

```bash
# Make changes to files
# e.g., edit src/pages/Dashboard.tsx

# Stage specific files
git add src/pages/Dashboard.tsx

# Or stage all changes
git add .

# Commit with clear message
git commit -m "fix: improve dashboard performance with memoization"

# Push
git push
```

---

## Commit Message Convention

Use clear, descriptive commit messages following this pattern:

```
<type>: <description>

Examples:
  feat: add connect-machine wizard
  fix: resolve machine status update race condition
  docs: update hardware integration guide
  style: improve dark theme contrast
  refactor: extract machine status component
  test: add edge function security tests
  config: update vite build optimizations
```

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `style:` Styling (CSS, no logic change)
- `refactor:` Code restructuring
- `test:` Tests
- `config:` Configuration files
- `chore:` Dependencies, build scripts

---

## Troubleshooting

### "fatal: not a git repository"
```bash
cd c:\Users\kings\Downloads\water-management-system\water-management-system
git init
```

### "Authentication failed"
```bash
# Option 1: Use HTTPS with GitHub token (recommended)
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/water-management-system.git

# Option 2: Use SSH (requires SSH key setup)
ssh-keygen -t ed25519 -C "your.email@example.com"
# Add key to GitHub: Settings → SSH and GPG keys → New SSH key
```

### "Rejected: permission denied"
```bash
# Usually means SSH key not configured
# Use HTTPS instead or add your SSH key to GitHub
```

### ".env accidentally pushed?"
```bash
# IMPORTANT: Rotate your Supabase credentials immediately!
# Then remove from history:
git filter-branch --tree-filter 'rm -f .env' -f HEAD
git push -u origin main
```

### "Want to undo last commit?"
```bash
# If not yet pushed to GitHub:
git reset --soft HEAD~1
git restore --staged .

# If already pushed (don't do this unless urgent):
git revert HEAD
git push
```

---

## GitHub Repository Features to Enable

After pushing, configure your repository:

### 1. Add GitHub Pages (Optional - Host the dashboard)
1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: / (root)
4. Save (GitHub will build and deploy)

### 2. Add Branch Protection (Optional - For team collaboration)
1. Go to Settings → Branches
2. Add rule for `main`
3. Check "Require pull request reviews before merging"
4. Check "Require status checks to pass before merging"

### 3. Add Topics (For discoverability)
1. Go to repository main page
2. Click "Add topic"
3. Add: `water-management`, `iot`, `supabase`, `react`, `esp32`, `fleet-tracking`

---

## Cloning & Contributing (For Team Members)

Other developers can now clone and contribute:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/water-management-system.git
cd water-management-system

# Install dependencies
npm install

# Create .env.local with Supabase credentials
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# Start development
npm run dev
```

---

## Summary Checklist

✅ Created GitHub repository  
✅ Configured git user & remote  
✅ Verified .gitignore protects secrets  
✅ Pushed configuration files  
✅ Pushed documentation  
✅ Pushed database schemas & migrations  
✅ Pushed all Edge Functions  
✅ Pushed firmware code  
✅ Pushed frontend (components, pages, hooks, styles)  
✅ Verified no `.env` or `.vscode/` files on GitHub  
✅ Repository is ready for collaboration!  

---

**You're all set! Your water management system is now on GitHub, secure and ready for the world to contribute.** 🚀
