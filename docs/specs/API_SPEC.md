# API Specification

> **Status**: COMPLETE
> **Last Updated**: 2026-01-26

---

## Purpose

This document defines the API contracts between:
- Student App <-> Supabase
- Admin Panel <-> Supabase
- Realtime subscriptions
- RPC functions

---

## API Overview

### Base URLs
- **REST API**: `https://<project-ref>.supabase.co/rest/v1`
- **Auth API**: `https://<project-ref>.supabase.co/auth/v1`
- **Realtime**: `wss://<project-ref>.supabase.co/realtime/v1`

### Authentication
- **Provider**: Supabase Auth
- **Methods**:
  - **Admin Panel**: Email/Password login
  - **Student App**: Anonymous Auth (device-bound, no login UI) - see `DATA_MODEL.md` BR-008
- **Token Format**: JWT (expires in 1 hour, auto-refreshes via refresh token)
- **Header**: `Authorization: Bearer <access_token>`
- **API Key Header**: `apikey: <anon_key>`

**Anonymous Auth Flow (Student App)**:
```dart
// First launch - create anonymous session
final response = await supabase.auth.signInAnonymously();
// Session is auto-created, auth.uid() is now available
// A profiles row is auto-created via database trigger
```

**Important**: Both admin (email/password) and student (anonymous) users get a valid `auth.uid()`. The difference is `profiles.role` = 'admin' vs 'student'.

### Content Type
All requests and responses use `Content-Type: application/json`

---

## REST Endpoints (Supabase Auto-Generated)

### Domains

| Method | Endpoint | Auth | RLS | Description |
|--------|----------|------|-----|-------------|
| GET | `/domains?is_published=eq.true&deleted_at=is.null` | Student | Read published | List published domains |
| GET | `/domains` | Admin | Full access | List all domains |
| GET | `/domains?id=eq.<uuid>` | Both | Role-based | Get single domain |
| POST | `/domains` | Admin | Insert | Create domain |
| PATCH | `/domains?id=eq.<uuid>` | Admin | Update | Update domain |
| DELETE | `/domains?id=eq.<uuid>` | Admin | Soft delete | Set deleted_at |

**Create Domain Request**:
```json
{
  "slug": "mathematics",
  "title": "Mathematics",
  "description": "Fundamental math concepts",
  "sort_order": 1,
  "is_published": false
}
```

**Domain Response**:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "slug": "mathematics",
  "title": "Mathematics",
  "description": "Fundamental math concepts",
  "sort_order": 1,
  "is_published": false,
  "created_at": "2026-01-26T19:30:00Z",
  "updated_at": "2026-01-26T19:30:00Z",
  "deleted_at": null
}
```

### Skills

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/skills?domain_id=eq.<uuid>&is_published=eq.true&deleted_at=is.null` | Student | List published skills |
| GET | `/skills?domain_id=eq.<uuid>` | Admin | List all skills in domain |
| POST | `/skills` | Admin | Create skill |
| PATCH | `/skills?id=eq.<uuid>` | Admin | Update skill |

**Create Skill Request**:
```json
{
  "domain_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "slug": "basic_algebra",
  "title": "Basic Algebra",
  "description": "Introduction to algebraic expressions",
  "difficulty_level": 1,
  "sort_order": 1,
  "is_published": false
}
```

### Questions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/questions?skill_id=eq.<uuid>&is_published=eq.true&deleted_at=is.null` | Student | List published questions |
| GET | `/questions?skill_id=eq.<uuid>` | Admin | List all questions in skill |
| POST | `/questions` | Admin | Create question |
| PATCH | `/questions?id=eq.<uuid>` | Admin | Update question |

**Create Question Request (multiple_choice)**:
```json
{
  "skill_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "type": "multiple_choice",
  "content": "What is 2 + 2?",
  "options": {
    "options": [
      {"id": "a", "text": "3"},
      {"id": "b", "text": "4"},
      {"id": "c", "text": "5"}
    ]
  },
  "solution": {"correct_option_id": "b"},
  "explanation": "2 + 2 equals 4",
  "points": 1,
  "is_published": false
}
```

### Attempts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/attempts?user_id=eq.<uuid>` | Admin | View student attempts (admin analytics only) |

**IMPORTANT**: Students do **NOT** use REST endpoints to submit attempts. Use the `batch_submit_attempts` RPC instead. This ensures:
- Consistent idempotency (ON CONFLICT handling)
- Server-enforced `user_id` from `auth.uid()` (security)
- Proper offline sync batch processing

See RPC section below for `batch_submit_attempts` usage.

