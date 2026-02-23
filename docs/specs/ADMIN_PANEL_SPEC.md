# Admin Panel Specification

> **Status**: COMPLETE
> **Last Updated**: 2026-01-26

---

## Purpose

This document defines the React Admin Panel requirements, UI/UX specifications, and technical constraints.

---

## Technical Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Framework | React | ^18.2.0 | |
| Build Tool | Vite | ^5.0.0 | |
| Language | TypeScript | ^5.3.0 | Strict mode |
| Server State | @tanstack/react-query | ^5.17.0 | LOCKED |
| Forms | react-hook-form | ^7.49.0 | With resolvers |
| Validation | zod | ^3.22.0 | |
| Backend Client | @supabase/supabase-js | ^2.39.0 | |
| UI Components | shadcn/ui | Latest | Radix-based |
| Styling | tailwindcss | ^3.4.0 | |
| Icons | lucide-react | ^0.303.0 | |
| Error Tracking | @sentry/react | ^7.92.0 | |
| Routing | react-router-dom | ^6.21.0 | |

### package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "@supabase/supabase-js": "^2.39.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "@sentry/react": "^7.92.0",
    "lucide-react": "^0.303.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tabs": "^1.0.4"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.1.0",
    "@testing-library/react": "^14.1.0"
  }
}
```

---

## App Architecture

```
src/
├── main.tsx                      # Entry point, Sentry init
├── App.tsx                       # Router setup
├── index.css                     # Global styles, Tailwind imports
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── forms/
│   │   ├── domain-form.tsx
│   │   ├── skill-form.tsx
│   │   └── question-form.tsx
│   └── layout/
│       ├── app-layout.tsx
│       ├── sidebar.tsx
│       ├── header.tsx
│       └── breadcrumbs.tsx
│
├── features/
│   ├── auth/
│   │   ├── login-page.tsx
│   │   ├── auth-provider.tsx
│   │   └── protected-route.tsx
│   ├── domains/
│   │   ├── domains-page.tsx
│   │   ├── domain-detail-page.tsx
│   │   └── components/
│   ├── skills/
│   │   ├── skills-page.tsx
│   │   └── components/
│   ├── questions/
│   │   ├── questions-page.tsx
│   │   ├── question-editor.tsx
│   │   ├── question-preview.tsx
│   │   └── components/
│   │       ├── multiple-choice-editor.tsx
│   │       ├── mcq-multi-editor.tsx
│   │       ├── text-input-editor.tsx
│   │       ├── boolean-editor.tsx
│   │       └── reorder-steps-editor.tsx
│   ├── publishing/
│   │   ├── publish-center-page.tsx
│   │   └── components/
│   └── import-export/
│       ├── import-page.tsx
│       └── export-page.tsx
│
├── hooks/
│   ├── use-domains.ts
│   ├── use-skills.ts
│   ├── use-questions.ts
│   ├── use-publish.ts
│   └── use-auth.ts
│
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── auth.ts                   # Auth utilities
│   ├── database.types.ts         # Generated Supabase types
│   └── utils.ts                  # cn() helper, etc.
│
├── pages/                        # Route components
│   ├── index.tsx                 # Dashboard
│   ├── login.tsx
│   ├── domains/
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── skills/
│   │   └── [id].tsx
│   ├── questions/
│   │   └── [id].tsx
│   └── publish.tsx
│
├── schemas/                      # Zod validation schemas
│   ├── domain.schema.ts
│   ├── skill.schema.ts
│   └── question.schema.ts
│
└── utils/
    ├── format.ts
    └── export.ts
