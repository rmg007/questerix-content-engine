# Data Model Specification

> **Status**: COMPLETE
> **Last Updated**: 2026-01-26
> **Canonical Schema**: See `AppShell/docs/SCHEMA.md` for SQL definitions

---

## Purpose

This document defines entity relationships, business rules, and data constraints beyond what SQL can express.

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   profiles   │       │   domains    │       │    skills    │
│──────────────│       │──────────────│       │──────────────│
│ id (PK)      │       │ id (PK)      │◄──────│ domain_id(FK)│
│ role         │       │ slug         │       │ id (PK)      │
│ email        │       │ title        │       │ slug         │
│ full_name    │       │ is_published │       │ title        │
└──────────────┘       └──────────────┘       │ is_published │
       │                                       └──────────────┘
       │                                              │
       │                                              ▼
       │                                       ┌──────────────┐
       │                                       │  questions   │
       │                                       │──────────────│
       │                                       │ skill_id(FK) │
       │                                       │ id (PK)      │
       │                                       │ type         │
       │                                       │ content      │
       │                                       │ is_published │
       │                                       └──────────────┘
       │                                              │
       ▼                                              ▼
┌──────────────┐    ┌────────────────┐        ┌──────────────┐
│   sessions   │    │ skill_progress │        │   attempts   │
│──────────────│    │────────────────│        │──────────────│
│ user_id (FK) │    │ user_id (FK)   │────────│ user_id (FK) │
│ skill_id(FK) │    │ skill_id (FK)  │        │ question_id  │
│ id (PK)      │    │ mastery_level  │        │ id (PK)      │
└──────────────┘    │ total_points   │        │ is_correct   │
                    └────────────────┘        └──────────────┘
```

---

## Business Rules

### BR-001: Curriculum Hierarchy
- A Domain MUST have at least one Skill before publishing
- A Skill MUST have at least one Question before publishing
- Questions cannot exist without a parent Skill
- Deleting a Domain soft-deletes it (children remain but are hidden)

### BR-002: Soft Delete Cascade
- When a Domain is soft-deleted (`deleted_at` set), child Skills remain but are hidden from students
- When a Skill is soft-deleted, child Questions remain but are hidden from students
- Attempts are NEVER deleted (audit trail requirement)
- Soft-deleted content can be restored by setting `deleted_at = NULL`

### BR-003: Offline Sync Rules
- Student attempts created offline use client-generated UUIDs (`uuid` package v4)
- Conflict resolution strategy:
  - **Curriculum data**: Last-write-wins (server timestamp)
  - **Attempts**: Union-merge (keep all, deduplicate by UUID)
  - **Skill progress**: Max-wins for counts, sum for points, latest for mastery
- Sync MUST preserve all student work (no data loss under any circumstance)
- Outbox items retry with exponential backoff: 1s, 2s, 4s, 8s, max 60s

### BR-004: Publishing Rules
- Only users with `role = 'admin'` can publish
- Publishing is atomic (all-or-nothing transaction)
- Publishing bumps `curriculum_meta.version` and sets `last_published_at`
- Students only see content where `is_published = true AND deleted_at IS NULL`

### BR-005: Mastery Calculation
```
IF total_attempts < 3:
  mastery_level = 0
ELSE:
  mastery_level = ROUND((correct_attempts / total_attempts) * 100)
