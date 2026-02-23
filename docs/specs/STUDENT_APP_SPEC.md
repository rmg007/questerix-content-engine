# Student App Specification

> **Status**: COMPLETE
> **Last Updated**: 2026-01-26

---

## Purpose

This document defines the Flutter Student App requirements, UI/UX specifications, and technical constraints.

---

## Technical Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Framework | Flutter | >= 3.19.0 | Stable channel |
| State Management | flutter_riverpod | ^2.5.0 | LOCKED |
| Local Database | drift | ^2.15.0 | With sqlite3_flutter_libs |
| Backend Client | supabase_flutter | ^2.0.0 | LOCKED |
| Secure Storage | flutter_secure_storage | ^9.0.0 | For session persistence |
| Connectivity | connectivity_plus | ^6.0.0 | |
| Error Tracking | sentry_flutter | ^8.0.0 | |
| UUID Generation | uuid | ^4.3.0 | For offline IDs |
| JSON Serialization | json_annotation | ^4.8.0 | With json_serializable |
| Freezed | freezed_annotation | ^2.4.0 | For immutable models |

### pubspec.yaml Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  supabase_flutter: ^2.0.0
  flutter_secure_storage: ^9.0.0  # For anonymous session persistence
  drift: ^2.15.0
  sqlite3_flutter_libs: ^0.5.0
  connectivity_plus: ^6.0.0
  sentry_flutter: ^8.0.0
  uuid: ^4.3.0
  json_annotation: ^4.8.0
  freezed_annotation: ^2.4.0
  intl: ^0.19.0
  path_provider: ^2.1.0
  path: ^1.8.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.0
  drift_dev: ^2.15.0
  json_serializable: ^6.7.0
  freezed: ^2.4.0
  riverpod_generator: ^2.3.0
  integration_test:
    sdk: flutter
  mocktail: ^1.0.0
```

---

## App Architecture

```
lib/
├── main.dart                    # App entry point, Sentry init
├── app.dart                     # MaterialApp, routing setup
├── src/
│   ├── core/
│   │   ├── errors/
│   │   │   ├── app_error.dart       # Base error class
│   │   │   ├── network_error.dart
│   │   │   ├── sync_error.dart
│   │   │   └── validation_error.dart
│   │   ├── constants/
│   │   │   ├── app_constants.dart   # Timeouts, limits
│   │   │   └── api_constants.dart   # Endpoints
│   │   └── utils/
│   │       ├── logger.dart          # Logging service
│   │       └── retry.dart           # Retry with backoff
│   │
│   ├── database/
│   │   ├── database.dart            # Drift database class
│   │   ├── database.g.dart          # Generated
│   │   └── tables/
│   │       ├── domains_table.dart
│   │       ├── skills_table.dart
│   │       ├── questions_table.dart
│   │       ├── attempts_table.dart
│   │       ├── sessions_table.dart
│   │       ├── skill_progress_table.dart
│   │       ├── outbox_table.dart
│   │       └── sync_meta_table.dart
│   │
│   ├── features/
│   │   ├── auth/                    # Anonymous auth service (no UI)
│   │   ├── curriculum/
│   │   │   ├── domain_list_screen.dart
│   │   │   ├── skill_list_screen.dart
│   │   │   └── providers/
│   │   ├── practice/
│   │   │   ├── practice_screen.dart
│   │   │   ├── question_runner.dart
│   │   │   └── widgets/
│   │   │       ├── multiple_choice_widget.dart
│   │   │       ├── mcq_multi_widget.dart
│   │   │       ├── text_input_widget.dart
│   │   │       ├── boolean_widget.dart
│   │   │       └── reorder_steps_widget.dart
│   │   ├── progress/
│   │   │   ├── progress_screen.dart
│   │   │   └── progress_card.dart
│   │   └── sync/
│   │       ├── sync_service.dart
│   │       ├── sync_state.dart
│   │       └── conflict_resolver.dart
│   │
│   ├── models/
│   │   ├── domain.dart
│   │   ├── skill.dart
│   │   ├── question.dart
│   │   ├── attempt.dart
│   │   ├── session.dart
│   │   └── skill_progress.dart
│   │
│   ├── repositories/
│   │   ├── domain_repository.dart
│   │   ├── skill_repository.dart
│   │   ├── question_repository.dart
│   │   ├── attempt_repository.dart
│   │   ├── session_repository.dart
│   │   └── skill_progress_repository.dart
│   │
│   ├── services/
│   │   ├── auth_service.dart         # Anonymous auth + session persistence
│   │   ├── connectivity_service.dart
│   │   ├── realtime_service.dart
│   │   └── scoring_service.dart
│   │
│   ├── routing/
│   │   └── app_router.dart
│   │
│   └── widgets/
│       ├── offline_banner.dart
│       ├── sync_indicator.dart
│       ├── loading_overlay.dart
│       ├── error_view.dart
│       └── empty_state.dart

