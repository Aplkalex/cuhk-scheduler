# 🎓 Queuesis | The smarter way to queue courses at CUHK

A CUHK-focused timetable builder that pairs drag-and-drop editing with a deterministic schedule generator. Course data is sourced from official CUSIS exports (converted to JSON via our tooling) and can be synced into MongoDB when needed.

## ✨ Features

### 🎯 Dual Scheduling Modes

- **Manual mode** – Drag sections to lay out the timetable manually.
- **Auto mode** – Algorithmic generator (no AI) that enumerates valid section combinations and scores them against your preferences.

### 📅 Visual Timetable

- Clean, intuitive weekly calendar view
- Color-coded courses for easy identification
- Real-time conflict highlighting
- Dark mode support

### 🔍 Smart Course Search

- Search by course code, name, or department
- Filter courses by term (Term 1, Term 2, Whole Year)
- Department-based browsing
- Instant results as you type

### ⚙️ Backend Snapshot

- Next.js route handlers expose `/api/courses`, `/api/courses/[code]`, `/api/terms`, and `/api/health`.
- MongoDB Atlas is supported but optional; APIs fall back to the converted JSON dataset and, lastly, the static mocks.
- Data sync is currently manual (Excel → JSON → Mongo). Automated scraping is planned for a later phase.

### ⚡ Preference-Aware Generation

- **⚡ Short Breaks** – minimize downtime between classes.
- **☕ Long Breaks** – maximize ≥60‑minute lunch/study gaps.
- **🎯 Consistent** – keep start times aligned throughout the week.
- **🌅 Start Late** – push classes later in the day.
- **🌆 End Early** – finish as early as possible.
- **🗓️ Days Off** – pack sections into fewer days.

### 🛡️ Conflict Detection

- Automatic time conflict detection
- Visual indicators for overlapping classes
- Real-time validation when adding courses
- Clear error messages and suggestions

### 📊 Schedule Management

- Browse multiple generated schedules with navigation arrows
- Compare different schedule combinations
- One-click schedule clearing with confirmation
- Persistent schedule state

### 🎨 Modern UI/UX

- CUHK-themed purple branding
- Glass-morphism effects and smooth animations
- Responsive design for desktop and mobile
- Hover tooltips for feature explanations
- Gradient backgrounds and modern styling

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Aplkalex/cuhk-scheduler.git
cd cuhk-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional for MongoDB):
```bash
cp .env.local.example .env.local
# Edit .env.local with your MongoDB URI
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/                    # API routes (future backend)
│   ├── page.tsx                # Main scheduler page
│   ├── layout.tsx              # Root layout with theme provider
│   └── globals.css             # Global styles
├── components/
│   ├── CourseList.tsx          # Course search and selection
│   ├── ModeToggle.tsx          # Manual/Auto mode switcher
│   ├── Timetable.tsx           # Visual weekly schedule
│   └── ui/                     # Reusable UI components
├── lib/
│   ├── schedule-generator.ts   # Core scheduling algorithm
│   ├── schedule-utils.ts       # Utility functions
│   ├── time-utils.ts           # Time conversion helpers
│   └── __tests__/              # Jest unit tests
└── data/
    ├── mock-courses.ts         # Sample CUHK course data (main manual dataset)
    └── test-courses.ts         # Smaller fixtures for tests / demo mode
```

## 🛠️ Tech Stack

### Core Framework
- **Next.js 16.0.1** - React framework with Turbopack
- **React 19.2.0** - UI library
- **TypeScript 5** - Type safety

### Styling
- **Tailwind CSS 4.0** - Utility-first CSS framework
- **next-themes 0.4.6** - Dark mode support
- **Lucide React 0.552** - Icon library

### Functionality
- **@dnd-kit** - Drag and drop functionality
- **MongoDB 6.20** - Database (optional)

### Development & Testing
- **Jest 30.2** - Testing framework
- **Testing Library** - React component testing
- **ESLint** - Code linting
- **TypeScript** - Static type checking

## 📊 Algorithm Details

### Schedule Generation

