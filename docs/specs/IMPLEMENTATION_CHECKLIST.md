# Implementation Checklist

> **Status**: COMPLETE
> **Original Reference**: `document-e7b5eca6-f0a8-42eb-a614-49d8ae9c9903.md`

---

## Purpose

This document tracks implementation progress and ensures all requirements are met before phase completion.

---

## Phase -1: Environment Validation

### Tools
- [ ] Flutter >= 3.19.0
- [ ] Node >= 18.0.0
- [ ] Supabase CLI >= 1.123.0
- [ ] Git installed
- [ ] VS Code / Cursor IDE

### Supabase Setup
- [ ] Supabase account created
- [ ] Project created
- [ ] CLI authenticated (`supabase login`)
- [ ] Project linked (`supabase link`)

---

## Phase 0: Project Bootstrap

### Flutter Student App
- [ ] `flutter create student-app`
- [ ] Dependencies added to `pubspec.yaml`
- [ ] Folder structure created per STUDENT_APP_SPEC.md
- [ ] `flutter analyze` passes
- [ ] `.env.example` created

### React Admin Panel
- [ ] `npm create vite@latest admin-panel -- --template react-ts`
- [ ] Dependencies installed
- [ ] Folder structure created per ADMIN_PANEL_SPEC.md
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `.env.example` created

### Configuration
- [ ] PHASE_STATE.json initialized
- [ ] Scripts folder created
- [ ] .gitignore configured

---

## Phase 1: Data Model + Contracts

### Database Schema
- [ ] Enum types created
- [ ] `profiles` table created
- [ ] `domains` table created
- [ ] `skills` table created
- [ ] `questions` table created
- [ ] `attempts` table created
- [ ] `sessions` table created
- [ ] `skill_progress` table created
- [ ] `outbox` table created
- [ ] `sync_meta` table created
- [ ] `curriculum_meta` table created

### Security
- [ ] `is_admin()` function created
- [ ] RLS enabled on all tables
- [ ] RLS policies for profiles
- [ ] RLS policies for content tables
- [ ] RLS policies for attempts
- [ ] RLS policies for sessions
- [ ] RLS policies for skill_progress

### Performance
- [ ] `updated_at` indexes created
- [ ] Foreign key indexes created
- [ ] Published content indexes created

### Triggers & Functions
- [ ] `update_updated_at_column()` function created
- [ ] Triggers applied to all tables
- [ ] `publish_curriculum()` RPC created
- [ ] `batch_submit_attempts()` RPC created

### Seed Data
- [ ] Sample domain inserted
- [ ] Sample skill inserted
- [ ] Sample questions inserted (all types)

### Validation
- [ ] `supabase db reset --seed` succeeds
- [ ] All tables exist
- [ ] RLS blocks unauthorized access

---

## Phase 2: Student App Core Loop

### Local Database (Drift)
- [ ] Database class created
- [ ] Table definitions match SCHEMA.md
- [ ] Generated code compiled
- [ ] CRUD operations working

### Repositories
- [ ] DomainRepository
- [ ] SkillRepository
- [ ] QuestionRepository
- [ ] AttemptRepository
- [ ] SessionRepository
- [ ] SkillProgressRepository

### Sync Engine
- [ ] Outbox table (local)
- [ ] SyncService (push)
- [ ] SyncService (pull)
- [ ] sync_meta tracking
- [ ] Exponential backoff

### Realtime
- [ ] Subscription to curriculum_meta
- [ ] Polling fallback
- [ ] Reconnection handling

### Conflict Resolution
- [ ] Attempt merge (union)
- [ ] Progress merge (max/sum/latest)
- [ ] No data loss verified

### UI Screens
- [ ] Domain list
- [ ] Skill list
- [ ] Practice session
- [ ] Question runners (all types)
- [ ] Progress view

### Connectivity
- [ ] connectivity_plus integration
- [ ] Request-failure detection
- [ ] Visual indicator

### Error Handling
- [ ] Typed error classes
- [ ] Sentry integration
- [ ] User-friendly messages

### Testing
- [ ] Unit tests for repositories
- [ ] Unit tests for sync
- [ ] Integration test: offline workflow

---

## Phase 3: Admin Panel MVP

### Authentication
- [ ] Login page
- [ ] Admin role verification
- [ ] Protected routes
- [ ] Sign out functionality

### Domain CRUD
- [ ] List domains
- [ ] Create domain (form + validation)
- [ ] Edit domain
- [ ] Delete domain (soft)
- [ ] Reorder domains

### Skill CRUD
- [ ] List skills
- [ ] Create skill
- [ ] Edit skill
- [ ] Delete skill
- [ ] Reorder skills

### Question CRUD
- [ ] List questions
- [ ] Create question (all types)
- [ ] Edit question
- [ ] Delete question
- [ ] Question preview

### Publishing
- [ ] Pending changes view
- [ ] Validation check
- [ ] Publish button
- [ ] Success/error feedback

### Import/Export
- [ ] Export to JSON
- [ ] Import from JSON
- [ ] Validation on import

### Testing
- [ ] Auth tests
- [ ] Form validation tests
- [ ] Publish workflow test

---

## Phase 4: Hardening

### Error Handling
- [ ] Typed errors (Flutter)
- [ ] Typed errors (React)
- [ ] Error boundaries (React)

### Observability
- [ ] Sentry configured (Flutter)
- [ ] Sentry configured (React)
- [ ] Logging service
- [ ] Error context attached

### Retry Logic
- [ ] Exponential backoff tuned
- [ ] Max retry limits
- [ ] Circuit breaker (optional)

### CI/CD
- [ ] GitHub Actions workflow
- [ ] Flutter lint gate
- [ ] Flutter test gate
- [ ] React lint gate
- [ ] React build gate

### Production Build
- [ ] Flutter APK builds
- [ ] Flutter iOS builds (if applicable)
- [ ] React production build
- [ ] Environment variables documented

---

## Final Validation

- [ ] All phases completed
- [ ] All validation scripts pass
- [ ] No lint warnings
- [ ] No test failures
- [ ] PHASE_STATE.json shows all phases complete
- [ ] Documentation updated

---

## Agent Instructions

**USE THIS CHECKLIST**:
1. Check off items as you complete them
2. Do not skip items
3. If an item is blocked, note the blocker in PHASE_STATE.json
4. Run validation script after completing each section

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-26 | Agent | Created stub document |
| 2026-01-26 | Agent | Added skill_progress to checklists, marked complete |
