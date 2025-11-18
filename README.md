# Queuesis — CUHK Timetable Planner

<div align="center">

**A modern course-queueing experience built to fix everything CUSIS didn’t.**

![Release Date](https://img.shields.io/badge/Release%20Date-Nov%2015%202025-ebf2fa?style=for-the-badge)
![License](https://img.shields.io/badge/License-AGPL%20v3-427aa1?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-a5be00?style=for-the-badge)


![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%204-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

<!-- [Get started](https://queuesis.vercel.app) • [Report Bug](https://github.com/Aplkalex/cuhk-scheduler/issues) • [Request Feature](https://github.com/Aplkalex/cuhk-scheduler/issues) -->

</div>

<br/>

<a href="https://queuesis.vercel.app">
  <img src="https://img.shields.io/badge/🚀_Launch_App-6B46C1?style=for-the-badge&logoColor=white" alt="Launch App" height="50"/>
</a>
&nbsp;&nbsp;
<a href="#-getting-started">
  <img src="https://img.shields.io/badge/📖_Get_Started-4C1D95?style=for-the-badge&logoColor=white" alt="Get Started" height="50"/>
</a>
&nbsp;&nbsp;
<a href="https://github.com/Aplkalex/cuhk-scheduler/issues">
  <img src="https://img.shields.io/badge/💡_Request_Feature-7C3AED?style=for-the-badge&logoColor=white" alt="Request Feature" height="50"/>
</a>

<br/><br/>

</div>

## 📸 Screenshots

<div align="center">

### Main Timetable Interface (Dark mode)
<img width="3020" height="1712" alt="SCR-20251117-cvrt-modified (1)" src="https://github.com/user-attachments/assets/fd5a2e18-1637-42a4-a5ce-e3ebab5d3996" />

### Main Timetable Interface (Light mode)
<img width="3024" height="1714" alt="SCR-20251117-cwbe-modified" src="https://github.com/user-attachments/assets/d81da19c-f2b2-4ee7-ab44-a1e334e97f21" />

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#️-configuration)
- [Data Management](#-data-management)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#️-troubleshooting)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [Team](#-team)
- [Acknowledgments](#-acknowledgments)
- [License](#-license)

---

## 🎯 Overview

Queuesis is a CUHK-focused timetable planner that combines intuitive drag-and-drop editing with a powerful deterministic schedule generator. Course data is sourced from CUSIS and can optionally be synced to MongoDB Atlas via Prisma for enhanced performance.

> 📅 Current Term Support: This version currently supports 2025-2026 Term 2 course data. Support for additional terms will be added in future updates.

### Why Queuesis?

- **Smart Scheduling**: Deterministic algorithm with 6 preference modes
- **Real-time Validation**: Instant conflict detection as you build your schedule
- **Flexible Data**: Works with or without a database connection
- **Modern Stack**: Built with Next.js 16, React 19, and TypeScript

---

## ✨ Key Features

### 📅 Intelligent Scheduling

Choose from multiple optimization preferences:

- **⚡ Short Breaks** — Minimize downtime between classes
- **☕ Long Breaks** — Maximize lunch/study gaps (≥60 minutes)
- **🎯 Consistent Times** — Align start times throughout the week
- **🌅 Start Late** — Push classes later in the day
- **🌆 End Early** — Finish your day as early as possible
- **🗓️ Days Off** — Pack sections into fewer days for free weekdays

### 🛡️ Smart Conflict Detection

- Automatic time overlap detection
- Visual conflict indicators
- Real-time validation when adding courses
- Clear error messages with helpful suggestions

### 🎨 Modern User Experience

- Clean, CUHK-themed purple interface
- Responsive design for desktop and mobile
- Dark mode support
- Smooth animations and glass morphism effects
- Intuitive drag-and-drop interface

### 🔍 Advanced Search & Filtering

- Search by course code, name, or instructor
- Filter by term and department
- Browse multiple generated schedules
- One-click schedule clearing

### 🔒 Lock & Constraints

- Lock any section (LEC/TUT/LAB) to freeze it on the timetable; locked blocks
  - show a small lock icon next to the section label,
  - are grey‑tinted with a white border,
  - cannot be dragged, swapped, or removed.
- Lock All / Unlock All for a course in “My Schedule” (locks both Lecture and its dependent Tutorial/Lab).
- Auto‑Generate respects locks as hard constraints:
  - The generator automatically includes locked courses even if not selected in chips,
  - and only considers the locked section ids for those courses.
  - Day‑Off and other preferences still apply to unlocked courses around your locks.

---
<br/>

## 🚀 Getting Started

<div align="center">

### Choose Your Path

<table>
<tr>
<td align="center" width="50%">

### 🌐 Use Online
**Just want to plan your schedule?**

<a href="https://queuesis.vercel.app">
  <img src="https://img.shields.io/badge/Open_Queuesis-6B46C1?style=for-the-badge&logoColor=white" alt="Open Queuesis" height="45"/>
</a>

No installation needed!

</td>
<td align="center" width="70%">

### 💻 Run Locally
**Want to develop or customize?**

<a href="#-local-development">
  <img src="https://img.shields.io/badge/Setup_Guide-4C1D95?style=for-the-badge&logoColor=white" alt="Setup Guide" height="45"/>
</a>

Follow our quick [setup guide](#-getting-started) below
</td>
</tr>
</table>

</div>

## 🚀 Technology Stack

<div align="center">

<table>
<tr>
<td align="center" valign="top" width="50%">

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Theme**: next-themes
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit
- **Deployment**: Vercel

</td>
<td align="center" valign="top" width="50%">

### Backend & Data
- **Runtime**: Node.js (Vercel)
- **API**: Next.js Route Handlers
- **Database**: MongoDB Atlas
- **ORM**: Prisma 6
- **Data Processing**: xlsx
- **Testing**: Jest 30.x
- **Linting**: ESLint 9.x

</td>
</tr>
</table>

</div>

### Architecture Highlights

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────┐
│  Next.js (Vercel)           │
│  ┌─────────────────────┐    │
│  │  React UI (Client)  │    │
│  └──────────┬──────────┘    │
│             │               │
│  ┌──────────▼──────────┐    │
│  │  API Routes (Server)│    │
│  │  - /api/health      │    │
│  │  - /api/terms       │    │
│  │  - /api/courses     │    │
│  └──────────┬──────────┘    │
└─────────────┼───────────────┘
              │ Prisma
              ▼
     ┌────────────────┐
     │ MongoDB Atlas  │
     │   (Optional)   │
     └────────────────┘
              │
     Fallback: JSON/Mock
```

---

## 📂 Project Structure

```
cuhk-scheduler/
├── 📄 Core Files
│   ├── README.md
│   ├── LICENSE (AGPL v3)
│   ├── package.json
│   └── tsconfig.json
│
├── 📚 Documentation
│   └── docs/
│       ├── API.md                    # API endpoint documentation
│       └── manual-data-entry.md      # Data management guide
│
├── 🗄️ Database
│   └── prisma/
│       ├── schema.prisma             # MongoDB models
│       └── seed.ts                   # Database seeding script
│
├── 🛠️ Scripts
│   └── scripts/
│       ├── convert-excel.ts          # Excel → JSON converter
│       └── import-json.ts            # JSON → MongoDB importer
│
├── 💾 Data
│   └── data/
│       └── courses-2025-26-T2.json   # Fallback course dataset
│
└── 💻 Source Code
    └── src/
        ├── app/                      # Next.js App Router
        │   ├── page.tsx              # Main timetable page
        │   ├── layout.tsx            # Root layout with theme
        │   ├── globals.css           # Global styles
        │   └── api/                  # API Routes
        │       ├── health/           # Health check endpoint
        │       ├── terms/            # Terms listing
        │       └── courses/          # Course data endpoints
        │
        ├── components/               # React UI Components
        │   ├── TimetableGrid.tsx     # Main timetable display
        │   ├── CourseCard.tsx        # Course selection cards
        │   ├── SearchBar.tsx         # Course search interface
        │   ├── ConflictToast.tsx     # Conflict notifications
        │   └── ThemeToggle.tsx       # Dark mode toggle
        │
        ├── lib/                      # Core Logic
        │   ├── schedule-generator.ts # Algorithm engine
        │   ├── schedule-utils.ts     # Conflict detection
        │   ├── db.ts                 # Prisma client
        │   └── __tests__/            # Unit tests
        │
        ├── data/                     # Static Data
        │   ├── generated-courses.ts  # Generated JSON loader
        │   └── mock-courses.ts       # Development mocks
        │
        └── types/                    # TypeScript Definitions
            └── index.ts              # Shared type definitions
```

---

## 🏁 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- MongoDB Atlas account (optional)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Aplkalex/Queuesis.git
cd Queuesis
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration (see [Configuration](#-configuration) below).

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration

Create a `.env.local` file with the following variables:

```env
# MongoDB Connection (optional)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/queuesis

# Fallback Data Settings
ALLOW_FALLBACK_DATA=true

# Custom JSON Data Path (optional)
GENERATED_COURSES_PATH=data/<name>

# UI Feature Flags (safe to expose)
# Show the "Test Mode" toggle/banner in the UI (useful for local dev/QA).
NEXT_PUBLIC_ENABLE_TEST_MODE=false
```

### Environment Variable Details

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | No | MongoDB Atlas connection string. If not provided, app uses JSON/mock data |
| `ALLOW_FALLBACK_DATA` | No | Set to `false` to enforce database-only mode (default: `true`) |
| `GENERATED_COURSES_PATH` | No | Path to custom course JSON file |
| `NEXT_PUBLIC_ENABLE_TEST_MODE` | No | When `true`, shows the Test Mode toggle and banner in the UI |

---

## 📊 Data Management

### Data Source Hierarchy

The app follows this priority order for retrieving course data:

```
1️⃣ MongoDB Atlas (if MONGODB_URI configured)
        ↓ (if unavailable)
2️⃣ Generated JSON (from GENERATED_COURSES_PATH)
        ↓ (if unavailable)
3️⃣ Static Mock Data (development fallback)
```

### Working with Course Data

<details>
<summary><b>📥 Converting Excel to JSON</b></summary>

```bash
npm run convert-excel -- \
  --input "<Your_excel_document>.xlsx" \
  --output data/<name>.json
```

**Options:**
- `--input` - Path to CUSIS Excel export
- `--output` - Destination JSON file
- `--sheet` - Specific worksheet name (if needed)

</details>

<details>
<summary><b>📤 Importing to MongoDB</b></summary>

```bash
npm run import-json -- --file data/<name>.json
```

**Prerequisites:**
- MongoDB Atlas cluster set up
- `MONGODB_URI` configured in `.env.local`
- Network access configured in Atlas

</details>

<details>
<summary><b>🗂️ Data Model</b></summary>

**Course Schema:**
```typescript
{
  courseCode: string        // Unique identifier (e.g., "CSCI1001")
  courseName: string        // Full course name
  department: string        // Department code
  credits: number          // Credit hours
  description?: string     // Course description
  prerequisites?: string   // Prerequisite requirements
  sections: Section[]      // Array of class sections
  term: string            // Academic term
  career: string          // Program level
  lastUpdated: Date       // Last sync timestamp
}
```

**Indexes:**
- `courseCode` (unique)
- `term` (indexed for fast filtering)
- `department` (indexed for department queries)

</details>

---

## 🔌 API Documentation

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/terms` | GET | List available terms |
| `/api/courses` | GET | List/filter courses |
| `/api/courses/[code]` | GET | Get single course details |

### Query Parameters

**`/api/courses`:**
- `term` — Filter by academic term
- `department` — Filter by department code
- `search` — Search course code/name/instructor
- `testMode` — Use mock data (development only)

Example:
```bash
GET /api/courses?term=2025-26-T2&department=CSCI&search=data
```

For full API documentation, see [`docs/API.md`](docs/API.md).

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

Our test suite includes:

| Category | Coverage | Details |
|----------|----------|---------|
| **Scheduling Algorithm** |  Comprehensive | All preference modes, edge cases |
| **Conflict Detection** |  Comprehensive | Time overlaps, section conflicts |
| **Course Selection** |  Comprehensive | Adding/removing courses |
| **Component Behavior** |  Partial | Critical UI components |
| **API Routes** |  Planned | Endpoint testing |

### Test Files

- `src/lib/__tests__/schedule-generator.test.ts` - Core algorithm
- `src/lib/__tests__/course-selection.test.ts` - Selection logic
- `src/lib/__tests__/competitor-parity.test.ts` - Feature parity

### Adding Tests

When contributing new features:
1. Add unit tests for core logic in `src/lib/__tests__/`
2. Add component tests for UI changes
3. Ensure all existing tests pass
4. Aim for >80% code coverage on new code

---

## 🚢 Deployment

> **Note:** This project is already deployed on Vercel. The following instructions are for reference or if you wish to deploy your own instance.

### Deploy to Vercel (Optional)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aplkalex/cuhk-scheduler)

1. Fork this repository
2. Import your fork into Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Environment Variables (Production)

Set these in **Vercel → Project → Settings → Environment Variables**:

- `MONGODB_URI` — Your MongoDB Atlas connection string
- `ALLOW_FALLBACK_DATA` — Set to `false` after seeding database
- `GENERATED_COURSES_PATH` — (optional) Custom JSON path

### Verification Checklist

After deployment, verify:
- `/api/health` returns healthy status
- `/api/terms` lists available terms
- `/api/courses?term=2025-26-T2` returns course data
- Main page loads without errors

---

## 🛠️ Troubleshooting

### No Data Returned

**Problem:** API endpoints return empty arrays

**Solutions:**
- Verify `MONGODB_URI` is correct and accessible
- Check that `GENERATED_COURSES_PATH` points to an existing JSON file
- Ensure `ALLOW_FALLBACK_DATA=true` during initial setup
- Review Vercel logs for connection errors

### Excel Conversion Errors

**Problem:** `convert-excel.ts` fails or produces invalid JSON

**Solutions:**
- Verify Excel file format matches expected CUSIS export structure
- Use `--sheet` flag to specify correct worksheet name
- Check that all required columns are present
- See `scripts/convert-excel.ts` for column mapping details

### Prisma/MongoDB Issues on Vercel

**Problem:** Database connections fail in production

**Solutions:**
- Confirm environment variables are set in correct Vercel environment
- Check MongoDB Atlas IP allowlist includes `0.0.0.0/0` for serverless
- Verify database user has `readWrite` permissions
- Review Vercel function logs for detailed error messages

### Security Concerns

**Problem:** Connection string exposed or compromised

**Actions:**
1. Rotate MongoDB credentials immediately in Atlas
2. Update `MONGODB_URI` in Vercel environment variables
3. Review access logs in MongoDB Atlas
4. Ensure `.env.local` is in `.gitignore`

---

## 🗺️ Roadmap

- [ ] **Export Features**
  - Export timetable as PNG/PDF
  - Generate ICS calendar files
  - Google Calendar integration

- [ ] **Data Automation**
  - GitHub Actions for scheduled data updates
  - Automated Excel → JSON → MongoDB pipeline
  - Term detection and validation

- [ ] **Performance Improvements**
  - Database-backed text search with indexes
  - Server-side pagination for large course lists
  - API response caching

- [ ] **User Experience**
  - Mobile drag-and-drop enhancements
  - Keyboard navigation and ARIA improvements
  - Interactive onboarding tutorial

- [ ] **Intelligence Features**
  - ML-based schedule recommendations
  - Optimal path planning for degree requirements

- [ ] **User Accounts & Persistence**
  - Share schedules via unique URLs
  - Schedule history and versioning

- [ ] **Advanced Search**
  - Filter by instructor
  - Filter by building/room
  - Filter by time preferences

- [ ] **Mobile App**
  - Native iOS/Android apps
  - Push notifications for course changes
  - Offline mode support

### 💡 Community Suggestions

Have an idea? [Open an issue](https://github.com/Aplkalex/cuhk-scheduler/issues) with the `enhancement` label!

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Quick Start

1. **Fork** the repository
2. **Clone** your fork
   ```bash
   git clone https://github.com/YOUR_USERNAME/cuhk-scheduler.git
   cd cuhk-scheduler
   ```
3. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make** your changes and test thoroughly
5. **Commit** your changes
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push** to your branch
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open** a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Keep commits atomic and well-described
- Ensure all tests pass before submitting PR

### Areas We Need Help With

- 🐛 Bug fixes and issue resolution
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Test coverage expansion
- 🌐 Internationalization support

---

## 👥 Team

**Lead/Maintainer:** [Aplkalex](https://github.com/Aplkalex)

**Contributors:** Open to community contributions! See [Contributing](#-contributing) section.

---

## 🙏 Acknowledgments

- Built for CUHK students, by CUHK students
- Inspired by university scheduling tools worldwide, particularly [UBC Scheduler](https://ubcscheduler.ca/)
- Special thanks to all contributors and testers

---

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

**What this means:**
-  You can use, modify, and distribute this software
-  You can use it commercially
-  If you modify and host it as a web service, you MUST share your source code
-  All derivative works must also be open source under AGPL-3.0

See the [LICENSE](LICENSE) file for full details.

---

<div align="center">

**Made with 💜 for CUHK**

[⬆ Back to Top](#queuesis--cuhk-timetable-planner)

</div>