The auto-generate mode uses a sophisticated algorithm to create valid schedules:

1. **Cartesian Product Generation**: Creates all possible combinations of course sections
2. **Conflict Detection**: Filters out schedules with time conflicts
3. **Preference Scoring**: Ranks schedules based on selected optimization preference
4. **Color Assignment**: Assigns unique colors per course for visual clarity

### Optimization Algorithms

Each preference uses a specific scoring function:
- **Short Breaks**: Minimizes total gap minutes between classes
- **Long Breaks**: Counts breaks ≥60 minutes
- **Consistent Start**: Minimizes variance in daily start times
- **Start Late**: Maximizes average start time
- **End Early**: Minimizes average end time
- **Days Off**: Maximizes free weekdays

## 🔍 Course Data Sync

CUHK does not expose a public API, so we currently run a “manual sync” pipeline:

1. Obtain the official CUSIS Excel dump.
2. Convert it to our `Course[]` JSON schema:
   ```bash
   npm run convert:excel -- --input "CUHK CUSIS Course offering (Nov 12).xlsx" --term 2025-26-T2 --output data/courses-2025-26-T2.json
   ```
3. (Optional) Import into MongoDB:
   ```bash
   npm run import:courses -- data/courses-2025-26-T2.json
   ```
4. Restart the dev server. `/api/courses` will read from Mongo if available, otherwise it falls back to the generated JSON and finally to `mockCourses`.

Helpful extras:
- For tiny fixtures, edit `src/data/mock-courses.ts` / `src/data/test-courses.ts`.
- Set `GENERATED_COURSES_PATH` if your JSON lives elsewhere.
- Full instructions live in [docs/manual-data-entry.md](docs/manual-data-entry.md).
- ⚠️ **Disclaimer:** Data may lag behind CUSIS. Always confirm in CUSIS before enrolling.

Future plans include reviving the scraper and/or letting contributors upload JSON/CSV, but the manual workflow keeps the project moving today.

## ⚙️ Backend & Deployment Plan

| Layer | Current status | Next step |
| --- | --- | --- |
| Frontend | Next.js 16 + Tailwind, runs locally (Vercel-ready). | Deploy to Vercel with envs + preview builds. |
| API | Next.js route handlers in the same repo. | Graduate to dedicated Node/Express service if needed. |
| Database | MongoDB Atlas (optional), Prisma client. | Harden schema, add migrations/seed routines. |
| Data sync | Manual Excel → JSON → Mongo pipeline. | Reintroduce scraper or contributor upload portal. |
| Automation | Manual CLI commands. | GitHub Actions cron to refresh datasets. |

Recommended hosting combo: Vercel for the UI, Vercel/Render/Railway for APIs, MongoDB Atlas for data, and GitHub Actions for background jobs once automation lands.

## 💡 Core Functions (MVP)

- Search by course code, name, or instructor.
- Add/remove courses and drag them around the timetable.
- Detect conflicts instantly with clear visual cues.
- Apply preference filters (short breaks, days off, start late, end early, etc.).
- Refresh datasets through the Excel → JSON pipeline.
- (Roadmap) export timetables (PNG/ICS) and save multiple personal plans.

## ✅ Testing

The project includes comprehensive unit tests for the core scheduling algorithm:
- ✅ Schedule generation with multiple courses
- ✅ Conflict detection accuracy
- ✅ Preference scoring functions
- ✅ Edge cases (no valid schedules, single course, etc.)

Run `npm test` to see all 14 passing tests.

## 🚧 Roadmap

- [ ] Automated CUHK data sync (scraper or contributor uploads)
- [ ] User accounts to save/shared schedules
- [ ] Timetable export (PNG/ICS) + Google Calendar push
- [ ] Mobile-first/Draggable UX polish
- [ ] Crowdsourced course notes/ratings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by [UBC Course Scheduler](https://courses.students.ubc.ca/)
- Built for CUHK students, by CUHK students
- Special thanks to the CUHK community for feedback and testing

## 📧 Contact

For questions, suggestions, or bug reports, please open an issue on GitHub.

---

Made with 💜 at CUHK