test/
├── unit/
│   ├── repositories/
│   ├── services/
│   └── models/
├── widget/
│   └── features/
└── integration_test/
    └── offline_workflow_test.dart
```

---

## Screen Specifications

### 1. Home / Domain List Screen

**Route**: `/` (home)

**Features**:
- **Session Resume**: Checks local DB for unfinished sessions on launch.
- **Offline Status**: Detail view (synced time, pending count) in app bar.
- **Settings**: "Large Text" toggle in drawer for accessibility.

**Layout**:
```
┌─────────────────────────────────────┐
│ [≡] [Offline Status]         [Sync] │
├─────────────────────────────────────┤
│ AppShell                            │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📚 Mathematics              │   │
│  │ Fundamental math concepts   │   │
│  │ ████████░░░░░░  60%         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔬 Science                  │   │
│  │ Natural science topics      │   │
│  │ ██░░░░░░░░░░░░  15%         │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Behavior**:
- Display all published domains from local DB
- Show progress bar (average mastery across skills)
- Show total points earned per domain
- Tap navigates to Skill List
- Pull-to-refresh triggers manual sync

### 2. Skill List Screen

**Route**: `/domain/:domainId`

**Layout**:
```
┌─────────────────────────────────────┐
│ ← Mathematics                       │
├─────────────────────────────────────┤
│                                     │
│  Basic Algebra ⭐⭐⭐⭐⭐              │
│  Mastery: 85%  |  Points: 120       │
│                                     │
│  Geometry ⭐⭐⭐○○                    │
│  Mastery: 55%  |  Points: 45        │
│                                     │
│  Calculus 🔒                        │
│  Complete Geometry first            │
│                                     │
└─────────────────────────────────────┘
```

**Behavior**:
- Display skills within selected domain
- Show mastery stars (1-5 based on mastery_level)
- Show locked state if prerequisites not met (future)
- Tap navigates to Practice Session

### 3. Practice Session Screen

**Route**: `/practice/:skillId`

**Features (Polished UX)**:
- **Confetti Celebration**: Triggers when mastery >= 80% (using `confetti` package).
- **Optimistic UI**: Updates local progress immediately on submit.
- **Feedback**: Immediate correct/incorrect overlay with explanation.

**Layout**:
```
┌─────────────────────────────────────┐
│ ← Basic Algebra         Q 3/10 ⏱️  │
├─────────────────────────────────────┤
│                                     │
│  What is the value of x in:         │
│                                     │
│       2x + 4 = 10                   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ○  2                         │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ● 3                         │   │  ← Selected
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ○  4                         │   │
│  └─────────────────────────────┘   │
│                                     │
│           [Submit Answer]           │
│                                     │
└─────────────────────────────────────┘
```

**After Submit (Feedback)**:
```
┌─────────────────────────────────────┐
│       ✅ Correct! +2 points         │
│                                     │
│  🔥 Streak: 5                       │
│                                     │
│  Explanation:                       │
│  Subtract 4: 2x = 6                 │
│  Divide by 2: x = 3                 │
│                                     │
│           [Next Question]           │
└─────────────────────────────────────┘
```

### 4. Progress Dashboard Screen

