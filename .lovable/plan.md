## Learner LMS Dashboard — Implementation Plan

The platform already has the full backbone (enrollments, course_modules, course_lessons, lecture_media, quizzes, quiz_questions, quiz_attempts, assignments, assignment_submissions, lesson_progress, issued_certificates, recompute_course_progress RPC). I will not duplicate any of it. This plan wires a premium LMS UX on top.

Given the size of the spec, I'll deliver it in **one cohesive Phase 1** that covers the 80% that matters end-to-end. Anything not in Phase 1 is listed as a follow-up so we don't ship half-built features.

### Phase 1 — Ships now

**1. Header / KPI strip** on `/learner/courses`
- Welcome + avatar, total / in-progress / completed courses, certificates earned, overall avg %.
- Search box + filter chips (All / In Progress / Completed / Not Started / Recently Added).

**2. Assigned Coaches rail**
- Derived from `enrollments.coach_id` → `profiles`.
- Horizontal scrollable cards: avatar, name, expertise, course count, WhatsApp / Email / Book Session buttons (re-uses existing contact-access logic).

**3. Course cards (replace current `LearnerCourses.tsx`)**
- Thumbnail, title, coach, modules + lessons count, duration, progress bar, last-watched lesson title.
- Smart CTA: "Start" / "Continue" / "Review" / "Locked" based on `progress_percent` and `payment_status`.

**4. LMS Course Player (upgrade existing `CoursePlayer.tsx`)**
- Two-pane layout: left = collapsible module → lesson accordion with completion ticks; right = active lesson.
- Lesson renderer already supports YouTube + uploaded video + images via `lecture_media`; I'll add: PDF inline viewer, external link, audio, downloadable attachments list, "Mark complete" button (writes `lesson_progress`, calls `recompute_course_progress` RPC), auto-advance to next lesson, resume from last viewed lesson (localStorage + `lesson_progress.last_position_seconds`).
- Tabs under player: Overview · Resources · Notes (per-lesson, stored in `lesson_progress.notes` if column exists, else new `lesson_notes` table) · Quiz · Assignment.

**5. Quiz runner** (uses existing `quizzes` / `quiz_questions` / `quiz_attempts`)
- MCQ / true-false / multi-select / descriptive.
- Timer, instant scoring, pass/fail, retry.

**6. Assignment submission** (uses existing `assignments` / `assignment_submissions`)
- Upload to `course-content` bucket, link submission, status badge (submitted / reviewed / approved / rejected) + coach feedback.

**7. Certificates tab** — already exists; I'll surface "Download" + LinkedIn share on completed courses inside the player too.

**8. Progress tracking**
- Circular progress on course header.
- Each lesson auto-marks complete at 90% video watched (uses existing `lesson_progress`).

### Phase 2 — Follow-ups (NOT in this build)

- Live class scheduling/attendance (Zoom/Meet/Teams join flows).
- Push + WhatsApp notifications for new lesson / deadline / live reminder (current system has in-app + email only).
- Subtitle (.vtt) upload pipeline & DRM-style anti-download.
- Weekly activity graph + learning streak analytics widgets.
- Coach-side review UI for assignments (separate coach dashboard task).

### Technical notes
- All queries are RLS-safe — learners already only see rows where `learner_id = auth.uid()`.
- New file: `src/components/learner/lms/` with `LearnerLMSDashboard.tsx`, `AssignedCoachesRail.tsx`, `CourseGrid.tsx`, `LessonRenderer.tsx`, `QuizRunner.tsx`, `AssignmentPanel.tsx`, `ModuleSidebar.tsx`.
- `LearnerCourses.tsx` becomes a thin wrapper around `LearnerLMSDashboard`.
- `CoursePlayer.tsx` refactored to use `ModuleSidebar` + `LessonRenderer`.
- One small migration: add `notes text` and `last_position_seconds int` to `lesson_progress` if missing; add `lesson_notes` only if needed.
- Design tokens only (no raw colors); skeleton loaders; mobile-first; existing dark theme.

### What I need from you
Confirm Phase 1 scope. If you want any Phase-2 item pulled forward (especially Live Classes or Notifications), say which ones — those each add meaningful work.
