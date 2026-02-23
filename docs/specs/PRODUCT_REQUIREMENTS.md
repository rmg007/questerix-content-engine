# Product Requirements Document (PRD)

> **Status**: COMPLETE
> **Last Updated**: 2026-01-26

---

## 1. Product Vision

### Problem Statement
Students need a way to practice curriculum content offline (in classrooms with limited connectivity) while educators need tools to manage and update that content remotely.

### Target Users
1. **Students**: K-12 learners using tablets in classroom or home settings
2. **Administrators**: Teachers, curriculum designers, and education coordinators

### Success Metrics
- Student engagement: Average session length > 10 minutes
- Offline reliability: 100% functionality without network
- Sync success rate: > 99% of attempts synced without data loss
- Admin efficiency: < 5 minutes to publish curriculum update

---

## 2. User Personas

### Student Persona
| Attribute | Value |
|-----------|-------|
| Age range | 8-18 years old |
| Technical proficiency | Basic to intermediate |
| Primary device | Tablet (iPad, Android tablet) |
| Usage context | Classroom (offline), Home (online) |
| Session frequency | 2-5 times per week |
| Session duration | 10-30 minutes |

### Admin Persona
| Attribute | Value |
|-----------|-------|
| Role | Teacher, Curriculum Designer, Education Coordinator |
| Technical proficiency | Intermediate |
| Primary device | Desktop/Laptop browser |
| Tasks | Create content, organize curriculum, review progress |

---

## 3. User Stories

### Student User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-S001 | As a student, I want to browse available learning domains so that I can choose what to practice | Domains display with title, description, and progress indicator |
| US-S002 | As a student, I want to practice questions offline so that I can learn without internet | All cached content accessible offline; attempts saved locally |
| US-S003 | As a student, I want to see my progress and mastery level so that I know how I'm improving | Dashboard shows per-skill mastery percentage and total points |
| US-S004 | As a student, I want to resume where I left off after reconnecting so that I don't lose work | All offline attempts sync automatically; no duplicates created |
| US-S005 | As a student, I want immediate feedback on my answers so that I learn from mistakes | Correct/incorrect shown immediately with explanation |
| US-S006 | As a student, I want to earn points and see streaks so that I stay motivated | Points awarded per question; streak counter visible |

### Admin User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-A001 | As an admin, I want to create and manage curriculum so that students have content to practice | CRUD operations for domains, skills, questions |
| US-A002 | As an admin, I want to publish curriculum updates atomically so that students see consistent content | All-or-nothing publish; validation before publish |
| US-A003 | As an admin, I want to import/export curriculum so that I can backup and share content | JSON export/import with validation |
| US-A004 | As an admin, I want to view student progress analytics so that I can identify struggling areas | Aggregate stats by domain/skill; individual student progress |
| US-A005 | As an admin, I want to preview questions as students see them so that I can verify content | Preview mode shows exact student UI |

---

## 4. Feature Requirements

### MVP Features (Phase 1-3)

#### Student App
- [x] Offline-first architecture
- [x] Domain/Skill/Question browsing
- [x] 5 question types (multiple_choice, mcq_multi, text_input, boolean, reorder_steps)
- [x] Progress tracking per skill
- [x] Automatic sync when online
- [x] Visual offline indicator
- [x] Immediate answer feedback

#### Admin Panel
- [x] Secure admin authentication
- [x] Domain CRUD with validation
- [x] Skill CRUD with validation
- [x] Question CRUD with type-specific editors
- [x] Atomic publish workflow
- [x] JSON import/export

### Future Features (Post-MVP)
- [ ] OAuth login (Google, Apple) for admins
- [ ] Student account linking (upgrade anonymous to full account for cross-device progress)
- [ ] Rich media in questions (images, audio)
- [ ] Adaptive difficulty
- [ ] Detailed analytics dashboard
- [ ] Multi-language support
- [ ] Gamification (badges, leaderboards)

---

## 5. Out of Scope (MVP)

The following are explicitly **NOT** included in MVP:

1. **Student-managed accounts** - No login screen, email/password, or account recovery for students. Device-bound anonymous authentication is used silently for backend sync (see `DATA_MODEL.md` BR-008). Cross-device progress sync is a future feature.
2. **Rich media content** - Questions are text-only for MVP
3. **Adaptive learning** - Fixed difficulty per question
4. **Social features** - No leaderboards, sharing, or multiplayer
5. **Push notifications** - No reminders or alerts
6. **Advanced analytics** - Basic progress only
7. **Multi-tenant** - Single curriculum per deployment
8. **Localization** - English only

---

## 6. Constraints

### Technical Constraints
- Must work offline for extended periods (hours/days)
- Sync must never lose student progress
- Tablet-first design (10" screen minimum for optimal experience)
- Must handle intermittent connectivity gracefully

### Business Constraints
- No paid third-party services beyond Supabase
- Must be deployable by a single developer
- Must be maintainable by non-technical curriculum designers

---

## 7. Glossary

| Term | Definition |
|------|------------|
| Domain | Top-level subject area (e.g., "Mathematics") |
| Skill | Specific topic within a domain (e.g., "Basic Algebra") |
| Question | Individual practice item within a skill |
| Attempt | Student's answer to a question |
| Session | A continuous practice period |
| Mastery | Percentage of correct answers for a skill |
| Streak | Consecutive correct answers |

---

## Agent Instructions

This document is COMPLETE. Agents should:
1. Reference user stories when implementing features
2. Verify acceptance criteria are met
3. Stay within MVP scope - do NOT implement future features
4. Consult SCHEMA.md for data structure details

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-26 | Agent | Created stub document |
| 2026-01-26 | Agent | Completed all sections with MVP scope |
| 2026-01-27 | Agent | Clarified student auth: device-bound anonymous auth for sync, no login UI |