**Route**: `/progress`

**Layout**:
```
┌─────────────────────────────────────┐
│ ← Progress                          │
├─────────────────────────────────────┤
│                                     │
│  Total Points: 1,234                │
│  Best Streak: 12                    │
│  Questions Answered: 156            │
│                                     │
├─────────────────────────────────────┤
│  By Domain:                         │
│                                     │
│  Mathematics  ████████░░  80%       │
│  Science      ████░░░░░░  40%       │
│                                     │
├─────────────────────────────────────┤
│  Recent Activity:                   │
│                                     │
│  Today: 12 questions, 9 correct     │
│  Yesterday: 8 questions, 6 correct  │
│                                     │
└─────────────────────────────────────┘
```

---

## Offline-First Requirements

### Data Availability
- [x] All published curriculum cached in local Drift DB
- [x] Student can browse and practice without network
- [x] Attempts queued in outbox table when offline
- [x] Progress calculated locally

### Sync Behavior
- [x] Auto-sync triggered when connectivity restored
- [x] Manual sync via pull-to-refresh or sync button
- [x] Background sync every 5 minutes when online
- [x] Conflict resolution per DATA_MODEL.md rules

### Connectivity Detection
- [x] Primary: `connectivity_plus` for network state
- [x] Secondary: Treat failed requests as offline
- [x] Visual indicator in app bar
- [x] Toast notification on connectivity change

---

## Authentication Service (Anonymous Auth)

Students do NOT see a login screen. The app uses Supabase Anonymous Auth silently to enable backend sync. See `DATA_MODEL.md` BR-008 for full business rules.

### Auth Service Implementation

```dart
// lib/services/auth_service.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(Supabase.instance.client);
});

/// Handles anonymous authentication and session persistence.
/// Students never see a login screen - auth happens silently on first launch.
class AuthService {
  final SupabaseClient _supabase;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  static const _sessionKey = 'supabase_session';
  
  AuthService(this._supabase);
  
  /// Initialize auth on app startup. Call this in main.dart AFTER Supabase.initialize().
  /// 
  /// Flow:
  /// 1. Try to restore existing session from secure storage
  /// 2. If session exists and is valid, we're done
  /// 3. If no session or invalid, create anonymous session
  /// 4. Persist the new session
  Future<void> initSession() async {
    // Try to restore existing session
    final storedSession = await _storage.read(key: _sessionKey);
    
    if (storedSession != null) {
      try {
        final response = await _supabase.auth.recoverSession(storedSession);
        if (response.session != null) {
          // Session restored successfully
          await _persistSession(response.session!);
          return;
        }
      } catch (e) {
        // Session invalid or expired beyond recovery, will create new one below
      }
    }
    
    // No valid session - create anonymous session
    final response = await _supabase.auth.signInAnonymously();
    
    if (response.session != null) {
      await _persistSession(response.session!);
    } else {
      throw Exception('Failed to create anonymous session');
    }
  }
  
  /// Persist session to secure storage for later recovery
  Future<void> _persistSession(Session session) async {
    await _storage.write(
      key: _sessionKey,
      value: session.persistSessionString,
    );
  }
  
  /// Get current user ID. Returns null if not authenticated (should never happen after initSession).
  String? get userId => _supabase.auth.currentUser?.id;
  
  /// Check if user is authenticated
  bool get isAuthenticated => _supabase.auth.currentUser != null;
  
  /// Clear stored session (for testing/debugging only)
  Future<void> clearSession() async {
    await _storage.delete(key: _sessionKey);
    await _supabase.auth.signOut();
  }
  
  /// Listen to auth state changes
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;
}
```