```

- Mastery is recalculated after each attempt
- Mastery levels: 0-49 (Beginner), 50-79 (Intermediate), 80-100 (Master)

### BR-006: Point Scoring
- Base points: Defined per question (`questions.points`, default 1)
- Streak multiplier:
  - 1-2 correct streak: 1.0x
  - 3-4 correct streak: 1.5x
  - 5+ correct streak: 2.0x
- Streak resets to 0 on incorrect answer
- `score_awarded = FLOOR(base_points * streak_multiplier)`

### BR-007: System Health
- **Database Maintenance**: Run `VACUUM;` on local Drift DB every ~50 launches.
- **Content Integrity**: Server provides SHA-256 checksum of published content; client validates after sync. Mismatch triggers full re-download.

### BR-008: Device-Bound Anonymous Authentication

Students do **NOT** see a login screen. Authentication happens silently to enable backend sync and RLS.

**On First App Launch**:
1. Check for existing session in secure storage (`flutter_secure_storage`)
2. If no session exists, call `supabase.auth.signInAnonymously()`
3. Store the session refresh token in secure local storage
4. A `profiles` row is auto-created via database trigger (role = 'student')

**On Subsequent Launches**:
1. Restore session from secure storage via `supabase.auth.recoverSession()`
2. If session is expired/invalid, Supabase auto-refreshes using the refresh token
3. If refresh fails (e.g., >7 days offline), call `signInAnonymously()` again

**Important Behaviors**:
- Anonymous users get a real `auth.uid()` that works with RLS policies
- The `user_id` in `attempts`, `sessions`, `skill_progress` is auto-assigned via `DEFAULT auth.uid()` in the database
- Client code MUST NOT send `user_id` in API payloads—the server enforces it
- Anonymous accounts can be upgraded to full accounts later (Future Feature)

**Data Orphaning on Re-Auth**:
- If app is reinstalled or secure storage is cleared, a NEW anonymous user is created
- Previous local data is orphaned (no way to link without account)
- MVP behavior: Start fresh. Future: Prompt user to create account before data loss scenarios.

**Session Persistence**:
- Use `flutter_secure_storage` package (encrypted on device)
- Key: `supabase_session`
- Value: JSON-encoded session from `session.persistSessionString`

---

## Data Validation Rules

### Slug Format
- Pattern: `^[a-z0-9_]+$` (lowercase letters, numbers, underscores only)
- Min length: 1 character
- Max length: 100 characters
- Domain slugs: Globally unique
- Skill slugs: Unique within parent domain

### Question Types

| Type | `options` Schema | `solution` Schema | UI Component |
|------|------------------|-------------------|--------------|
| `multiple_choice` | `{"options": [{"id": "a", "text": "Option A"}]}` | `{"correct_option_id": "a"}` | Radio buttons |
| `mcq_multi` | `{"options": [{"id": "a", "text": "Option A"}]}` | `{"correct_option_ids": ["a", "b"]}` | Checkboxes |
| `text_input` | `{"placeholder": "Enter answer"}` | `{"exact_match": "Paris", "case_sensitive": false}` | Text field |
| `boolean` | `{}` | `{"correct_value": true}` | True/False buttons |
| `reorder_steps` | `{"steps": [{"id": "1", "text": "Step 1"}]}` | `{"correct_order": ["1", "2", "3"]}` | Drag-and-drop |

### Response Validation (Attempts)

| Question Type | Valid `response` Format | Example |
|---------------|------------------------|---------|
| `multiple_choice` | `{"selected_option_id": "string"}` | `{"selected_option_id": "b"}` |
| `mcq_multi` | `{"selected_option_ids": ["string"]}` | `{"selected_option_ids": ["a", "c"]}` |
| `text_input` | `{"text": "string"}` | `{"text": "Paris"}` |
| `boolean` | `{"value": boolean}` | `{"value": true}` |
| `reorder_steps` | `{"order": ["string"]}` | `{"order": ["2", "1", "3"]}` |

---

## Limits and Constraints

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Domains per curriculum | 50 | Performance |
| Skills per domain | 100 | Navigation UX |
| Questions per skill | 500 | Memory (offline cache) |
| Options per question | 10 | UI readability |
| Steps per reorder question | 10 | Touch target size |
| Attempts per sync batch | 100 | API payload size |
| Session duration | 24 hours | Auto-close stale sessions |

---

## Derived Calculations

### Total Domain Progress
```sql
SELECT 
  d.id,
  d.title,
  COALESCE(AVG(sp.mastery_level), 0) as domain_mastery,
  COALESCE(SUM(sp.total_points), 0) as domain_points
FROM domains d
LEFT JOIN skills s ON s.domain_id = d.id
LEFT JOIN skill_progress sp ON sp.skill_id = s.id AND sp.user_id = :user_id
WHERE d.deleted_at IS NULL AND d.is_published = true
GROUP BY d.id, d.title;
```

### Student Leaderboard Position (Future)
```sql
SELECT 
  user_id,
  SUM(total_points) as total_points,
  RANK() OVER (ORDER BY SUM(total_points) DESC) as rank
FROM skill_progress
GROUP BY user_id;
```

---

## Agent Instructions

**WHEN IMPLEMENTING BUSINESS LOGIC**:
1. Use formulas exactly as specified above
2. Validate all inputs against the schemas in this document
3. Never delete attempts - always soft-delete or keep
4. Test edge cases: 0 attempts, 100% correct, 0% correct

**WHEN CALCULATING SCORES**:
1. Apply streak multiplier BEFORE rounding
2. Track streak in `skill_progress.current_streak`
3. Update `best_streak` if `current_streak > best_streak`

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-26 | Agent | Created stub document |
| 2026-01-26 | Agent | Added mastery formula, scoring rules, all business logic |
| 2026-01-27 | Agent | Added BR-008: Device-bound anonymous authentication rules |
