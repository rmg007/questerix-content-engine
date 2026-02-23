# Field Mapping Reference

> **Status**: COMPLETE
> **Original Reference**: `document-804ab217-ea83-4cf5-95b3-998e1612ebce.md`

---

## Purpose

This document provides a field-by-field mapping between:
- PostgreSQL (Supabase) schema
- Drift (SQLite) schema (Student App)
- TypeScript types (Admin Panel)
- JSON API payloads

---

## Domains Table

| PostgreSQL | Drift (Dart) | TypeScript | JSON Key |
|------------|--------------|------------|----------|
| `id` (UUID) | `id` (String) | `id: string` | `"id"` |
| `slug` (TEXT) | `slug` (String) | `slug: string` | `"slug"` |
| `title` (TEXT) | `title` (String) | `title: string` | `"title"` |
| `description` (TEXT) | `description` (String?) | `description: string \| null` | `"description"` |
| `sort_order` (INTEGER) | `sortOrder` (int) | `sort_order: number` | `"sort_order"` |
| `is_published` (BOOLEAN) | `isPublished` (bool) | `is_published: boolean` | `"is_published"` |
| `created_at` (TIMESTAMPTZ) | `createdAt` (DateTime) | `created_at: string` | `"created_at"` |
| `updated_at` (TIMESTAMPTZ) | `updatedAt` (DateTime) | `updated_at: string` | `"updated_at"` |
| `deleted_at` (TIMESTAMPTZ) | `deletedAt` (DateTime?) | `deleted_at: string \| null` | `"deleted_at"` |

---

## Skills Table

| PostgreSQL | Drift (Dart) | TypeScript | JSON Key |
|------------|--------------|------------|----------|
| `id` (UUID) | `id` (String) | `id: string` | `"id"` |
| `domain_id` (UUID) | `domainId` (String) | `domain_id: string` | `"domain_id"` |
| `slug` (TEXT) | `slug` (String) | `slug: string` | `"slug"` |
| `title` (TEXT) | `title` (String) | `title: string` | `"title"` |
| `description` (TEXT) | `description` (String?) | `description: string \| null` | `"description"` |
| `difficulty_level` (INTEGER) | `difficultyLevel` (int) | `difficulty_level: number` | `"difficulty_level"` |
| `sort_order` (INTEGER) | `sortOrder` (int) | `sort_order: number` | `"sort_order"` |
| `is_published` (BOOLEAN) | `isPublished` (bool) | `is_published: boolean` | `"is_published"` |
| `created_at` (TIMESTAMPTZ) | `createdAt` (DateTime) | `created_at: string` | `"created_at"` |
| `updated_at` (TIMESTAMPTZ) | `updatedAt` (DateTime) | `updated_at: string` | `"updated_at"` |
| `deleted_at` (TIMESTAMPTZ) | `deletedAt` (DateTime?) | `deleted_at: string \| null` | `"deleted_at"` |

---

## Questions Table

| PostgreSQL | Drift (Dart) | TypeScript | JSON Key |
|------------|--------------|------------|----------|
| `id` (UUID) | `id` (String) | `id: string` | `"id"` |
| `skill_id` (UUID) | `skillId` (String) | `skill_id: string` | `"skill_id"` |
| `type` (question_type) | `type` (String) | `type: QuestionType` | `"type"` |
| `content` (TEXT) | `content` (String) | `content: string` | `"content"` |
| `options` (JSONB) | `options` (String) | `options: object` | `"options"` |
| `solution` (JSONB) | `solution` (String) | `solution: object` | `"solution"` |
| `explanation` (TEXT) | `explanation` (String?) | `explanation: string \| null` | `"explanation"` |
| `points` (INTEGER) | `points` (int) | `points: number` | `"points"` |
| `is_published` (BOOLEAN) | `isPublished` (bool) | `is_published: boolean` | `"is_published"` |
| `created_at` (TIMESTAMPTZ) | `createdAt` (DateTime) | `created_at: string` | `"created_at"` |
| `updated_at` (TIMESTAMPTZ) | `updatedAt` (DateTime) | `updated_at: string` | `"updated_at"` |
| `deleted_at` (TIMESTAMPTZ) | `deletedAt` (DateTime?) | `deleted_at: string \| null` | `"deleted_at"` |

### Question Type Mapping

