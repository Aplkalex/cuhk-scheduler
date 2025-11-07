import { TimeSlot, SelectedCourse, Conflict, DayOfWeek, Course, Section } from '@/types';

type CourseColorShades = {
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

const PRIMARY_COURSE_COLOR_SETS: Record<string, CourseColorShades> = {
  imperial_red: {
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
  taupe: {
    DEFAULT: '#463f3a',
    100: '#0e0d0c',
    200: '#1c1917',
    300: '#2a2623',
    400: '#38322e',
    500: '#463f3a',
    600: '#6f645d',
    700: '#978b82',
    800: '#b9b1ac',
    900: '#dcd8d5',
  },
  battleship_gray: {
    DEFAULT: '#8a817c',
    100: '#1c1a18',
    200: '#373331',
    300: '#534d49',
    400: '#6e6662',
    500: '#8a817c',
    600: '#a19995',
    700: '#b9b3b0',
    800: '#d0ccca',
    900: '#e8e6e5',
  },
  silver: {
    DEFAULT: '#bcb8b1',
    100: '#282622',
    200: '#4f4b44',
    300: '#777165',
    400: '#9c958a',
    500: '#bcb8b1',
    600: '#cac7c1',
    700: '#d8d5d1',
    800: '#e5e3e0',
    900: '#f2f1f0',
  },
  isabelline: {
    DEFAULT: '#f4f3ee',
    100: '#3b3726',
    200: '#756e4d',
    300: '#a8a17a',
    400: '#cfcab5',
    500: '#f4f3ee',
    600: '#f7f6f3',
    700: '#f9f8f6',
    800: '#fbfbf9',
    900: '#fdfdfc',
  },
  melon: {
    DEFAULT: '#e0afa0',
    100: '#3a1c13',
    200: '#743825',
    300: '#ad5438',
    400: '#cd7d65',
    500: '#e0afa0',
    600: '#e6beb2',
    700: '#eccec5',
    800: '#f3dfd8',
    900: '#f9efec',
  },
  pistachio: {
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
  zomp: {
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
  dark_cyan: {
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
  paynes_gray: {
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
  cerulean: {
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
};

const SECONDARY_COURSE_COLOR_SETS: Record<string, CourseColorShades> = {
  rose: {
    DEFAULT: '#f72585',
    100: '#37021a',
    200: '#6e0434',
    300: '#a5064e',
    400: '#dc0868',
    500: '#f72585',
    600: '#f9529d',
    700: '#fa7db5',
    800: '#fca8ce',
    900: '#fdd4e6',
  },
  fandango: {
    DEFAULT: '#b5179e',
    100: '#24051f',
    200: '#48093f',
    300: '#6c0e5e',
    400: '#90137e',
    500: '#b5179e',
    600: '#e326c7',
    700: '#ea5dd5',
    800: '#f193e3',
    900: '#f8c9f1',
  },
  grape: {
    DEFAULT: '#7209b7',
    100: '#170225',
    200: '#2e034a',
    300: '#45056f',
    400: '#5c0794',
    500: '#7209b7',
    600: '#980df4',
    700: '#b14af6',
    800: '#cb86f9',
    900: '#e5c3fc',
  },
  chrysler_blue: {
    DEFAULT: '#560bad',
    100: '#110223',
    200: '#230445',
    300: '#340768',
    400: '#45098a',
    500: '#560bad',
    600: '#750fea',
    700: '#9747f3',
    800: '#ba84f7',
    900: '#dcc2fb',
  },
  zaffre: {
    DEFAULT: '#3a0ca3',
    100: '#0b0220',
    200: '#170541',
    300: '#220761',
    400: '#2e0a81',
    500: '#3a0ca3',
    600: '#4f11e0',
    700: '#7743f1',
    800: '#a582f6',
    900: '#d2c0fa',
  },
  palatinate_blue: {
    DEFAULT: '#3f37c9',
    100: '#0c0b28',
    200: '#191650',
    300: '#252178',
    400: '#322ca0',
    500: '#3f37c9',
    600: '#655fd3',
    700: '#8b87de',
    800: '#b2afe9',
    900: '#d8d7f4',
  },
  neon_blue: {
    DEFAULT: '#4361ee',
    100: '#050f38',
    200: '#0a1d70',
    300: '#102ca8',
    400: '#153ae0',
    500: '#4361ee',
    600: '#6a83f1',
    700: '#8fa2f5',
    800: '#b4c1f8',
    900: '#dae0fc',
  },
  chefchaouen_blue: {
    DEFAULT: '#4895ef',
    100: '#051d39',
    200: '#0a3b72',
    300: '#0f58ac',
    400: '#1475e5',
    500: '#4895ef',
    600: '#6dabf2',
    700: '#91c0f5',
    800: '#b6d5f9',
    900: '#daeafc',
  },
  vivid_sky_blue: {
    DEFAULT: '#4cc9f0',
    100: '#052e3a',
    200: '#095c75',
    300: '#0e8aaf',
    400: '#13b8ea',
    500: '#4cc9f0',
    600: '#70d5f3',
    700: '#93dff6',
    800: '#b7eaf9',
    900: '#dbf4fc',
  },
};

const PRIMARY_COURSE_COLORS = Object.values(PRIMARY_COURSE_COLOR_SETS).map((shades) => shades.DEFAULT);
const SECONDARY_COURSE_COLORS = Object.values(SECONDARY_COURSE_COLOR_SETS).map((shades) => shades.DEFAULT);

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
export function generateCourseColor(courseCode: string, usedColors: string[]): string {
  for (const color of PRIMARY_COURSE_COLORS) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  for (const color of SECONDARY_COURSE_COLORS) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  
  // If all colors used, generate hash-based color
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const fallbackPalette = PRIMARY_COURSE_COLORS.concat(SECONDARY_COURSE_COLORS);
  return fallbackPalette[Math.abs(hash) % fallbackPalette.length];
}

/**
 * Check if a course has available seats
 */
export function hasAvailableSeats(section: { quota: number; enrolled: number }): boolean {
  return section.enrolled < section.quota;
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

  console.log('🔍 Checking conflicts for:', newCourse.course.courseCode, newCourse.selectedSection.sectionId);
  console.log('   Time slots:', newCourse.selectedSection.timeSlots);

  for (const existingCourse of existingCourses) {
    console.log('  Against:', existingCourse.course.courseCode, existingCourse.selectedSection.sectionId);
    console.log('    Time slots:', existingCourse.selectedSection.timeSlots);
    
    // Check if any time slots overlap
    for (const newSlot of newCourse.selectedSection.timeSlots) {
      for (const existingSlot of existingCourse.selectedSection.timeSlots) {
        const overlaps = timeSlotsOverlap(newSlot, existingSlot);
        if (overlaps) {
          console.log('    ⚠️ CONFLICT FOUND!', newSlot, 'overlaps with', existingSlot);
          conflicts.push(existingCourse.course.courseCode);
          break; // Only add each course once
        }
      }
      if (conflicts.includes(existingCourse.course.courseCode)) break;
    }
  }

  console.log('  Total conflicts found:', conflicts);
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
