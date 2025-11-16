# Queuesis — CUHK Timetable Planner

<div align="center">

**A modern, intelligent timetable planner built for CUHK students**

![Release Date](https://img.shields.io/badge/Release%20Date-Nov%2015%202025-ebf2fa?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-427aa1?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-a5be00?style=for-the-badge)

[Live Demo](https://queuesis.vercel.app) • [Report Bug](https://github.com/Aplkalex/cuhk-scheduler/issues) • [Request Feature](https://github.com/Aplkalex/cuhk-scheduler/issues)

</div>

---

## 🎯 Overview

Queuesis is a CUHK-focused timetable planner that combines intuitive drag-and-drop editing with a powerful deterministic schedule generator. Course data is sourced from official CUSIS Excel exports and can optionally be synced to MongoDB Atlas via Prisma for enhanced performance.

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

---

## 🚀 Technology Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4, next-themes, Lucide React |
| **Database** | Prisma 6, MongoDB Atlas (optional) |
| **Interactions** | @dnd-kit (drag & drop) |
| **Testing** | Jest 30.x, React Testing Library |
| **Tooling** | xlsx, ts-node, ESLint 9.x |

---

## 📂 Project Structure

```
queuesis/
├── src/
│   ├── app/
│   │   ├── api/              # Next.js API routes
│   │   ├── page.tsx          # Main timetable page
│   │   ├── layout.tsx        # Root layout with theme
│   │   └── globals.css       # Global styles
│   ├── components/           # React UI components
│   ├── lib/                  # Scheduling engine & utilities
│   └── data/                 # Generated JSON & mock data
├── prisma/
│   └── schema.prisma         # MongoDB schema
├── scripts/
│   ├── convert-excel.ts      # Excel → JSON converter
│   └── import-json.ts        # JSON → MongoDB importer
├── docs/                     # API documentation
└── __tests__/                # Test suites
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
git clone https://github.com/Aplkalex/cuhk-scheduler.git
cd cuhk-scheduler
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
# MongoDB Connection (optional - app works without it)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/queuesis

# Fallback Data Settings
ALLOW_FALLBACK_DATA=true

# Custom JSON Data Path (optional)
GENERATED_COURSES_PATH=data/courses-2025-26-T2.json
```

### Environment Variable Details

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | No | MongoDB Atlas connection string. If not provided, app uses JSON/mock data |
| `ALLOW_FALLBACK_DATA` | No | Set to `false` to enforce database-only mode (default: `true`) |
| `GENERATED_COURSES_PATH` | No | Path to custom course JSON file |

---

## 📊 Data Management

### Data Source Hierarchy

The app follows this priority order:

1. **MongoDB Atlas** (if `MONGODB_URI` is configured)
2. **Generated JSON** (from `GENERATED_COURSES_PATH` or default path)
3. **Static Mock Data** (fallback for development)

### Converting Excel to JSON

```bash
npm run convert-excel -- --input path/to/cusis-export.xlsx --output data/courses-2025-26-T2.json
```

### Importing to MongoDB

```bash
npm run import-json -- --file data/courses-2025-26-T2.json
```

### Data Model

**Course Schema:**
- `courseCode` (unique identifier)
- `courseName`, `department`, `credits`
- `description`, `prerequisites`
- `sections` (array of class sections with timeslots)
- `term`, `career`, `lastUpdated`

**Indexes:**
- `courseCode` (unique)
- `term`, `department` (indexed for fast filtering)

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

Run the test suite:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Test coverage includes:
- ✅ Scheduling algorithm correctness
- ✅ Conflict detection edge cases
- ✅ Component behavior validation
- ✅ API route functionality

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
- ✅ `/api/health` returns healthy status
- ✅ `/api/terms` lists available terms
- ✅ `/api/courses?term=2025-26-T2` returns course data
- ✅ Main page loads without errors

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

### Data Automation
- [ ] GitHub Actions for scheduled Excel → JSON → MongoDB imports
- [ ] Contributor upload portal for course data
- [ ] Automatic term detection and validation

### Product Features
- [ ] User accounts for saving/sharing schedules
- [ ] Export to PNG/ICS/Google Calendar
- [ ] Advanced search by instructor and room
- [ ] Shopping cart for course selection
- [ ] Email notifications for course changes

### Performance
- [ ] Database-backed text search with indexes
- [ ] Server-side pagination
- [ ] CDN caching for static course data
- [ ] Optimistic UI updates

### User Experience
- [ ] Mobile drag-and-drop improvements
- [ ] ARIA/keyboard accessibility enhancements
- [ ] Onboarding tutorial
- [ ] Schedule comparison view

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

---

## 👥 Team

**Maintainer:** [Aplkalex](https://github.com/Aplkalex)

**Contributors:** Open to community contributions! See [Contributing](#-contributing) section.

---

## 🙏 Acknowledgments

- Built for CUHK students, by CUHK students
- Inspired by university scheduling tools worldwide, particularly [UBC Scheduler](https://ubcscheduler.ca/)
- Special thanks to all contributors and testers

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Made with 💜 for CUHK**

[⬆ Back to Top](#queuesis--cuhk-timetable-planner)

</div>