| PostgreSQL Enum | Dart String | TypeScript Enum |
|-----------------|-------------|-----------------|
| `'multiple_choice'` | `'multiple_choice'` | `QuestionType.MULTIPLE_CHOICE` |
| `'mcq_multi'` | `'mcq_multi'` | `QuestionType.MCQ_MULTI` |
| `'text_input'` | `'text_input'` | `QuestionType.TEXT_INPUT` |
| `'boolean'` | `'boolean'` | `QuestionType.BOOLEAN` |
| `'reorder_steps'` | `'reorder_steps'` | `QuestionType.REORDER_STEPS` |

---

## Attempts Table

| PostgreSQL | Drift (Dart) | TypeScript | JSON Key |
|------------|--------------|------------|----------|
| `id` (UUID) | `id` (String) | `id: string` | `"id"` |
| `user_id` (UUID) | `userId` (String) | `user_id: string` | `"user_id"` |
| `question_id` (UUID) | `questionId` (String) | `question_id: string` | `"question_id"` |
| `response` (JSONB) | `response` (String) | `response: object` | `"response"` |
| `is_correct` (BOOLEAN) | `isCorrect` (bool) | `is_correct: boolean` | `"is_correct"` |
| `score_awarded` (INTEGER) | `scoreAwarded` (int) | `score_awarded: number` | `"score_awarded"` |
| `time_spent_ms` (INTEGER) | `timeSpentMs` (int?) | `time_spent_ms: number \| null` | `"time_spent_ms"` |
| `created_at` (TIMESTAMPTZ) | `createdAt` (DateTime) | `created_at: string` | `"created_at"` |
| `updated_at` (TIMESTAMPTZ) | `updatedAt` (DateTime) | `updated_at: string` | `"updated_at"` |
| `deleted_at` (TIMESTAMPTZ) | `deletedAt` (DateTime?) | `deleted_at: string \| null` | `"deleted_at"` |

---

## Sessions Table

| PostgreSQL | Drift (Dart) | TypeScript | JSON Key |
|------------|--------------|------------|----------|
| `id` (UUID) | `id` (String) | `id: string` | `"id"` |
| `user_id` (UUID) | `userId` (String) | `user_id: string` | `"user_id"` |
| `skill_id` (UUID) | `skillId` (String?) | `skill_id: string \| null` | `"skill_id"` |
| `started_at` (TIMESTAMPTZ) | `startedAt` (DateTime) | `started_at: string` | `"started_at"` |
| `ended_at` (TIMESTAMPTZ) | `endedAt` (DateTime?) | `ended_at: string \| null` | `"ended_at"` |
| `questions_attempted` (INTEGER) | `questionsAttempted` (int) | `questions_attempted: number` | `"questions_attempted"` |
| `questions_correct` (INTEGER) | `questionsCorrect` (int) | `questions_correct: number` | `"questions_correct"` |
| `total_time_ms` (INTEGER) | `totalTimeMs` (int) | `total_time_ms: number` | `"total_time_ms"` |
| `created_at` (TIMESTAMPTZ) | `createdAt` (DateTime) | `created_at: string` | `"created_at"` |
| `updated_at` (TIMESTAMPTZ) | `updatedAt` (DateTime) | `updated_at: string` | `"updated_at"` |
| `deleted_at` (TIMESTAMPTZ) | `deletedAt` (DateTime?) | `deleted_at: string \| null` | `"deleted_at"` |

---

## Profiles Table

| PostgreSQL | Drift (Dart) | TypeScript | JSON Key |
|------------|--------------|------------|----------|
| `id` (UUID) | `id` (String) | `id: string` | `"id"` |
| `role` (user_role) | `role` (String) | `role: 'admin' \| 'student'` | `"role"` |
| `email` (TEXT) | `email` (String) | `email: string` | `"email"` |
| `full_name` (TEXT) | `fullName` (String?) | `full_name: string \| null` | `"full_name"` |
| `avatar_url` (TEXT) | `avatarUrl` (String?) | `avatar_url: string \| null` | `"avatar_url"` |
| `created_at` (TIMESTAMPTZ) | `createdAt` (DateTime) | `created_at: string` | `"created_at"` |
| `updated_at` (TIMESTAMPTZ) | `updatedAt` (DateTime) | `updated_at: string` | `"updated_at"` |
| `deleted_at` (TIMESTAMPTZ) | `deletedAt` (DateTime?) | `deleted_at: string \| null` | `"deleted_at"` |

