# Blue Dog Command - Design Guidelines

## Visual Theme: Tactical Military Command Center
A minimalistic military command UI with dark mode only, creating a professional tactical operations interface.

## Color Palette
- **Blue Dog Blue**: #041BB3 (primary accents, CTAs, active states)
- **Gunmetal**: #2B2B2B (main background)
- **Slate**: #1F2937 / #111827 (panels, cards, elevated surfaces)
- **Gray**: #828282 (muted text, secondary information)
- **Amber**: #FBAE17 (warnings, notices, alerts)
- **Success Green**: #16A34A (completed states, positive actions)
- **Critical Red**: #DC2626 (errors, deletions, high priority)

## Typography
- **Headings**: Rajdhani or Orbitron (fallback to system sans)
- **Body**: Inter
- **Monospace Elements**: Roboto Mono (for terminal-style displays, timestamps, codes)

## Layout Structure

### App Shell
**Header**:
- Left: App title + current route title ("Situation Room", "Directives", "Op Notices")
- Center: Time-of-day greeting ("Good morning/afternoon/evening, Commander") + current date/time (e.g., "Fri, Nov 7, 2025 • 22:10")
- Right: Quick action buttons (Add Directive, Add Notice), search input for client-side filtering

**Sidebar Navigation**:
- Situation Room (icon: layout-dashboard)
- Directives (icon: list-checks)
- Op Notices (icon: bell)

### Page Layouts

**Situation Room (Dashboard)**:
- KPI cards displaying: active directives count, completion statistics, upcoming notices
- Summary panels with status indicators
- Recent activity feed or timeline

**Directives (Tasks)**:
- Task cards with priority badges (low/med/high with corresponding colors)
- Filters for status (all/active/completed) and priority
- Each directive shows: title, notes, priority badge, due date, completion checkbox
- Empty states with contextual messaging

**Op Notices (Reminders)**:
- Timeline view of scheduled notices
- Notice cards showing: title, notes, scheduled time, repeat indicator
- Datetime scheduling interface
- Repeat options: none/daily/weekly/monthly

## Component Design (shadcn/ui)
- **Cards**: Slate backgrounds with subtle borders, elevated appearance
- **Buttons**: Blue Dog Blue primary, gunmetal secondary, critical red for destructive actions
- **Inputs**: Dark with slate backgrounds, blue focus states
- **Badges**: Color-coded for priority/status (amber for medium, red for high, green for completed)
- **Dialogs**: Modal overlays for forms and confirmations
- **Toasts**: Notifications with appropriate color coding

## Visual Effects
- **Background**: Radial subtle noise texture or solid gunmetal
- **Cards**: Slightly lighter than background with soft shadows
- **Focus States**: Visible blue outlines for accessibility
- **Framer Motion Animations**: 
  - Fade/slide transitions on route switches
  - Micro-interactions on hover/press
  - Smooth card entry animations
  - Subtle but purposeful, never distracting

## Spacing & Rhythm
- Use Tailwind spacing primitives: 2, 4, 6, 8 units for consistency
- Generous padding on cards (p-6 to p-8)
- Vertical rhythm with consistent gaps (gap-4, gap-6)
- Container max-width for readability

## Interactive Elements
- Hover states with subtle brightness increase
- Active states with slight scale reduction
- Loading states with skeleton loaders or spinners
- Confirmation dialogs for destructive actions
- Real-time updates reflected immediately

## Accessibility
- High contrast text on dark backgrounds
- Clear focus indicators
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly labels