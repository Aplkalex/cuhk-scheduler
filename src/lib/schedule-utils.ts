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
      DEFAULT: '#f94144',
      100: '#3d0203',
      200: '#7b0406',
      300: '#b80609',
      400: '#f5080c',
      500: '#f94144',
      600: '#fa696b',
      700: '#fc8e90',
      800: '#fdb4b5',
      900: '#fed9da',
    },
  ],
  [
    {
      DEFAULT: '#f3722c',
      100: '#361503',
      200: '#6c2a06',
      300: '#a23f09',
      400: '#d8540d',
      500: '#f3722c',
      600: '#f58d55',
      700: '#f8aa80',
      800: '#fac6aa',
      900: '#fde3d5',
    },
  ],
  [
    {
      DEFAULT: '#f8961e',
      100: '#361f02',
      200: '#6d3d03',
      300: '#a35c05',
      400: '#da7b07',
      500: '#f8961e',
      600: '#f9ac4d',
      700: '#fbc179',
      800: '#fcd5a6',
      900: '#feead2',
    },
  ],
  [
    {
      DEFAULT: '#f9844a',
      100: '#3e1602',
      200: '#7d2c04',
      300: '#bb4206',
      400: '#f7590a',
      500: '#f9844a',
      600: '#fa9c6d',
      700: '#fcb591',
      800: '#fdcdb6',
      900: '#fee6da',
    },
  ],
  [
    {
      DEFAULT: '#f9c74f',
      100: '#3f2d02',
      200: '#7e5a05',
      300: '#bd8607',
      400: '#f6b10f',
      500: '#f9c74f',
      600: '#fad171',
      700: '#fbdc95',
      800: '#fce8b8',
      900: '#fef3dc',
    },
  ],
  [
    {
      DEFAULT: '#90be6d',
      100: '#1d2a13',
      200: '#395325',
      300: '#567d38',
      400: '#72a64b',
      500: '#90be6d',
      600: '#a7cb8c',
      700: '#bdd8a8',
      800: '#d3e5c5',
      900: '#e9f2e2',
    },
  ],
  [
    {
      DEFAULT: '#43aa8b',
      100: '#0d221b',
      200: '#1b4337',
      300: '#286552',
      400: '#35866e',
      500: '#43aa8b',
      600: '#61c0a4',
      700: '#89d0bb',
      800: '#b0e0d1',
      900: '#d8efe8',
    },
  ],
  [
    {
      DEFAULT: '#4d908e',
      100: '#0f1d1c',
      200: '#1f3938',
      300: '#2e5654',
      400: '#3d7270',
      500: '#4d908e',
      600: '#68aeab',
      700: '#8ec2c0',
      800: '#b3d6d5',
      900: '#d9ebea',
    },
  ],
  [
    {
      DEFAULT: '#577590',
      100: '#11171d',
      200: '#222f39',
      300: '#344656',
      400: '#455d73',
      500: '#577590',
      600: '#7391ab',
      700: '#96acc0',
      800: '#b9c8d5',
      900: '#dce3ea',
    },
  ],
  [
    {
      DEFAULT: '#277da1',
      100: '#081920',
      200: '#103140',
      300: '#174a60',
      400: '#1f6380',
      500: '#277da1',
      600: '#37a1ce',
      700: '#69b8db',
      800: '#9bd0e7',
      900: '#cde7f3',
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
