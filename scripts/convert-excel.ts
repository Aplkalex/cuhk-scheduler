import fs from 'node:fs/promises';
import path from 'node:path';
import xlsx from 'xlsx';
import type { Course, DayOfWeek, Section, TermType, TimeSlot } from '@/types';

type RawCell = string | number | boolean | Date | null;
type RawRow = RawCell[];

interface CliOptions {
  input: string;
  output: string;
  term: TermType | string;
  career: Course['career'];
  sheet?: string;
  limit?: number;
}

interface ParsedCode {
  base: string;
  suffix?: string;
}

interface InterimSection extends Section {
  slotKeys: Set<string>;
  instructorNames: string[];
}

interface InterimCourse {
  course: Course;
}

const COURSE_CODE_REGEX = /^([A-Z]{4}\d{4})([A-Z0-9-]*)$/;
const DAY_MAP: Record<string, DayOfWeek> = {
  Mo: 'Monday',
  Tu: 'Tuesday',
  We: 'Wednesday',
  Th: 'Thursday',
  Fr: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};
const SECTION_CODE_COLUMN = 8;

const COMPONENT_MAP: Record<string, Section['sectionType']> = {
  LEC: 'Lecture',
  TUT: 'Tutorial',
  LAB: 'Lab',
  SEM: 'Seminar',
  DIS: 'Tutorial',
  PRA: 'Lab',
  PRJ: 'Seminar',
  FLD: 'Lab',
  IND: 'Seminar',
  ASB: 'Seminar',
  CLW: 'Lab',
  EXR: 'Tutorial',
  OTH: 'Seminar',
  STD: 'Seminar',
  TMC: 'Tutorial',
  VST: 'Seminar',
  WBL: 'Seminar',
  WKS: 'Lab',
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    switch (key) {
      case 'input':
        options.input = value;
        i++;
        break;
      case 'output':
        options.output = value;
        i++;
        break;
      case 'term':
        options.term = value as TermType;
        i++;
        break;
      case 'career':
        options.career = (value as Course['career']) ?? 'Undergraduate';
        i++;
        break;
      case 'sheet':
        options.sheet = value;
        i++;
        break;
      case 'limit':
        options.limit = Number(value);
        i++;
        break;
      default:
        break;
    }
  }

  if (!options.input || !options.term) {
    console.error('Usage: npm run convert:excel -- --input <file.xlsx> --term <term-id> [--output data/courses.json]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(process.cwd(), options.input);
  const resolvedOutput =
    options.output ?? path.resolve(process.cwd(), `data/courses-${options.term}.json`);

  return {
    input: resolvedInput,
    output: resolvedOutput,
    term: options.term,
    career: options.career ?? 'Undergraduate',
    sheet: options.sheet,
    limit: options.limit && Number.isFinite(options.limit) ? options.limit : undefined,
  };
};

const parseCourseCode = (value: RawCell): ParsedCode | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(COURSE_CODE_REGEX);
  if (!match) return null;
  const base = match[1];
  const suffix = match[2]?.replace(/^-/, '');
  return { base, suffix: suffix || undefined };
};

const parseNumber = (value: RawCell): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return undefined;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
};

const cleanString = (value: RawCell | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\u00a0/g, ' ').trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeInstructor = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.replace(/^-+\s*/, '').replace(/\s+/g, ' ').trim();
};

const normalizeSectionCode = (section: string | undefined, fallback?: string): string => {
  const source = section && section !== 'Section Code' ? section : fallback;
  if (!source) return 'A';
  const cleaned = source.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned.length ? cleaned : 'A';
};

const mapLanguage = (value: string | undefined): string | undefined => {
  if (!value || value === 'Language') return undefined;
  return value.replace(/\u00a0/g, ' ').trim();
};

const mapSectionType = (value: string | undefined): Section['sectionType'] | undefined => {
  if (!value) return undefined;
  return COMPONENT_MAP[value as keyof typeof COMPONENT_MAP];
};

const parsePeriod = (value: string | undefined): Omit<TimeSlot, 'location'> | null => {
  if (!value) return null;
  const normalized = value.replace(/\u00a0/g, ' ').trim();
  const match = normalized.match(/^([A-Za-z]{2})\s+(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)$/);
  if (!match) return null;
  const day = DAY_MAP[match[1] as keyof typeof DAY_MAP];
  if (!day) return null;
  return {
    day,
    startTime: to24Hour(match[2]),
    endTime: to24Hour(match[3]),
  };
};