### Skill Progress

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/skill_progress?user_id=eq.<uuid>` | Student (own) | Get own progress |
| POST | `/skill_progress` | Student | Create progress record |
| PATCH | `/skill_progress?id=eq.<uuid>` | Student (own) | Update progress |

---

## RPC Functions

### `publish_curriculum()`

Atomically validates and publishes curriculum.

**Endpoint**: `POST /rpc/publish_curriculum`

**Request**: No parameters

**Response**:
- Success: `null` (void)
- Failure: `{"message": "Error description", "code": "..."}`

**Errors**:
- `Unauthorized: Only admins can publish`
- `Cannot publish: orphaned skills detected`
- `Cannot publish: orphaned questions detected`
- `Cannot publish: empty domains detected`

### `batch_submit_attempts(attempts_json JSONB)` — Primary Student Submission Path

**This is the ONLY way students submit attempts.** Do NOT use REST `/attempts` for student submissions.

**Endpoint**: `POST /rpc/batch_submit_attempts`

**Why RPC instead of REST**:
- Handles offline batches atomically
- Idempotent via `ON CONFLICT (id) DO UPDATE`
- Server enforces `user_id = auth.uid()` (clients cannot spoof user_id)
- Returns all upserted records for local reconciliation

**Request**:
```json
{
  "attempts_json": [
    {
      "id": "uuid-1",
      "question_id": "question-uuid",
      "response": {"selected_option_id": "a"},
      "is_correct": true,
      "score_awarded": 1,
      "time_spent_ms": 3000,
      "created_at": "2026-01-26T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "question_id": "question-uuid-2",
      "response": {"text": "Paris"},
      "is_correct": true,
      "score_awarded": 2,
      "time_spent_ms": 8000,
      "created_at": "2026-01-26T10:01:00Z"
    }
  ]
}
```

**CRITICAL**: Do NOT include `user_id` in the payload. The server assigns it from `auth.uid()`.

**Response**: Array of upserted attempt records with server-assigned `user_id`

**Error Handling**:
- `Authentication required` - No valid session (call `signInAnonymously()` first)
- Duplicate `id` with different `user_id` - Update is silently skipped (security)

---

## Realtime Subscriptions

### Curriculum Updates Channel

Subscribe to curriculum version changes for cache invalidation.

```typescript
const channel = supabase.channel('curriculum-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'curriculum_meta',
    filter: 'id=eq.singleton'
  }, (payload) => {
    console.log('Curriculum updated:', payload.new.version);
    // Trigger full curriculum refresh
  })
  .subscribe();
```

### Admin: Track Content Changes

```typescript
// Subscribe to domain changes
supabase.channel('admin-domains')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'domains'
  }, handleDomainChange)
  .subscribe();
```

---

## Sync API Contract

### Pull (Download Changes)

**Strategy**: Delta sync using `updated_at` timestamp

**Student App Request Pattern**:
```typescript
// For each syncable table
const { data } = await supabase
  .from('domains')
  .select('*')
  .gt('updated_at', lastSyncTimestamp)
  .is('deleted_at', null)
  .eq('is_published', true);
```

**Tables to Sync (in order)**:
1. `domains` - Get updated domains
2. `skills` - Get updated skills
3. `questions` - Get updated questions

**After sync**: Update `sync_meta.last_synced_at` for each table

### Push (Upload Changes)

**Strategy**: Process outbox queue

```typescript
// Get pending outbox items
const outboxItems = await localDb.outbox
  .filter(item => item.synced_at === null)
  .sortBy('created_at');

// Submit in batch
const { data, error } = await supabase
  .rpc('batch_submit_attempts', {
    attempts_json: outboxItems.map(i => JSON.parse(i.payload))
  });

// On success, mark as synced
if (!error) {
  await localDb.outbox.update(
    outboxItems.map(i => ({ ...i, synced_at: new Date() }))
  );
}
```

---

## Error Codes

### Supabase/PostgREST Errors

| Code | HTTP Status | Description | Client Action |
|------|-------------|-------------|---------------|
| `PGRST301` | 401 | JWT expired | Refresh token, retry |
| `PGRST302` | 403 | RLS policy violation | Check user role |
| `PGRST116` | 406 | No rows returned | Handle empty result |
| `23505` | 409 | Unique constraint violated | Handle duplicate |
| `23503` | 409 | Foreign key violated | Check parent exists |
| `42501` | 403 | Insufficient privilege | Admin required |

### Application Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `E001` | Network timeout | Retry with backoff |
| `E002` | JWT expired | Re-authenticate |
| `E003` | RLS denied | Verify role |
| `E004` | Sync conflict | Apply merge strategy |
| `E005` | Schema mismatch | Regenerate types |
| `E006` | Validation failed | Show field errors |
| `E007` | Unique violation | Handle duplicate |

---

## Rate Limits

| Resource | Limit | Window |
|----------|-------|--------|
| API requests (anon) | 1000 | per minute |
| API requests (authenticated) | 5000 | per minute |
| Realtime connections | 200 | concurrent |
| Batch size (attempts) | 100 | per request |
| File uploads | 50MB | per file |

---

## Request/Response Patterns

### Pagination (for large lists)

```typescript
const { data, count } = await supabase
  .from('questions')
  .select('*', { count: 'exact' })
  .range(0, 49)  // First 50 items
  .order('sort_order', { ascending: true });
```

### Filtering Published Content

```typescript
// Student view: only published, non-deleted
const { data } = await supabase
  .from('domains')
  .select('*')
  .eq('is_published', true)
  .is('deleted_at', null)
  .order('sort_order');
```

### Including Related Data

```typescript
// Get skills with their questions
const { data } = await supabase
  .from('skills')
  .select(`
    *,
    questions (*)
  `)
  .eq('domain_id', domainId);
```

---

## Agent Instructions

**WHEN IMPLEMENTING API CALLS**:
1. Use Supabase client libraries, not raw fetch
2. Handle ALL error codes in the table above
3. Implement retry with exponential backoff for 5xx and network errors
4. Never expose `service_role` key in client code
5. Always include RLS-aware filters for student queries

**WHEN IMPLEMENTING SYNC**:
1. Process outbox in FIFO order
2. On conflict, use client UUID to deduplicate
3. Update sync_meta timestamp only after successful sync
4. Preserve created_at from client for attempts

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-26 | Agent | Created stub document |
| 2026-01-26 | Agent | Completed all endpoints, RPC, realtime, error codes |
| 2026-01-27 | Agent | Clarified auth (anonymous for students), made RPC the only student attempt submission path |
