# DwellSync — UI Architecture & Design System

## Tech Stack
- **Framework**: Next.js 15 App Router
- **Component Model**: React 19 Server & Client Components
- **Styling**: Tailwind CSS v3 with custom HSL theme variables
- **Icons**: Lucide React
- **Validation**: Zod schema validation

## Responsive Grid & Layout
- Desktop: Collapsible dark sidebar (`Sidebar.tsx`) with dynamic active role and tenant branding.
- Mobile: Drawer-based mobile navigation (`MobileSidebar.tsx`).
- Live Impersonation Banner: High-visibility amber bar mounted across the topbar whenever a Super Admin is operating within another user's session.

