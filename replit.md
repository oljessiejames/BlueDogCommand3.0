# Blue Dog Command

A tactical military-themed command center application for managing operational directives and notices.

## Project Overview

Blue Dog Command is a full-stack TypeScript application with a dark military theme designed for task and reminder management. The app features three main sections:
- **Situation Room**: Dashboard with KPI metrics and operational status
- **Directives**: Task management with priority levels and completion tracking
- **Op Notices**: Scheduled reminders with repeat options

## Tech Stack

### Frontend
- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- wouter (client-side routing)
- Zustand (UI state management)
- Framer Motion (animations)
- TanStack Query (data fetching)
- lucide-react (icons)
- date-fns (date formatting)

### Backend
- Express (TypeScript with ESM modules)
- SQLite via better-sqlite3 (data persistence)
- Zod (validation)

## Project Structure

```
/client
  /src
    /components       - Reusable UI components
      Shell.tsx       - App layout with sidebar + header
      KpiCard.tsx     - Dashboard metric cards
      DirectiveForm.tsx - Form for creating/editing tasks
      NoticeForm.tsx  - Form for creating/editing reminders
      Empty.tsx       - Empty state component
    /pages
      SituationRoom.tsx - Dashboard page
      Directives.tsx  - Task management page
      OpNotices.tsx   - Reminders page
    /lib
      time.ts         - Date/time utilities
      queryClient.ts  - TanStack Query setup
    /store
      useUI.ts        - Zustand store for UI state
    App.tsx           - Main app component with routing
    index.css         - Tailwind + theme CSS variables

/server
  index.ts            - Express server setup
  routes.ts           - API route handlers
  storage.ts          - Data storage interface

/shared
  schema.ts           - Shared TypeScript types and Zod schemas
```

## Design Theme

### Colors (Dark Mode Only)
- **Blue Dog Blue**: #041BB3 (primary accents)
- **Gunmetal**: #2B2B2B (main background)
- **Slate**: #1F2937 / #111827 (cards/panels)
- **Gray**: #828282 (muted text)
- **Priority Alpha (Critical)**: #DC2626 (highest priority/mission-critical)
- **Priority Bravo (High)**: #F97316 (high importance, 24-48hr completion)
- **Priority Charlie (Medium)**: #EAB308 (routine but necessary)
- **Priority Delta (Low)**: #16A34A (low urgency, can be postponed)
- **Priority Echo (Completed)**: #6B7280 (completed/archived tasks)

### Typography
- Headings: Rajdhani or Orbitron
- Body: Inter
- Monospace: Roboto Mono (for timestamps, codes, badges)

## API Endpoints

### Directives (Tasks)
- `GET /api/directives?status=all|active|completed&priority=Alpha|Bravo|Charlie|Delta|Echo`
- `POST /api/directives` - Create new directive
- `PATCH /api/directives/:id` - Update directive
- `DELETE /api/directives/:id` - Delete directive

### Op Notices (Reminders)
- `GET /api/notices?from&to`
- `POST /api/notices` - Create new notice
- `PATCH /api/notices/:id` - Update notice
- `DELETE /api/notices/:id` - Delete notice

### Status
- `GET /api/status` - Dashboard metrics
- `GET /api/health` - Health check

## Data Models

### Directive
```typescript
{
  id: string;
  title: string;
  notes: string | null;
  priority: "Alpha" | "Bravo" | "Charlie" | "Delta" | "Echo";
  dueAt: string | null;  // ISO datetime
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Notice
```typescript
{
  id: string;
  title: string;
  notes: string | null;
  priority: "Alpha" | "Bravo" | "Charlie" | "Delta" | "Echo";
  at: string;  // ISO datetime
  repeat: "none" | "daily" | "weekly" | "monthly";
  createdAt: string;
  updatedAt: string;
}
```

## Features

### Situation Room (Dashboard)
- Active directives count
- Completion statistics
- Total directives count
- Upcoming notices count
- Operational status display

### Directives
- Create/edit/delete tasks
- Tactical priority levels with color-coded badges and tooltips:
  - **Priority Alpha (Critical)** ⚠️ - Mission-critical, immediate action required
  - **Priority Bravo (High)** 🔶 - High importance, 24-48hr completion needed
  - **Priority Charlie (Medium)** ⚙️ - Routine but necessary, after higher priorities
  - **Priority Delta (Low)** 🟢 - Low urgency, can be scheduled/postponed
  - **Priority Echo (Completed)** ✅ - Automatically set when task is marked complete
- Due date tracking with overdue indicators
- Auto-change to Priority Echo when marked complete
- Completion checkbox
- Filter by status and priority
- Framer Motion animations

### Op Notices
- Create/edit/delete reminders
- Tactical priority levels (same as Directives) with color coding
- Datetime scheduling
- Repeat options (none/daily/weekly/monthly)
- Timeline view sorted by scheduled time
- Upcoming/past indicators
- Priority badges with hover tooltips showing descriptions

### UI Features
- Dark mode only (tactical theme)
- Time-of-day greeting in header
- Real-time clock display
- Responsive design
- Smooth Framer Motion transitions
- Sidebar navigation
- Quick action buttons in header
- Modal forms for creation
- Confirmation dialogs for deletions
- Loading and empty states

## Development

### Build Scripts
```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc"
}
```

### Running Locally
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Access at http://localhost:3000

## Architecture Decisions

- **Dark Mode Only**: Military tactical theme requires consistent dark interface
- **In-Memory vs SQLite**: Using in-memory storage initially, SQLite for persistence
- **Schema-First**: Shared TypeScript types ensure frontend-backend consistency
- **Component Library**: shadcn/ui for consistent, accessible components
- **Animations**: Subtle Framer Motion effects enhance UX without distraction
- **Date Handling**: date-fns for reliable date formatting and calculations