---

## Skill Progress Table

| PostgreSQL | Drift (Dart) | TypeScript | JSON Key |
|------------|--------------|------------|----------|
| `id` (UUID) | `id` (String) | `id: string` | `"id"` |
| `user_id` (UUID) | `userId` (String) | `user_id: string` | `"user_id"` |
| `skill_id` (UUID) | `skillId` (String) | `skill_id: string` | `"skill_id"` |
| `total_attempts` (INTEGER) | `totalAttempts` (int) | `total_attempts: number` | `"total_attempts"` |
| `correct_attempts` (INTEGER) | `correctAttempts` (int) | `correct_attempts: number` | `"correct_attempts"` |
| `total_points` (INTEGER) | `totalPoints` (int) | `total_points: number` | `"total_points"` |
| `mastery_level` (INTEGER) | `masteryLevel` (int) | `mastery_level: number` | `"mastery_level"` |
| `current_streak` (INTEGER) | `currentStreak` (int) | `current_streak: number` | `"current_streak"` |
| `best_streak` (INTEGER) | `bestStreak` (int) | `best_streak: number` | `"best_streak"` |
| `last_attempt_at` (TIMESTAMPTZ) | `lastAttemptAt` (DateTime?) | `last_attempt_at: string \| null` | `"last_attempt_at"` |
| `created_at` (TIMESTAMPTZ) | `createdAt` (DateTime) | `created_at: string` | `"created_at"` |
| `updated_at` (TIMESTAMPTZ) | `updatedAt` (DateTime) | `updated_at: string` | `"updated_at"` |
| `deleted_at` (TIMESTAMPTZ) | `deletedAt` (DateTime?) | `deleted_at: string \| null` | `"deleted_at"` |

---

## Outbox Table (Client-Side Only)

| Drift (Dart) | Purpose |
|--------------|---------|
| `id` (String) | Auto-generated UUID |
| `tableName` (String) | Target table name |
| `action` (String) | 'INSERT', 'UPDATE', 'DELETE', 'UPSERT' |
| `recordId` (String) | UUID of affected record |
| `payload` (String) | JSON-encoded record data |
| `createdAt` (DateTime) | When queued |
| `syncedAt` (DateTime?) | When successfully synced (null = pending) |
| `errorMessage` (String?) | Last error if sync failed |
| `retryCount` (int) | Number of sync attempts |

---

## Sync Meta Table

| PostgreSQL | Drift (Dart) | Purpose |
|------------|--------------|---------|
| `table_name` (TEXT) | `tableName` (String) | Table being tracked |
| `last_synced_at` (TIMESTAMPTZ) | `lastSyncedAt` (DateTime) | Timestamp for delta sync |
| `sync_version` (INTEGER) | `syncVersion` (int) | For breaking change detection |

---

## Type Conversion Notes

### DateTime Handling
- **PostgreSQL**: `TIMESTAMPTZ` stored as ISO 8601 string
- **Drift**: `DateTime` object (UTC recommended)
- **TypeScript**: ISO 8601 string
- **JSON**: ISO 8601 string with timezone (`"2026-01-26T19:30:00Z"`)

### JSONB Handling
- **PostgreSQL**: Native JSONB type
- **Drift**: Store as `String` (JSON-encoded)
- **TypeScript**: Parse as object, validate with Zod schema
- **JSON**: Native object/array

### UUID Generation
- **PostgreSQL**: `gen_random_uuid()` on INSERT
- **Drift (Client)**: `Uuid().v4()` from `uuid` package
- **TypeScript**: `crypto.randomUUID()` or `uuid` package

---

## Agent Instructions

**WHEN CREATING MODELS**:
1. Use this document as the single source of truth for field names
2. Dart uses camelCase, PostgreSQL uses snake_case
3. TypeScript types should match JSON keys exactly
4. Always handle nullable fields appropriately

**WHEN SYNCING DATA**:
1. Convert DateTime to ISO 8601 strings for JSON
2. Parse JSONB fields with appropriate type validators
3. Preserve all fields during sync (don't drop unknown fields)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-26 | Agent | Created stub document |
| 2026-01-26 | Agent | Added skill_progress table mapping, marked complete |
