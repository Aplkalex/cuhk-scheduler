# 🎓 CUHK Course Scheduler

An intelligent course planner for CUHK students to visualize, optimize, and manage their class schedules. Features both manual drag-and-drop scheduling and AI-powered automatic schedule generation with smart conflict detection.

## ✨ Features

### 🎯 Dual Scheduling Modes

- **Manual Mode**: Drag and drop individual sections to build your perfect schedule
- **Auto-Generate Mode**: AI-powered schedule generation with preference optimization

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

### ⚡ Intelligent Schedule Generation

Six optimization preferences to match your lifestyle:
- **⚡ Short Breaks**: Minimize gaps between classes - finish quickly and go home
- **☕ Long Breaks**: Maximize breaks of 60+ minutes - time for lunch and studying
- **🎯 Consistent**: Classes start at similar times each day - predictable routine
- **🌅 Start Late**: Classes begin later in the morning - for night owls
- **🌆 End Early**: Classes finish earlier in the afternoon - free evenings
- **🗓️ Days Off**: Packs classes into fewer days - get full free days

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

## 📊 Data Source

Currently uses manually curated mock course data (see [Manual Data Entry](docs/manual-data-entry.md)). Future versions will integrate with:
- CUHK's course catalog API
- Real-time enrollment data
- Course prerequisite information

⚠️ **Disclaimer**: Always verify course information on CUSIS before enrolling. This tool is for planning purposes only.

## 📝 Manual Data Entry

The former CUSIS scraper has been removed. To update the dataset:
- Edit `src/data/mock-courses.ts` (or `src/data/test-courses.ts`) directly for local/offline data.
- Optionally maintain a JSON export and run `npm run import:courses -- <file>` to seed MongoDB when you want the API to read from the database.

For detailed step-by-step instructions, check `docs/manual-data-entry.md`.

## � Testing

The project includes comprehensive unit tests for the core scheduling algorithm:
- ✅ Schedule generation with multiple courses
- ✅ Conflict detection accuracy
- ✅ Preference scoring functions
- ✅ Edge cases (no valid schedules, single course, etc.)

Run `npm test` to see all 14 passing tests.

## 🚧 Roadmap

- [ ] Integration with CUHK course catalog API
- [ ] Schedule export (iCal, PDF, image)
- [ ] Course prerequisite tracking
- [ ] Multi-user support with saved schedules
- [ ] Mobile app version
- [ ] Email notifications for course changes
- [ ] GPA calculator integration

## �🤝 Contributing

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
