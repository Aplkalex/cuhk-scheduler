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

## Option B – Maintain a JSON export and import it into MongoDB

Use this path when you want the production API to read from MongoDB but still control the data manually.

1. Create a JSON file under `data/`, e.g. `data/courses-2025-26-T1.json`. It must be an array of course objects that match the `Course` interface (use ISO strings for `lastUpdated` because JSON cannot store `Date` instances).
2. Populate every course/section exactly like the TypeScript template above.
3. Ensure `.env.local` (or `.env`) contains `MONGODB_URI` and, optionally, `ALLOW_FALLBACK_DATA=false` once the database is populated.
4. Import the JSON:
   ```bash
   npm run import:courses -- data/courses-2025-26-T1.json
   ```
   The script wipes the existing `Term` and `Course` collections, re-creates terms based on the `term` fields in your JSON, and inserts every course.
5. Start the dev server (`npm run dev`). Because MongoDB now has data, `/api/courses` will serve it automatically. Keep your JSON files under version control so you always know what was last imported.

To reseed the database with the bundled sample data, run:

```bash
npm run db:seed
```

---

## Quick checklist for manual updates

- [ ] Added/edited course objects inside `src/data/mock-courses.ts` (or `src/data/test-courses.ts` for QA fixtures).
- [ ] Updated `TermType` + `defaultTerms` if a brand-new term ID was introduced.
- [ ] Ran `npm run import:courses -- <json>` after editing JSON (only if using MongoDB).
- [ ] Restarted the Next.js dev server if you changed environment variables.

Once these steps are done, the UI, schedule generator, and API routes will all reflect your manually curated dataset. No scraper required. 🎉