const to24Hour = (value: string): string => {
  const match = value.match(/(\d{1,2}):(\d{2})([AP]M)/);
  if (!match) return value;
  let hour = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3];

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};

const isHeaderSentinel = (value: string | undefined): boolean => {
  if (!value) return false;
  const stripped = value.replace(/\u00a0/g, ' ').trim();
  return (
    stripped === 'Find |' ||
    stripped.startsWith('|') ||
    stripped.startsWith('1-') ||
    stripped === 'Last' ||
    stripped === 'New Search'
  );
};

const finalizeSection = (course: InterimCourse | null, section: InterimSection | null) => {
  if (!course || !section) return;
  const instructorNames = Array.from(new Set(section.instructorNames));
  const instructor =
    instructorNames.length > 0 ? { name: instructorNames.join(', ') } : section.instructor;
  const { slotKeys: _slotKeys, instructorNames: _names, ...rest } = section;
  course.course.sections.push({
    ...rest,
    instructor,
  });
};

const finalizeCourse = (
  course: InterimCourse | null,
  collection: Course[],
  limit?: number
): InterimCourse | null => {
  if (!course) return null;
  if (limit && collection.length >= limit) {
    return null;
  }
  collection.push(course.course);
  return null;
};

const addTimeSlot = (section: InterimSection | null, period: string | undefined, room: string | undefined) => {
  if (!section) return;
  const slot = parsePeriod(period);
  if (!slot) return;
  const location = room && room !== 'Room' ? room : undefined;
  const key = `${slot.day}|${slot.startTime}|${slot.endTime}|${location ?? ''}`;
  if (section.slotKeys.has(key)) return;
  section.slotKeys.add(key);
  section.timeSlots.push({
    ...slot,
    location,
  });
};

const addInstructor = (section: InterimSection | null, staff: string | undefined) => {
  const name = normalizeInstructor(staff);
  if (!section || !name) return;
  section.instructorNames.push(name);
};

