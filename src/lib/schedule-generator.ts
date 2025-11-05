/**
 * Schedule Generation Algorithm
 * 
 * Generates all valid schedule combinations from selected courses,
 * filters out conflicts, and ranks by user preferences.
 */

import { Course, Section, SelectedCourse, TimeSlot, DayOfWeek } from '@/types';
import { timeSlotsOverlap, hasAvailableSeats } from './schedule-utils';

// ============================================================================
// TYPES
// ============================================================================

export type GeneratedSchedule = {
  sections: SelectedCourse[];
  score: number;
  metadata?: {
    totalGapMinutes?: number;
    daysUsed?: number;
    avgStartTime?: number;
    avgEndTime?: number;
    freeDays?: number;
    longBreakCount?: number;
  };
};

export type ScheduleGenerationOptions = {
  preference: 'shortBreaks' | 'longBreaks' | 'consistentStart' | 'startLate' | 'endEarly' | 'daysOff' | null;
  maxResults?: number; // Default 100
  excludeFullSections?: boolean; // If true, strictly exclude full sections. If false, prefer non-full but allow full sections
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates course data to catch issues early
 * Logs warnings for invalid data but doesn't throw errors
 */
function validateCourses(courses: Course[]): void {
  for (const course of courses) {
    // Check if course has sections
    if (!course.sections || course.sections.length === 0) {
      console.warn(`Course ${course.courseCode} has no sections`);
      continue;
    }

    // Check if course has at least one lecture
    const lectures = course.sections.filter(s => s.sectionType === 'Lecture');
    if (lectures.length === 0) {
      console.warn(`Course ${course.courseCode} has no lecture sections`);
    }

    // Validate each section
    for (const section of course.sections) {
      // Check for empty time slots
      if (!section.timeSlots || section.timeSlots.length === 0) {
        console.warn(
          `Course ${course.courseCode}, Section ${section.sectionId} (${section.sectionType}) has no time slots`
        );
      }

      // Validate parentLecture references
      if (section.parentLecture !== undefined && section.sectionType !== 'Lecture') {
        const parentExists = course.sections.some(
          s => s.sectionType === 'Lecture' && s.sectionId === section.parentLecture
        );
        if (!parentExists) {
          console.warn(
            `Course ${course.courseCode}, Section ${section.sectionId} (${section.sectionType}) ` +
            `references non-existent parent lecture: ${section.parentLecture}`
          );
        }
      }

      // Validate time slot format
      for (const slot of section.timeSlots) {
        if (!slot.day || !slot.startTime || !slot.endTime) {
          console.warn(
            `Course ${course.courseCode}, Section ${section.sectionId} has invalid time slot:`,
            slot
          );
        }
      }
    }
  }
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generates all valid schedule combinations from courses
 * @param courses - Array of courses to schedule
 * @param options - Generation options including preference
 * @returns Array of valid schedules ranked by score
 */
export function generateSchedules(
  courses: Course[],
  options: ScheduleGenerationOptions
): GeneratedSchedule[] {
  // Handle edge case: empty courses
  if (!courses || courses.length === 0) {
    return [];
  }

  // Validate course data
  validateCourses(courses);

  const maxResults = options.maxResults || 100;
  const excludeFullSections = options.excludeFullSections || false;

  // Step 1: Generate all possible combinations
  const allCombinations = generateAllCombinations(courses);
  
  // Step 2: Filter out conflicting schedules
  let validSchedules = allCombinations.filter(combination => 
    !hasConflicts(combination)
  );

  // Step 2.5: If excludeFullSections is true, strictly filter out schedules with full sections
  if (excludeFullSections) {
    validSchedules = validSchedules.filter(combination =>
      combination.every(selectedCourse => hasAvailableSeats(selectedCourse.selectedSection))
    );
  }

  // Step 3: Score each schedule based on preference AND seat availability
  const scoredSchedules = validSchedules.map(sections => {
    // Base score from user preference
    let score = options.preference 
      ? calculateScore(sections, options.preference)
      : 0;
    
    // Add bonus score for non-full sections (prioritize schedules with available seats)
    // This ensures schedules with available seats appear first, regardless of excludeFullSections setting
    const seatAvailabilityBonus = calculateSeatAvailabilityScore(sections);
    score += seatAvailabilityBonus;
    
    const metadata = calculateMetadata(sections, options.preference);
    
    return {
      sections,
      score,
      metadata,
    };
  });

  // Step 4: Sort by score (descending) and limit results
  scoredSchedules.sort((a, b) => b.score - a.score);
  
  return scoredSchedules.slice(0, maxResults);
}

// ============================================================================
// COMBINATION GENERATION
// ============================================================================

/**
 * Generates all possible combinations of sections across courses
 * For each course, we need to select one lecture and ALL required sections (tutorials, labs, etc.)
 * 
 * Supports complex courses with multiple section types:
 * - Lecture only: [LEC A]
 * - Lecture + Tutorial: [LEC A + TUT 1], [LEC A + TUT 2], etc.
 * - Lecture + Tutorial + Lab: [LEC A + TUT 1 + LAB 1], [LEC A + TUT 1 + LAB 2], etc.
 */
function generateAllCombinations(courses: Course[]): SelectedCourse[][] {
  // For each course, get all possible section combinations (lecture + required sections)
  const sectionCombinationsByCourse = courses.map(course => {
    const lectures = course.sections.filter(section => section.sectionType === 'Lecture');
    
    // If no lectures, skip this course (invalid course data)
    if (lectures.length === 0) {
      console.warn(`Course ${course.courseCode} has no lecture sections`);
      return [];
    }

    const allCourseCombinations: SelectedCourse[][] = [];

    for (const lecture of lectures) {
      // Find ALL sections that belong to this lecture
      // parentLecture === lecture.sectionId means it's tied to this specific lecture
      // parentLecture === undefined means it can pair with ANY lecture (universal sections)
      const relatedSections = course.sections.filter(section => 
        section.sectionType !== 'Lecture' && 
        section.parentLecture === lecture.sectionId
      );

      // Also get universal sections (no parent lecture specified)
      const universalSections = course.sections.filter(section =>
        section.sectionType !== 'Lecture' &&
        section.parentLecture === undefined
      );

      // Group related sections by type (Tutorial, Lab, etc.)
      const sectionsByType: Record<string, Section[]> = {};
      
      for (const section of relatedSections) {
        if (!sectionsByType[section.sectionType]) {
          sectionsByType[section.sectionType] = [];
        }
        sectionsByType[section.sectionType].push(section);
      }

      // Add universal sections to each type group
      for (const section of universalSections) {
        if (!sectionsByType[section.sectionType]) {
          sectionsByType[section.sectionType] = [];
        }
        sectionsByType[section.sectionType].push(section);
      }

      // If no additional sections required, just return the lecture
      if (Object.keys(sectionsByType).length === 0) {
        allCourseCombinations.push([{
          course,
          selectedSection: lecture,
        }]);
      } else {
        // Generate Cartesian product of all section types
        // Example: Tutorial=[T1,T2], Lab=[L1,L2] => [[T1,L1], [T1,L2], [T2,L1], [T2,L2]]
        const sectionTypeArrays = Object.values(sectionsByType);
        const sectionCombinations = cartesianProduct(sectionTypeArrays);

        // For each combination of sections, create a complete course selection
        for (const sectionCombo of sectionCombinations) {
          const courseSelection: SelectedCourse[] = [
            {
              course,
              selectedSection: lecture,
            }
          ];

          // Add all sections in this combination
          for (const section of sectionCombo) {
            courseSelection.push({
              course,
              selectedSection: section,
            });
          }

          allCourseCombinations.push(courseSelection);
        }
      }
    }

    return allCourseCombinations;
  });

  // Filter out empty course combinations (invalid courses)
  const validCombinationsByCourse = sectionCombinationsByCourse.filter(combos => combos.length > 0);

  // Generate Cartesian product of all course combinations
  const allSchedules = cartesianProduct(validCombinationsByCourse);

  // Flatten: each schedule is an array of SelectedCourse arrays, flatten to single array
  return allSchedules.map(schedule => schedule.flat());
}

/**
 * Generates Cartesian product of arrays
 * Example: [[A, B], [1, 2]] => [[A, 1], [A, 2], [B, 1], [B, 2]]
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(item => [item]);

  const result: T[][] = [];
  const rest = cartesianProduct(arrays.slice(1));

  for (const item of arrays[0]) {
    for (const combination of rest) {
      result.push([item, ...combination]);
    }
  }

  return result;
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Checks if a schedule has any time conflicts
 */
function hasConflicts(schedule: SelectedCourse[]): boolean {
  // Check all pairs of sections
  for (let i = 0; i < schedule.length; i++) {
    for (let j = i + 1; j < schedule.length; j++) {
      const section1 = schedule[i].selectedSection;
      const section2 = schedule[j].selectedSection;

      // Check if any time slots overlap
      for (const slot1 of section1.timeSlots) {
        for (const slot2 of section2.timeSlots) {
          if (timeSlotsOverlap(slot1, slot2)) {
            return true; // Conflict found
          }
        }
      }
    }
  }

  return false; // No conflicts
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculates score for a schedule based on preference
 * Higher score = better match to preference
 */
function calculateScore(schedule: SelectedCourse[], preference: string): number {
  switch (preference) {
    case 'shortBreaks':
      return scoreShortBreaks(schedule);
    case 'longBreaks':
      return scoreLongBreaks(schedule);
    case 'consistentStart':
      return scoreConsistentStart(schedule);
    case 'startLate':
      return scoreStartLate(schedule);
    case 'endEarly':
      return scoreEndEarly(schedule);
    case 'daysOff':
      return scoreDaysOff(schedule);
    default:
      return 0;
  }
}

/**
 * Short Breaks: Minimize gaps between classes
 * Lower total gap = higher score
 */
function scoreShortBreaks(schedule: SelectedCourse[]): number {
  const totalGap = calculateTotalGapMinutes(schedule);
  // Convert to score: fewer gaps = higher score
  // Use 1000 - gap so that 0 gap = 1000 score
  return Math.max(0, 1000 - totalGap);
}

/**
 * Long Breaks: Maximize number of breaks >= 60 minutes
 * More long breaks = higher score
 */
function scoreLongBreaks(schedule: SelectedCourse[]): number {
  const longBreakCount = countLongBreaks(schedule);
  return longBreakCount * 100; // Each long break = 100 points
}

/**
 * Consistent Start: Minimize variance in daily start times
 * Lower variance = higher score
 */
function scoreConsistentStart(schedule: SelectedCourse[]): number {
  const variance = calculateStartTimeVariance(schedule);
  // Lower variance = higher score
  // Use inverse scoring: 10000 / (1 + variance)
  // Perfect consistency (variance=0) = 10000 points
  // High variance (variance=10000) = ~1 point
  return 10000 / (1 + variance);
}

/**
 * Start Late: Maximize average start time
 * Later start = higher score
 */
function scoreStartLate(schedule: SelectedCourse[]): number {
  const avgStartTime = calculateAverageStartTime(schedule);
  // Start time in minutes (9:00 = 540, 14:00 = 840)
  // Score = start time directly (later = higher)
  return avgStartTime;
}

/**
 * End Early: Minimize average end time
 * Earlier end = higher score
 */
function scoreEndEarly(schedule: SelectedCourse[]): number {
  const avgEndTime = calculateAverageEndTime(schedule);
  // Convert to score: earlier = higher
  // Max end time ~= 20:00 (1200 minutes), so 1200 - avgEnd
  return Math.max(0, 1200 - avgEndTime);
}

/**
 * Days Off: Maximize number of free weekdays
 * More free days = higher score
 */
function scoreDaysOff(schedule: SelectedCourse[]): number {
  const daysUsed = getUniqueDays(schedule);
  const freeDays = 5 - daysUsed.length; // 5 weekdays
  return freeDays * 200; // Each free day = 200 points
}

/**
 * Seat Availability: Prioritize schedules with available seats
 * Gives massive bonus to schedules where all sections have available seats
 * This ensures non-full schedules always appear before full ones
 */
function calculateSeatAvailabilityScore(schedule: SelectedCourse[]): number {
  let score = 0;
  let totalSections = 0;
  let availableSections = 0;

  for (const selectedCourse of schedule) {
    totalSections++;
    if (hasAvailableSeats(selectedCourse.selectedSection)) {
      availableSections++;
      // Each section with available seats = 500 bonus points
      score += 500;
    }
  }

  // Additional bonus if ALL sections have available seats
  if (availableSections === totalSections && totalSections > 0) {
    score += 5000; // Huge bonus for fully available schedules
  }

  return score;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate total gap minutes in a schedule
 */
function calculateTotalGapMinutes(schedule: SelectedCourse[]): number {
  const daySchedules = groupByDay(schedule);
  let totalGap = 0;

  for (const [day, slots] of Object.entries(daySchedules)) {
    // Sort slots by start time
    const sorted = slots.sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    // Calculate gaps between consecutive classes
    for (let i = 0; i < sorted.length - 1; i++) {
      const endTime = timeToMinutes(sorted[i].endTime);
      const nextStartTime = timeToMinutes(sorted[i + 1].startTime);
      const gap = Math.max(0, nextStartTime - endTime);
      totalGap += gap;
    }
  }

  return totalGap;
}

/**
 * Count breaks >= 60 minutes
 */
function countLongBreaks(schedule: SelectedCourse[]): number {
  const daySchedules = groupByDay(schedule);
  let count = 0;

  for (const [day, slots] of Object.entries(daySchedules)) {
    const sorted = slots.sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const endTime = timeToMinutes(sorted[i].endTime);
      const nextStartTime = timeToMinutes(sorted[i + 1].startTime);
      const gap = nextStartTime - endTime;
      
      if (gap >= 60) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Calculate variance in daily start times
 */
function calculateStartTimeVariance(schedule: SelectedCourse[]): number {
  const daySchedules = groupByDay(schedule);
  const startTimes: number[] = [];

  for (const [day, slots] of Object.entries(daySchedules)) {
    if (slots.length > 0) {
      const earliestStart = Math.min(...slots.map(s => timeToMinutes(s.startTime)));
      startTimes.push(earliestStart);
    }
  }

  if (startTimes.length === 0) return 0;

  const mean = startTimes.reduce((a, b) => a + b, 0) / startTimes.length;
  const variance = startTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / startTimes.length;
  
  return variance;
}

/**
 * Calculate average start time across all days
 */
function calculateAverageStartTime(schedule: SelectedCourse[]): number {
  const daySchedules = groupByDay(schedule);
  const startTimes: number[] = [];

  for (const [day, slots] of Object.entries(daySchedules)) {
    if (slots.length > 0) {
      const earliestStart = Math.min(...slots.map(s => timeToMinutes(s.startTime)));
      startTimes.push(earliestStart);
    }
  }

  if (startTimes.length === 0) return 0;
  
  return startTimes.reduce((a, b) => a + b, 0) / startTimes.length;
}

/**
 * Calculate average end time across all days
 */
function calculateAverageEndTime(schedule: SelectedCourse[]): number {
  const daySchedules = groupByDay(schedule);
  const endTimes: number[] = [];

  for (const [day, slots] of Object.entries(daySchedules)) {
    if (slots.length > 0) {
      const latestEnd = Math.max(...slots.map(s => timeToMinutes(s.endTime)));
      endTimes.push(latestEnd);
    }
  }

  if (endTimes.length === 0) return 0;
  
  return endTimes.reduce((a, b) => a + b, 0) / endTimes.length;
}

/**
 * Get unique days used in schedule
 */
function getUniqueDays(schedule: SelectedCourse[]): string[] {
  const days = new Set<string>();
  
  for (const selected of schedule) {
    for (const slot of selected.selectedSection.timeSlots) {
      days.add(slot.day);
    }
  }

  return Array.from(days);
}

/**
 * Group time slots by day
 */
function groupByDay(schedule: SelectedCourse[]): Record<string, TimeSlot[]> {
  const grouped: Record<string, TimeSlot[]> = {};

  for (const selected of schedule) {
    for (const slot of selected.selectedSection.timeSlots) {
      if (!grouped[slot.day]) {
        grouped[slot.day] = [];
      }
      grouped[slot.day].push(slot);
    }
  }

  return grouped;
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate metadata for a schedule
 */
function calculateMetadata(
  schedule: SelectedCourse[],
  preference: string | null
): GeneratedSchedule['metadata'] {
  return {
    totalGapMinutes: calculateTotalGapMinutes(schedule),
    daysUsed: getUniqueDays(schedule).length,
    avgStartTime: calculateAverageStartTime(schedule),
    avgEndTime: calculateAverageEndTime(schedule),
    freeDays: 5 - getUniqueDays(schedule).length,
    longBreakCount: countLongBreaks(schedule),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { scoreSchedule };

/**
 * Score a single schedule (used by tests)
 */
function scoreSchedule(schedule: GeneratedSchedule, preference: string): number {
  return calculateScore(schedule.sections, preference);
}