```

---

## Page Specifications

### 1. Login Page

**Route**: `/login`

**Layout**:
```
┌─────────────────────────────────────┐
│                                     │
│           AppShell Admin            │
│                                     │
│    ┌───────────────────────────┐   │
│    │ Email                      │   │
│    └───────────────────────────┘   │
│    ┌───────────────────────────┐   │
│    │ Password                   │   │
│    └───────────────────────────┘   │
│                                     │
│    [        Sign In            ]   │
│                                     │
│    ❌ Invalid credentials          │
│                                     │
└─────────────────────────────────────┘
```

**Behavior**:
- Email/password form with validation
- Error message for invalid credentials
- Loading state during authentication
- Redirect to dashboard on success
- Check admin role after auth, sign out if not admin

### 2. Dashboard Page

**Route**: `/` (authenticated)

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ [Sidebar]  │  Dashboard                              │
│            │─────────────────────────────────────────│
│ Dashboard  │                                         │
│ Domains    │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ Skills     │  │ Domains │ │ Skills  │ │Questions│   │
│ Questions  │  │   12    │ │   48    │ │   256   │   │
│ Publish    │  └─────────┘ └─────────┘ └─────────┘   │
│ Import     │                                         │
│ Export     │  Recent Changes:                        │
│            │  • Domain "Math" updated (2h ago)       │
│            │  • 5 new questions added (1d ago)       │
│ [Sign Out] │                                         │
└──────────────────────────────────────────────────────┘
```

### 3. Domain Management Page

**Route**: `/domains`

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ [Sidebar]  │  Domains                  [+ New Domain]│
│            │─────────────────────────────────────────│
│            │  Search: [____________]                 │
│            │                                         │
│            │  ┌────┬────────────┬────────┬────────┐ │
│            │  │ ⋮⋮ │ Mathematics│ 12 ▸   │ ✓ Pub  │ │
│            │  ├────┼────────────┼────────┼────────┤ │
│            │  │ ⋮⋮ │ Science    │ 8 ▸    │ ○ Draft│ │
│            │  ├────┼────────────┼────────┼────────┤ │
│            │  │ ⋮⋮ │ History    │ 5 ▸    │ ○ Draft│ │
│            │  └────┴────────────┴────────┴────────┘ │
│            │                                         │
│            │  ⋮⋮ = drag to reorder                   │
└──────────────────────────────────────────────────────┘
```

**Features**:
- List all domains (including unpublished)
- Create new domain (opens form dialog)
- Edit domain (opens form dialog)
- Delete domain (soft delete with confirmation)
- Drag to reorder (updates sort_order)
- Toggle publish status
- Click row to view skills

### 4. Skill Management Page

**Route**: `/domains/:domainId/skills`

**Similar layout to Domains with**:
- Breadcrumb: Domains > Mathematics > Skills
- Filter by domain
- Create/Edit/Delete skills
- Reorder within domain
- Click to view questions

### 5. Question Management Page

**Route**: `/skills/:skillId/questions`

**Features**:
- List questions with type icon
- Create with type selector
- Edit with type-specific form
- Preview button (shows student view)
- Bulk actions (delete, publish)

### 6. Question Editor

**Type-specific editors**:

**Features**:
- **Tablet Preview**: Wraps preview in 1024x768 container (scaled) to mimic iPad.

```
┌──────────────────────────────────────────────────────┐
│  Edit Question                              [Preview]│
│─────────────────────────────────────────────────────│
│                                                      │
│  Type: [Multiple Choice ▼]                          │
│                                                      │
│  Question Text:                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ What is the capital of France?                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Options:                                            │
│  ┌────┬────────────────────────────────┬───────┐   │
│  │ ○  │ London                          │ [×]   │   │
│  ├────┼────────────────────────────────┼───────┤   │
│  │ ●  │ Paris                           │ [×]   │   │  ← Correct
│  ├────┼────────────────────────────────┼───────┤   │
│  │ ○  │ Berlin                          │ [×]   │   │
│  └────┴────────────────────────────────┴───────┘   │
│  [+ Add Option]                                      │
│                                                      │
│  Explanation (optional):                             │
│  ┌────────────────────────────────────────────────┐ │
│  │ Paris is the capital city of France.            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Points: [1]                                         │
│                                                      │
│  [Cancel]                            [Save Question] │
└──────────────────────────────────────────────────────┘
```

### 7. Publish Center Page

**Route**: `/publish`

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  Publish Center                                      │
│─────────────────────────────────────────────────────│
│                                                      │
│  Current Version: 12                                 │
│  Last Published: 2026-01-25 at 3:30 PM              │
│                                                      │
│  Validation Status:                                  │
│  ✓ All domains have at least one skill              │
│  ✓ All skills have at least one question            │
│  ✓ No orphaned content detected                     │
│                                                      │
│  Changes since last publish:                         │
│  • 2 new questions in "Basic Algebra"               │
│  • Updated "Mathematics" description                 │
│  • New domain "Chemistry" (unpublished)             │
│                                                      │
│  [     Publish All Changes     ]                    │
│                                                      │
│  History:                                            │
│  • v12 - 2026-01-25 3:30 PM                         │
│  • v11 - 2026-01-20 10:15 AM                        │
└──────────────────────────────────────────────────────┘
```