const inferParentLecture = (course: InterimCourse | null, sectionId: string, type: Section['sectionType']) => {
  if (!course || type === 'Lecture') return undefined;
  const letterMatch = sectionId.match(/^([A-Z])/);
  if (!letterMatch) return undefined;
  const candidate = letterMatch[1];
  const lecture = course.course.sections.find(
    (section) => section.sectionType === 'Lecture' && section.sectionId === candidate
  );
  return lecture ? lecture.sectionId : undefined;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workbook = xlsx.readFile(options.input, { cellDates: true });
  const sheetName = options.sheet ?? workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    console.error(`Sheet "${sheetName}" not found in ${options.input}`);
    process.exit(1);
  }

  const rows: RawRow[] = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
  });
  const sectionCodeFormulaByRow = new Map<number, string>();
  const rangeRef = worksheet['!ref'] ?? 'A1';
  const range = xlsx.utils.decode_range(rangeRef);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const cellAddress = xlsx.utils.encode_cell({ r, c: SECTION_CODE_COLUMN });
    const cell = worksheet[cellAddress];
    if (cell?.f) {
      sectionCodeFormulaByRow.set(r, String(cell.f));
    }
  }

  const courses: Course[] = [];
  let awaitingHeader = true;
  let currentCourse: InterimCourse | null = null;
  let currentSection: InterimSection | null = null;
  const flush = () => {
    finalizeSection(currentCourse, currentSection);
    currentCourse = finalizeCourse(currentCourse, courses, options.limit);
    currentSection = null;
  };

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const firstCell = cleanString(row[0]);
    if (firstCell === 'Class Code') {
      flush();
      awaitingHeader = false;
      continue;
    }
    if (awaitingHeader) continue;
    if (isHeaderSentinel(firstCell)) {
      flush();
      awaitingHeader = true;
      continue;
    }

    const parsedCode = parseCourseCode(firstCell ?? null);
    const component = cleanString(row[7]);
    const sectionType = mapSectionType(component);
    const sectionFormula = sectionCodeFormulaByRow.get(rowIndex);
    const sectionCode = cleanString(row[SECTION_CODE_COLUMN]) ?? cleanString(sectionFormula);
    const language = mapLanguage(cleanString(row[9]));
    const period = cleanString(row[10]);
    const room = cleanString(row[11]);
    const staff = cleanString(row[4]);

    const quota = parseNumber(row[5]);
    const vacancy = parseNumber(row[6]);
    const classNumber = parseNumber(row[1]);
    const units = parseNumber(row[3]);
    const department = cleanString(row[15]);

    const isNewSectionRow = Boolean(sectionType && component !== 'Course Component');

      if (parsedCode) {
        const isNewCourse = currentCourse?.course.courseCode !== parsedCode.base;
        if (isNewCourse) {
          finalizeSection(currentCourse, currentSection);
          currentSection = null;
          currentCourse = finalizeCourse(currentCourse, courses, options.limit);
          if (options.limit && courses.length >= options.limit) break;
          currentCourse = {
            course: {
            courseCode: parsedCode.base,
            courseName: cleanString(row[2]) ?? parsedCode.base,
            department: department ?? parsedCode.base.slice(0, 4),
            credits: units ?? 0,
            description: undefined,
            enrollmentRequirements: undefined,
            prerequisites: [],
            sections: [],
            term: options.term as TermType,
            career: options.career,
            lastUpdated: new Date(),
          },
        };
      }
      if (currentCourse && isNewSectionRow) {
        const resolvedType = sectionType as Section['sectionType'];
        finalizeSection(currentCourse, currentSection);
        const normalizedSectionId = normalizeSectionCode(
          sectionCode,
          parsedCode.suffix && parsedCode.suffix !== '-' ? parsedCode.suffix : 'A'
        );
        const parentLecture = inferParentLecture(currentCourse, normalizedSectionId, resolvedType);
        currentSection = {
          sectionId: normalizedSectionId,
          sectionType: resolvedType,
          parentLecture,
          classNumber: classNumber ?? undefined,
          instructor: undefined,
          timeSlots: [],
          quota: quota ?? 0,
          enrolled:
            quota != null && vacancy != null ? Math.max(quota - vacancy, 0) : quota ?? 0,
          seatsRemaining: Math.max(vacancy ?? 0, 0),
          waitlist: undefined,
          language,
          addConsent: cleanString(row[13]) === 'Yes',
          dropConsent: cleanString(row[14]) === 'Yes',
          slotKeys: new Set<string>(),
          instructorNames: [],
        } as InterimSection;
        addInstructor(currentSection, staff);
        continue;
      }
    }

    if (isNewSectionRow && currentCourse) {
      const resolvedType = sectionType as Section['sectionType'];
      finalizeSection(currentCourse, currentSection);
      const normalizedSectionId = normalizeSectionCode(sectionCode);
      const parentLecture = inferParentLecture(currentCourse, normalizedSectionId, resolvedType);
      currentSection = {
        sectionId: normalizedSectionId,
        sectionType: resolvedType,
        parentLecture,
        classNumber: classNumber ?? undefined,
        instructor: undefined,
        timeSlots: [],
        quota: quota ?? 0,
        enrolled:
          quota != null && vacancy != null ? Math.max(quota - vacancy, 0) : quota ?? 0,
        seatsRemaining: Math.max(vacancy ?? 0, 0),
        waitlist: undefined,
        language,
        addConsent: cleanString(row[13]) === 'Yes',
        dropConsent: cleanString(row[14]) === 'Yes',
        slotKeys: new Set<string>(),
        instructorNames: [],
      } as InterimSection;
      addInstructor(currentSection, staff);
      continue;
    }

    if (staff && !parsedCode && !isNewSectionRow) {
      addInstructor(currentSection, staff);
      continue;
    }

    if (period) {
      addTimeSlot(currentSection, period, room);
    }
  }

  flush();

  const sortedCourses = courses.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, JSON.stringify(sortedCourses, null, 2), 'utf-8');

  const sectionCount = sortedCourses.reduce((sum, course) => sum + course.sections.length, 0);
  console.log(
    `✅ Exported ${sortedCourses.length} courses (${sectionCount} sections) to ${options.output}`
  );
}

main().catch((error) => {
  console.error('❌ Failed to convert Excel file:', error);
  process.exit(1);
});
