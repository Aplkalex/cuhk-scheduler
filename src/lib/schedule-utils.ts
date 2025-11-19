import { TimeSlot, SelectedCourse, Conflict, DayOfWeek, Course, Section } from '@/types';

export type CourseColorShades = {
  DEFAULT: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export type ColorFamily = CourseColorShades[];

const COLOR_FAMILIES: ColorFamily[] = [
  [
    {
      DEFAULT: '#e2e2df',
      100: '#2f2f2b',
      200: '#5e5e55',
      300: '#8d8d81',
      400: '#b7b7b0',
      500: '#e2e2df',
      600: '#e8e8e5',
      700: '#eeeeec',
      800: '#f3f3f2',
      900: '#f9f9f9',
    },
  ],
  [
    {
      DEFAULT: '#d2d2cf',
      100: '#2b2b29',
      200: '#565651',
      300: '#81817a',
      400: '#aaaaa5',
      500: '#d2d2cf',
      600: '#dbdbd9',
      700: '#e4e4e3',
      800: '#ededec',
      900: '#f6f6f6',
    },
  ],
  [
    {
      DEFAULT: '#e2cfc4',
      100: '#39261c',
      200: '#714d38',
      300: '#aa7354',
      400: '#c6a28c',
      500: '#e2cfc4',
      600: '#e8d9d1',
      700: '#eee3dc',
      800: '#f4ece8',
      900: '#f9f6f3',
    },
  ],
  [
    {
      DEFAULT: '#f7d9c4',
      100: '#4e270b',
      200: '#9c4d15',
      300: '#e27628',
      400: '#eca877',
      500: '#f7d9c4',
      600: '#f9e1d0',
      700: '#fae9dc',
      800: '#fcf0e8',
      900: '#fdf8f3',
    },
  ],
  [
    {
      DEFAULT: '#faedcb',
      100: '#533e08',
      200: '#a57b10',
      300: '#eab227',
      400: '#f2d079',
      500: '#faedcb',
      600: '#fbf1d6',
      700: '#fcf4e0',
      800: '#fdf8eb',
      900: '#fefbf5',
    },
  ],
  [
    {
      DEFAULT: '#c9e4de',
      100: '#1d3933',
      200: '#397266',
      300: '#57aa98',
      400: '#90c7bb',
      500: '#c9e4de',
      600: '#d4e9e4',
      700: '#deefeb',
      800: '#e9f4f2',
      900: '#f4faf8',
    },
  ],
  [
    {
      DEFAULT: '#c6def1',
      100: '#112f47',
      200: '#225d8d',
      300: '#388bcf',
      400: '#7fb4e0',
      500: '#c6def1',
      600: '#d1e4f4',
      700: '#ddebf7',
      800: '#e8f2f9',
      900: '#f4f8fc',
    },
  ],
  [
    {
      DEFAULT: '#dbcdf0',
      100: '#281444',
      200: '#4f2989',
      300: '#7843c7',
      400: '#a988db',
      500: '#dbcdf0',
      600: '#e2d6f3',
      700: '#e9e0f6',
      800: '#f0ebf9',
      900: '#f8f5fc',
    },
  ],
  [
    {
      DEFAULT: '#f2c6de',
      100: '#47102f',
      200: '#8f205d',
      300: '#d1368b',
      400: '#e27db4',
      500: '#f2c6de',
      600: '#f4d0e4',
      700: '#f7dceb',
      800: '#fae8f2',
      900: '#fcf3f8',
    },
  ],
  [
    {
      DEFAULT: '#f9c6c9',
      100: '#51090d',
      200: '#a2111b',
      300: '#e82532',
      400: '#f1767f',
      500: '#f9c6c9',
      600: '#fad3d5',
      700: '#fcdee0',
      800: '#fde9ea',
      900: '#fef4f5',
    },
  ],
];

export const COURSE_COLOR_POOL = COLOR_FAMILIES.flatMap((family) =>
  family.map((palette) => palette.DEFAULT)
);

const DEFAULT_TO_PALETTE = (() => {
  const map = new Map<string, CourseColorShades>();
  COLOR_FAMILIES.flat().forEach((palette) => {
    map.set(palette.DEFAULT.toLowerCase(), palette);
    map.set(palette[100].toLowerCase(), palette);
  });
  return map;
})();

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if two time slots overlap
 */
export function timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  // Must be on the same day
  if (slot1.day !== slot2.day) {
    console.log('      Different days:', slot1.day, 'vs', slot2.day);
    return false;
  }

  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  console.log('      Same day:', slot1.day);
  console.log('      Slot1:', slot1.startTime, '-', slot1.endTime, '=', start1, '-', end1);
  console.log('      Slot2:', slot2.startTime, '-', slot2.endTime, '=', start2, '-', end2);
  console.log('      Overlap check: start1 < end2 && start2 < end1 =', start1, '<', end2, '&&', start2, '<', end1, '=', start1 < end2 && start2 < end1);

  // Check for overlap
  return start1 < end2 && start2 < end1;
}