### 8. Import/Export Page

**Route**: `/import` and `/export`

**Features**:
- **CSV Import**: Support for bulk question upload (columns: `domain_slug`, `skill_slug`, `type`, `content`, `correct_answer`).
- **Validation**: Strict slug checking against DB.

**Export**:
- Select domains to export
- Download as JSON file
- Include/exclude unpublished content option

**Import**:
- Upload JSON file
- Validation preview
- Conflict resolution options:
  - Skip existing
  - Overwrite existing
  - Merge (keep both)

---

## Form Validation Schemas

### Domain Schema
```typescript
export const domainSchema = z.object({
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Slug must contain only lowercase letters, numbers, and underscores'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string().optional(),
  sort_order: z.number().int().min(0).default(0),
  is_published: z.boolean().default(false),
});
```

### Skill Schema
```typescript
export const skillSchema = z.object({
  domain_id: z.string().uuid('Invalid domain ID'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9_]+$/),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  difficulty_level: z.number().int().min(1).max(5).default(1),
  sort_order: z.number().int().min(0).default(0),
  is_published: z.boolean().default(false),
});
```

### Question Schema
```typescript
export const questionSchema = z.object({
  skill_id: z.string().uuid(),
  type: z.enum(['multiple_choice', 'mcq_multi', 'text_input', 'boolean', 'reorder_steps']),
  content: z.string().min(1, 'Question text is required'),
  options: z.object({}).passthrough(), // Type-specific validation
  solution: z.object({}).passthrough(), // Type-specific validation
  explanation: z.string().optional(),
  points: z.number().int().min(1).default(1),
  is_published: z.boolean().default(false),
});
```

---

## React Query Patterns

### Query Keys
```typescript
export const queryKeys = {
  domains: ['domains'] as const,
  domain: (id: string) => ['domain', id] as const,
  skills: (domainId: string) => ['skills', domainId] as const,
  skill: (id: string) => ['skill', id] as const,
  questions: (skillId: string) => ['questions', skillId] as const,
  question: (id: string) => ['question', id] as const,
  curriculumMeta: ['curriculum-meta'] as const,
};
```

### Hook Pattern
```typescript
export function useDomains() {
  return useQuery({
    queryKey: queryKeys.domains,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (domain: DomainInsert) => {
      const { data, error } = await supabase
        .from('domains')
        .insert(domain)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.domains });
    },
  });
}
```

---

## Agent Instructions

**WHEN BUILDING ADMIN PANEL**:
1. Follow folder structure EXACTLY as specified
2. Use React Query for ALL server state
3. Use React Context only for: auth state, theme, sidebar state
4. Validate ALL forms with Zod schemas
5. Run `npm run lint` and `npm run build` before every commit
6. Admin role check: Query `profiles.role` (NOT a `user_roles` table) - see `AGENTS.md` Phase 3 code patterns

**WHEN IMPLEMENTING FEATURES**:
1. Generate Supabase types first: `npx supabase gen types typescript`
2. Create hook with React Query
3. Create form with react-hook-form + zod
4. Build UI with shadcn/ui components

**WHEN ADDING UI COMPONENTS**:
1. Use shadcn/ui CLI: `npx shadcn-ui@latest add button`
2. Customize in `src/components/ui/`
3. Follow existing patterns for consistency

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-26 | Agent | Created stub document |
| 2026-01-26 | Agent | Completed with shadcn/ui, full architecture, schemas |
| 2026-01-27 | Agent | Clarified admin auth uses profiles.role, not user_roles |
