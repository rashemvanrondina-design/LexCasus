# Lex Casus — AI-Powered Legal Dashboard

A modern, responsive Legal Tech SaaS web application designed for law students and legal practitioners in the Philippines.

## Project Status

- **Project Type**: React + TypeScript Modern Web Application
- **Entry Point**: `src/main.tsx`
- **Build System**: Vite 7.0.0
- **Styling System**: Tailwind CSS 3.4.17
- **Routing**: React Router DOM 6.x
- **State Management**: Zustand 4.x (with persist middleware)
- **Database & Auth**: Firebase (Firestore & Authentication)
- **AI Backend**: Node.js / Express (Hosted on Render)
- **Icons**: Lucide React

## Architecture

### User Roles
- **Admin**: Master access (specifically `rashemvanrondina@gmail.com`)
- **Client (Atty.)**: Standard users with tier-based feature limits.

### Subscription Plans & Paywall
- **Free (₱0)**: Capped daily usage (10 Chats, 5 Bar Practices, 5 Case Digests).
- **Premium (₱199/mo)**: Unlimited Chat, 20 Bar Practices, 50 Case Digests.
- **Premium+ (₱599/mo)**: Unlimited access across all AI features + Priority AI Processing.
*Note: A custom `useUsageGuard` hook on the frontend combined with secure Firestore rules and a Node.js backend ensures strict enforcement of these billing limits.*

### Key Design Decisions
- All users are respectfully addressed as "Atty." across the application.
- Professional Navy, White, and Gold color scheme with full Dark/Light mode support.
- Collapsible sidebar navigation for maximum screen real estate during research.
- Mobile-first responsive design.
- Integrated ALAC (Answer, Legal Basis, Analysis, Conclusion) formatting for Bar Exam practice.

## Pages & Features

### Client Pages (`/src/pages/client/`)
- `DashboardPage.tsx` — Command center with live stats, real-time pending tasks, and recent digests.
- `SchedulePage.tsx` — Calendar/To-Do system with hybrid pagination and CRUD capabilities.
- `PracticeBarPage.tsx` — AI-evaluated Bar exam answers using the ALAC method.
- `LegalChatPage.tsx` — Philippine law chatbot interface with persistent local history.
- `ECodalsPage.tsx` — Browseable codal provisions with structural hierarchy and markdown margin notes.
- `NotesPage.tsx` — TipTap Rich text editor with hierarchical subject tagging and PDF Syllabus compilation.
- `CasesPage.tsx` — AI case digest generator mapping to specific legal formats.
- `BillingPage.tsx` — Upgrade paths and subscription management.

### Admin Pages (`/src/pages/admin/`)
- `AdminDashboardPage.tsx` — Live system analytics, revenue estimates, and global activity logs.
- `ManageQuestionsPage.tsx` — CRUD for Bar questions + bulk `.txt` upload parsing.
- `UserManagementPage.tsx` — Official roll of attorneys, referral code tracking, and manual tier overrides.
- `SubscriptionControlPage.tsx` — Visual revenue overview and tier distribution.
- `ManageCodalsPage.tsx` — Content management for the global E-Codals library with markdown support.
- `AdminAnnouncementsPage.tsx` — Live "Kill Switch" and dynamic UI control for the client-facing Promo Modal.

## Security & Data Storage
Fully integrated with Firebase and a custom secure backend:
- **Authentication**: Firebase Auth (Email/Password + Google OAuth) with strict email verification locks.
- **Firestore Security Rules**: Heavily restricted read/write access ensuring users can only modify their own vaults, with billing increments locked strictly to the Server Admin SDK.
- **Optimistic UI**: Zustand stores seamlessly blend instant local state updates with background Firebase syncing.

## Build Commands
- `npm run dev` — Start the development server
- `npm run build` — Generate the production-ready build