# Manual Course Data Entry

The Playwright-based CUSIS scraper has been removed, so all timetable data now flows through manual sources. You have two supported options:

1. Keep everything in the TypeScript arrays (`mockCourses` / `testCourses`) and let the API fall back to them.
2. Maintain a JSON export yourself and push it into MongoDB with the provided importer when you want the `/api/courses` route to read from the database.

Both options share the exact `Course` shape defined in `src/types/index.ts`.

---

## Option A – Edit the in-repo mock data (no database required)

1. Open `src/data/mock-courses.ts`. This file exports `mockCourses: Course[]`.
2. Duplicate an existing object and update its fields. Every course should include:
   - `courseCode`, `courseName`, `department`, `credits`
   - `term` (`2025-26-T1`, `2025-26-T2`, or `2025-26-Summer` by default)
   - `career` (`'Undergraduate'` or `'Postgraduate'`)
   - `sections` → each section needs `sectionId`, `sectionType`, `timeSlots`, `quota`, `enrolled`, `seatsRemaining`. Optional fields: `instructor`, `language`, `parentLecture`, `classNumber`, consent flags, etc.
   - Optional metadata: `description`, `enrollmentRequirements`, `prerequisites`, `lastUpdated`.
3. `timeSlots` expect 24‑hour strings: `"09:30"` to `"10:15"`, with optional `location`.
4. Hot reload picks up changes automatically. When the API cannot reach MongoDB (or `ALLOW_FALLBACK_DATA` stays `true`), it serves this array directly.

> Tip: Add new terms by editing both `TermType` in `src/types/index.ts` and `defaultTerms` in `prisma/seed.ts`.

### Minimal template

```ts
export const mockCourses: Course[] = [
  {
    courseCode: 'CSCI3100',
    courseName: 'Software Engineering',
    department: 'Computer Science and Engineering',
    credits: 3,
    term: '2025-26-T1',
    career: 'Undergraduate',
    prerequisites: ['CSCI2100'],
    sections: [
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        instructor: { name: 'Prof. CHAN' },
        timeSlots: [
          { day: 'Monday', startTime: '10:30', endTime: '11:15', location: 'LSB LT6' },
          { day: 'Thursday', startTime: '09:30', endTime: '10:15', location: 'LSB LT6' },
        ],
        quota: 120,
        enrolled: 98,
        seatsRemaining: 22,
        classNumber: 61234,
      },
    ],
    lastUpdated: new Date('2025-05-10'),
  },
];
```

---

## Option B – Convert Excel exports to JSON (recommended)

When you receive an Excel dump from CUSIS, use the helper script to turn it into `Course[]` JSON that the API, importer, and MongoDB seeders understand.

1. Drop the Excel file into the repo root (e.g. `CUHK CUSIS Course offering (Nov 12).xlsx`).
2. Run the converter:
   ```bash
   npm run convert:excel -- --input "CUHK CUSIS Course offering (Nov 12).xlsx" --term 2025-26-T2 --output data/courses-2025-26-T2.json
   ```
   Flags:
   - `--term` → one of the `TermType` values (update `src/types/index.ts` if you add more).
   - `--career` → defaults to `Undergraduate`.
   - `--sheet` → optional sheet name if the workbook has multiple tabs.
3. The script normalizes section IDs, time slots, instructors, consent flags, etc. Inspect the generated JSON once (it lives under `data/`).
4. The API automatically loads `data/courses-<term>.json` (configurable via `GENERATED_COURSES_PATH`) as its fallback dataset, so the UI immediately reflects the new catalog.

## Option C – Import JSON into MongoDB

Once you trust the JSON (either created manually or via the converter), load it into your Atlas cluster so `/api/courses` can serve it even without the fallback file.

1. Ensure `.env.local` (or `.env`) contains a valid `MONGODB_URI`. Set `ALLOW_FALLBACK_DATA=false` if you want to rely strictly on Mongo once the import succeeds.
2. Run:
   ```bash
   npm run import:courses -- data/courses-2025-26-T2.json
   ```
   The script wipes the old `Term` and `Course` collections, creates terms based on the `term` IDs inside the JSON, and inserts every course.
3. Start the dev server (`npm run dev`). From now on `/api/courses` will serve Mongo data; if the database is unavailable it falls back to the generated JSON file, then `mockCourses`.

To reseed Mongo with the small mock dataset for local testing, run `npm run db:seed`.

---

## Quick checklist for manual updates

- [ ] Added/edited course objects inside `src/data/mock-courses.ts` (or `src/data/test-courses.ts` for QA fixtures) if you still need lightweight dev data.
- [ ] Converted the latest Excel export via `npm run convert:excel -- --input "<file>" --term <term>` so the JSON fallback stays current.
- [ ] Updated `TermType` + `defaultTerms` if a brand-new term ID was introduced.
- [ ] Ran `npm run import:courses -- <json>` to push data into MongoDB (optional but recommended for production).
- [ ] Restarted the Next.js dev server if you changed environment variables.

Once these steps are done, the UI, schedule generator, and API routes will all reflect your manually curated dataset. No scraper required. 🎉