### Main.dart Integration

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase
  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );
  
  // Initialize anonymous auth session (MUST be after Supabase.initialize)
  final authService = AuthService(Supabase.instance.client);
  await authService.initSession();
  
  // Initialize Sentry
  await SentryFlutter.init(
    (options) {
      options.dsn = const String.fromEnvironment('SENTRY_DSN');
      options.environment = const String.fromEnvironment('ENV', defaultValue: 'development');
    },
    appRunner: () => runApp(
      const ProviderScope(child: MyApp()),
    ),
  );
}
```

### Key Points
- **No Login UI**: Students never see authentication
- **Session Persistence**: Uses `flutter_secure_storage` (encrypted)
- **Auto-Recovery**: Supabase handles token refresh automatically
- **Fail-Safe**: If session recovery fails, create new anonymous user
- **Profile Auto-Creation**: Database trigger creates `profiles` row (see `SCHEMA.md`)

---

## Question Type UIs

### Multiple Choice (Single Select)
- Radio button style
- Large tap targets (min 48dp)
- Visual selection feedback
- Submit button enabled when option selected

### Multiple Choice (Multi Select)
- Checkbox style
- "Select all that apply" instruction
- Clear indication of multi-select mode
- Submit enabled when at least one selected

### Text Input
- Single-line text field
- Keyboard type based on expected answer
- Clear button
- Submit on keyboard "Done" or button

### Boolean (True/False)
- Two large buttons, side by side
- Green for True, Red for False (or neutral colors)
- Instant selection feedback

### Reorder Steps
- Draggable list items
- Visual drag handle
- Drop zone indicators
- Accessibility: Up/Down buttons alternative

---

## Performance Requirements

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Cold start | < 3 seconds | Measure main() to first frame |
| Screen transition | < 300ms | Navigator animation duration |
| Question load | < 100ms | From local DB query |
| Sync batch | 1000+ attempts | Load test with mock data |
| Memory usage | < 200MB | Profile with DevTools |
| DB query | < 50ms | Drift query timing |

---

## Accessibility Requirements

- [x] Minimum touch target: 48x48 dp
- [x] Color contrast ratio: 4.5:1 (WCAG AA)
- [x] Screen reader labels on all interactive elements
- [x] Focus order follows visual order
- [x] Keyboard navigation support (for tablet keyboards)
- [x] Reduced motion support (disable animations if requested)

---

## Design System

### Colors
```dart
// Primary
static const primary = Color(0xFF6366F1);      // Indigo
static const primaryDark = Color(0xFF4F46E5);

// Status
static const success = Color(0xFF22C55E);       // Green
static const error = Color(0xFFEF4444);         // Red
static const warning = Color(0xFFF59E0B);       // Amber

// Neutral
static const background = Color(0xFFF8FAFC);
static const surface = Color(0xFFFFFFFF);
static const textPrimary = Color(0xFF1E293B);
static const textSecondary = Color(0xFF64748B);

// Offline indicator
static const offline = Color(0xFFEF4444);

// Text Size (Accessibility)
// Base values, multiplied by SharedPreferences 'text_scale' (default 1.0, large 1.25)

```

### Typography
```dart
// Headings
headline1: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)
headline2: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)
headline3: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)

// Body
bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.normal)
bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.normal)

// Question content
questionText: TextStyle(fontSize: 18, fontWeight: FontWeight.w500)
```

### Spacing
```dart
xs: 4.0
sm: 8.0
md: 16.0
lg: 24.0
xl: 32.0
```

---

## Agent Instructions

**WHEN BUILDING STUDENT APP**:
1. Follow folder structure EXACTLY as specified
2. Use Riverpod for ALL state management (no Provider, BLoC, etc.)
3. Local DB (Drift) is source of truth, not server
4. Test on tablet emulator first (10" screen)
5. Run `flutter analyze` before every commit
6. Run `dart run build_runner build` after model changes

**WHEN IMPLEMENTING FEATURES**:
1. Start with repository layer
2. Add Riverpod providers
3. Build UI last
4. Write tests alongside implementation

**TESTING PRIORITIES**:
1. Sync service (push/pull/conflict resolution)
2. Scoring service (streak, multiplier)
3. Connectivity detection
4. Question type widgets

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-26 | Agent | Created stub document |
| 2026-01-26 | Agent | Completed with architecture, screens, design system |
| 2026-01-27 | Agent | Added auth_service.dart for anonymous auth, flutter_secure_storage |