/**
 * Detect conflicts between selected courses
 */
export function detectConflicts(courses: SelectedCourse[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const course1 = courses[i];
      const course2 = courses[j];

      if (course1.course.courseCode === course2.course.courseCode) {
        continue;
      }

      const conflictingSlots: { slot1: TimeSlot; slot2: TimeSlot }[] = [];

      // Check each time slot combination
      for (const slot1 of course1.selectedSection.timeSlots) {
        for (const slot2 of course2.selectedSection.timeSlots) {
          if (timeSlotsOverlap(slot1, slot2)) {
            conflictingSlots.push({ slot1, slot2 });
          }
        }
      }

      if (conflictingSlots.length > 0) {
        conflicts.push({
          course1,
          course2,
          conflictingTimeSlots: conflictingSlots,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Calculate duration of a time slot in minutes
 */
export function getSlotDuration(slot: TimeSlot): number {
  return timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
}

/**
 * Get all unique days from selected courses
 */
export function getScheduleDays(courses: SelectedCourse[]): DayOfWeek[] {
  const daysSet = new Set<DayOfWeek>();
  
  courses.forEach(course => {
    course.selectedSection.timeSlots.forEach(slot => {
      daysSet.add(slot.day);
    });
  });

  const dayOrder: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return dayOrder.filter(day => daysSet.has(day));
}

/**
 * Format time slot for display
 */
export function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.day.slice(0, 3)} ${formatTime(slot.startTime)}-${formatTime(slot.endTime)}`;
}

/**
 * Format time from 24h to 12h format
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}

/**
 * Generate a unique color for course visualization
 * Uses courseCode hash to ensure consistent unique colors
 */
export function generateCourseColor(courseCode: string, usedColors: string[], options?: { theme?: 'light' | 'dark' }): string {
  const familyOptions = COLOR_FAMILIES
    .map((family) => family.map((palette) => palette.DEFAULT).filter((color) => !usedColors.includes(color)))
    .filter((available) => available.length > 0);

  if (familyOptions.length > 0) {
    const familyIndex = Math.floor(Math.random() * familyOptions.length);
    const family = familyOptions[familyIndex];
    const colorIndex = Math.floor(Math.random() * family.length);
    return family[colorIndex];
  }

  const remainingColors = COURSE_COLOR_POOL.filter((color) => !usedColors.includes(color));
  if (remainingColors.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingColors.length);
    return remainingColors[randomIndex];
  }

  // If all colors used, generate hash-based color
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COURSE_COLOR_POOL[Math.abs(hash) % COURSE_COLOR_POOL.length];
}

/**
 * Given a stored course color, map it to the appropriate shade for the current theme.
 */
export function adjustCourseColorForTheme(color: string | undefined, theme: 'light' | 'dark'): string {
  if (!color) return color ?? '#8B5CF6';
  if (theme === 'dark') return color;
  const palette = DEFAULT_TO_PALETTE.get(color.toLowerCase());
  if (!palette) return color;
  return palette[100] ?? palette.DEFAULT;
}

/**
 * Check if a course has available seats
 */
type SeatAwareSection = {
  quota?: number | null;
  enrolled?: number | null;
  seatsRemaining?: number | null;
};

export function hasAvailableSeats(section: SeatAwareSection): boolean {
  if (typeof section.seatsRemaining === 'number') {
    return section.seatsRemaining > 0;
  }

  if (typeof section.quota === 'number' && typeof section.enrolled === 'number') {
    return section.enrolled < section.quota;
  }

  return true;
}

/**
 * Calculate total credits for selected courses
 */
export function calculateTotalCredits(courses: SelectedCourse[]): number {
  const seen = new Set<string>();

  return courses.reduce((total, selected) => {
    const code = selected.course.courseCode;
    if (seen.has(code)) {
      return total;
    }
    seen.add(code);
    return total + (selected.course.credits ?? 0);
  }, 0);
}

/**
 * Count distinct courses in the current selection (ignores tutorial/lab sections).
 */
export function countUniqueCourses(courses: SelectedCourse[]): number {
  const seen = new Set<string>();
  courses.forEach(({ course }) => {
    seen.add(course.courseCode);
  });
  return seen.size;
}

/**
 * Detect conflicts when adding a new course
 * Returns array of conflicting course codes
 */
export function detectNewCourseConflicts(
  newCourse: SelectedCourse,
  existingCourses: SelectedCourse[]
): string[] {
  const conflicts: string[] = [];

  for (const existingCourse of existingCourses) {
    if (existingCourse.course.courseCode === newCourse.course.courseCode) {
      continue;
    }
    
    // Check if any time slots overlap
    for (const newSlot of newCourse.selectedSection.timeSlots) {
      for (const existingSlot of existingCourse.selectedSection.timeSlots) {
        const overlaps = timeSlotsOverlap(newSlot, existingSlot);
        if (overlaps) {
          conflicts.push(existingCourse.course.courseCode);
          break; // Only add each course once
        }
      }
      if (conflicts.includes(existingCourse.course.courseCode)) break;
    }
  }
  return conflicts;
}

const DEPENDENT_SECTION_TYPES = new Set<Section['sectionType']>(['Tutorial', 'Lab']);

const isDependentSectionType = (type: Section['sectionType']) =>
  DEPENDENT_SECTION_TYPES.has(type);

/**
 * Determine which lecture is effectively active for a course based on current selections.
 * Falls back to the parent lecture of any selected tutorial/lab if the lecture itself
 * hasn't been explicitly added yet.
 */
export function getActiveLectureId(
  selectedCourses: SelectedCourse[],
  course: Course
): string | null {
  const directLecture = selectedCourses.find(
    (sc) =>
      sc.course.courseCode === course.courseCode &&
      sc.selectedSection.sectionType === 'Lecture'
  );

  if (directLecture) {
    return directLecture.selectedSection.sectionId;
  }

  const dependentSection = selectedCourses.find(
    (sc) =>
      sc.course.courseCode === course.courseCode &&
      isDependentSectionType(sc.selectedSection.sectionType) &&
      sc.selectedSection.parentLecture
  );

  if (!dependentSection?.selectedSection.parentLecture) {
    return null;
  }

  const parentLectureId = dependentSection.selectedSection.parentLecture;
  const lectureExists = course.sections.some(
    (section) =>
      section.sectionType === 'Lecture' && section.sectionId === parentLectureId
  );

  return lectureExists ? parentLectureId : null;
}

/**
 * Remove sections (lectures/tutorials/labs) that don't belong to the supplied lecture.
 * Useful when switching lectures to ensure dependent sections stay in sync.
 */
export function removeDependentSectionsForLecture(
  selectedCourses: SelectedCourse[],
  courseCode: string,
  lectureId: string
): SelectedCourse[] {
  return selectedCourses.filter((sc) => {
    if (sc.course.courseCode !== courseCode) {
      return true;
    }

    const { selectedSection } = sc;

    if (selectedSection.sectionType === 'Lecture') {
      return selectedSection.sectionId === lectureId;
    }

    if (isDependentSectionType(selectedSection.sectionType)) {
      return selectedSection.parentLecture === lectureId;
    }

    return true;
  });
}

/**
 * Remove a lecture and all of its dependent sections from the current selection.
 */
export function removeLectureAndDependents(
  selectedCourses: SelectedCourse[],
  courseCode: string,
  lectureId: string
): SelectedCourse[] {
  return selectedCourses.filter((sc) => {
    if (sc.course.courseCode !== courseCode) {
      return true;
    }

    const { selectedSection } = sc;

    if (selectedSection.sectionType === 'Lecture') {
      return selectedSection.sectionId !== lectureId;
    }

    if (isDependentSectionType(selectedSection.sectionType)) {
      if (!selectedSection.parentLecture) {
        return false;
      }
      return selectedSection.parentLecture !== lectureId;
    }

    return true;
  });
}
