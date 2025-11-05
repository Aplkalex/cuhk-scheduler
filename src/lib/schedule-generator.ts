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

  console.log(`🚀 Starting schedule generation for ${courses.length} courses...`);
  console.time('⏱️ Total generation time');

  // OPTIMIZATION 1: Filter full sections BEFORE generating combinations
  const coursesWithFilteredSections = excludeFullSections
    ? courses.map(course => ({
        ...course,
        sections: course.sections.filter(section => hasAvailableSeats(section))
      }))
    : courses;

  console.log(`✅ Section filtering complete`);

  // OPTIMIZATION 2: Generate with early conflict pruning
  console.time('⏱️ Combination generation with pruning');
  const validSchedules = generateValidCombinationsWithPruning(
    coursesWithFilteredSections,
    excludeFullSections,
    maxResults * 5 // Generate more than needed to have good selection after scoring
  );
  console.timeEnd('⏱️ Combination generation with pruning');

  console.log(`✅ Generated ${validSchedules.length} valid schedules (after pruning)`);

  // Step 3: Score each schedule based on preference AND seat availability
  console.time('⏱️ Scoring');
  const scoredSchedules = validSchedules.map(sections => {
    // Base score from user preference
    let score = options.preference 
      ? calculateScore(sections, options.preference)
      : 0;
    
    // calculateScore now includes seat availability bonus internally
    
    return {
      sections,
      score,
      metadata: undefined, // Calculate metadata only for top results
    };
  });
  console.timeEnd('⏱️ Scoring');

  // Step 4: Sort by score (includes seat availability)
  console.time('⏱️ Sorting');
  scoredSchedules.sort((a, b) => b.score - a.score);
  console.timeEnd('⏱️ Sorting');

  // Step 5: Take top N and calculate metadata only for these
  console.time('⏱️ Metadata calculation');
  const topSchedules = scoredSchedules.slice(0, maxResults).map(schedule => {
    const metadata = calculateMetadata(schedule.sections, options.preference);
    return {
      ...schedule,
      metadata,
    };
  });
  console.timeEnd('⏱️ Metadata calculation');

  // Step 6: Final sort based on preference
  // Only prioritize days off if user selected "daysOff" preference
  topSchedules.sort((a, b) => {
    if (options.preference === 'daysOff') {
      // For "Days Off" preference: sort by free days first, then score
      const freeDaysA = a.metadata?.freeDays ?? 0;
      const freeDaysB = b.metadata?.freeDays ?? 0;
      
      if (freeDaysB !== freeDaysA) {
        return freeDaysB - freeDaysA;
      }
    }
    
    // For all other preferences: sort by score only
    return b.score - a.score;
  });

  console.timeEnd('⏱️ Total generation time');
  console.log(`✨ Returning ${topSchedules.length} optimized schedules`);
  
  return topSchedules;
}

// ============================================================================
// DAY PATTERN UTILITIES
// ============================================================================

/**
 * Get the day pattern signature for a section (e.g., "MonWedFri", "TueThu")
 */
function getDayPattern(section: Section): string {
  const days = section.timeSlots.map(slot => slot.day).sort();
  return days.join('');
}

/**
 * Get all lectures grouped by their day patterns
 */
function groupLecturesByDayPattern(course: Course, excludeFullSections: boolean): Map<string, Section[]> {
  const lectures = course.sections.filter(s => s.sectionType === 'Lecture');
  const patternMap = new Map<string, Section[]>();
  
  for (const lecture of lectures) {
    if (excludeFullSections && !hasAvailableSeats(lecture)) {
      continue;
    }
    
    const pattern = getDayPattern(lecture);
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, []);
    }
    patternMap.get(pattern)!.push(lecture);
  }
  
  return patternMap;
}

/**
 * Calculate day overlap between two day patterns
 */
function calculateDayOverlap(pattern1: string, pattern2: string): number {
  const days1 = new Set(pattern1.match(/(Monday|Tuesday|Wednesday|Thursday|Friday)/g) || []);
  const days2 = new Set(pattern2.match(/(Monday|Tuesday|Wednesday|Thursday|Friday)/g) || []);
  
  let overlap = 0;
  for (const day of days1) {
    if (days2.has(day)) overlap++;
  }
  return overlap;
}

// ============================================================================
// COMBINATION GENERATION WITH EARLY PRUNING
// ============================================================================

/**
 * Generates valid schedule combinations with early conflict pruning
 * This is much faster than generating all combinations and then filtering
 * 
 * OPTIMIZATION: Prune conflicts DURING generation, not after
 */
function generateValidCombinationsWithPruning(
  courses: Course[],
  excludeFullSections: boolean,
  maxResults: number
): SelectedCourse[][] {
  const validSchedules: SelectedCourse[][] = [];
  const conflictCache = new Map<string, boolean>(); // Memoization for conflict checks

  // OPTIMIZATION: Analyze courses and sort them to maximize day separation
  // Prioritize courses that have Tue/Thu options, as these create natural separation
  const coursesWithAnalysis = courses.map(course => {
    const lectures = course.sections.filter(s => s.sectionType === 'Lecture');
    let hasTueThu = false;
    let hasMonWedFri = false;
    
    for (const lecture of lectures) {
      if (excludeFullSections && !hasAvailableSeats(lecture)) continue;
      const days = lecture.timeSlots.map(slot => slot.day);
      const hasMon = days.includes('Monday');
      const hasTue = days.includes('Tuesday');
      const hasWed = days.includes('Wednesday');
      const hasThu = days.includes('Thursday');
      const hasFri = days.includes('Friday');
      
      // Check if this is a Tue/Thu only lecture
      if ((hasTue || hasThu) && !hasMon && !hasWed && !hasFri) {
        hasTueThu = true;
      }
      // Check if this is a Mon/Wed/Fri lecture
      if ((hasMon || hasWed || hasFri) && !hasTue && !hasThu) {
        hasMonWedFri = true;
      }
    }
    
    return { course, hasTueThu, hasMonWedFri };
  });
  
  // Sort: Courses with ONLY Tue/Thu options first (forces day separation)
  // Then courses with mixed options, then Mon/Wed/Fri only
  const sortedCourses = coursesWithAnalysis.sort((a, b) => {
    if (a.hasTueThu && !a.hasMonWedFri && !(b.hasTueThu && !b.hasMonWedFri)) return -1;
    if (!(a.hasTueThu && !a.hasMonWedFri) && b.hasTueThu && !b.hasMonWedFri) return 1;
    return 0;
  }).map(item => item.course);
  
  console.log('📊 Course order for day separation:',
    sortedCourses.map((c, i) => {
      const analysis = coursesWithAnalysis.find(ca => ca.course === c)!;
      return `${c.courseCode} (${analysis.hasTueThu && !analysis.hasMonWedFri ? 'TueThu' : 
                analysis.hasMonWedFri && !analysis.hasTueThu ? 'MonWedFri' : 'Mixed'})`;
    }).join(', ')
  );

  /**
   * Recursive backtracking with conflict pruning
   */
  function backtrack(courseIndex: number, currentSchedule: SelectedCourse[]) {
    // Base case: we've selected sections for all courses
    if (courseIndex === sortedCourses.length) {
      validSchedules.push([...currentSchedule]);
      return;
    }

    // Early exit if we have enough schedules
    if (validSchedules.length >= maxResults) {
      return;
    }

    const course = sortedCourses[courseIndex];
    
    // Get all possible section combinations for this course
    let courseCombinations = getCourseSectionCombinations(course, excludeFullSections);
    
    // OPTIMIZATION: Sort combinations to prefer day consolidation
    // Calculate a "day consolidation score" that heavily favors:
    // 1. Perfect separation (no overlap) - creates free days
    // 2. Perfect consolidation (complete overlap) - maximizes compactness
    if (currentSchedule.length > 0) {
      const currentDays = new Set(
        currentSchedule.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day))
      );
      const numCurrentDays = currentDays.size;
      
      // Debug: Show current day usage
      if (courseIndex === 1) {
        console.log(`📅 After course ${courseIndex}, currently using ${numCurrentDays} days: ${[...currentDays].join(', ')}`);
      }
      
      courseCombinations = courseCombinations.sort((a, b) => {
        const aDays = new Set(a.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day)));
        const bDays = new Set(b.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day)));
        
        // Calculate how many days would be used if we add this combination
        const aTotalDays = new Set([...currentDays, ...aDays]).size;
        const bTotalDays = new Set([...currentDays, ...bDays]).size;
        
        // Debug: Show first few combinations being compared
        if (courseIndex === 1 && courseCombinations.indexOf(a) < 3) {
          const aLecture = a.find(item => item.selectedSection.sectionType === 'Lecture');
          console.log(`  Option: ${aLecture?.course.courseCode} ${aLecture?.selectedSection.sectionId} on ${[...aDays].join(',')} → Total days: ${aTotalDays}`);
        }
        
        // PRIORITY 1: Minimize total days used (this creates free days!)
        if (aTotalDays !== bTotalDays) {
          return aTotalDays - bTotalDays; // Fewer total days = better
        }
        
        // PRIORITY 2: If same total days, prefer more available seats
        const aSeats = a.reduce((sum, item) => sum + item.selectedSection.seatsRemaining, 0);
        const bSeats = b.reduce((sum, item) => sum + item.selectedSection.seatsRemaining, 0);
        return bSeats - aSeats;
      });
      
      // Debug: Show which combination was chosen first
      if (courseIndex === 1 && courseCombinations.length > 0) {
        const firstChoice = courseCombinations[0];
        const lecture = firstChoice.find(item => item.selectedSection.sectionType === 'Lecture');
        const days = new Set(firstChoice.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day)));
        console.log(`  ✅ Will try first: ${lecture?.course.courseCode} ${lecture?.selectedSection.sectionId} on ${[...days].join(',')}`);
      }
    }

    // Try each combination
    for (const combination of courseCombinations) {
      // OPTIMIZATION: Check conflicts with current schedule before continuing
      if (!hasConflictsWithSchedule(combination, currentSchedule, conflictCache)) {
        // No conflicts, continue building schedule
        backtrack(courseIndex + 1, [...currentSchedule, ...combination]);

        // Early exit if we have enough
        if (validSchedules.length >= maxResults) {
          return;
        }
      }
      // If there's a conflict, skip this branch (pruning!)
    }
  }

  backtrack(0, []);
  return validSchedules;
}

/**
 * Get all possible section combinations for a single course
 * OPTIMIZATION: Fixed universal sections bug - they're added per lecture, not duplicated
 */
function getCourseSectionCombinations(
  course: Course,
  excludeFullSections: boolean
): SelectedCourse[][] {
  let lectures = course.sections.filter(s => s.sectionType === 'Lecture');
  
  if (lectures.length === 0) {
    console.warn(`Course ${course.courseCode} has no lecture sections`);
    return [];
  }

  // OPTIMIZATION: Sort lectures to try those with better day patterns first
  // Prioritize: 1) Lectures on Tue/Thu (creates day separation)
  //             2) Lectures with more available seats
  //             3) Lectures on Mon/Wed/Fri
  lectures = lectures.sort((a, b) => {
    const aDays = new Set(a.timeSlots.map(slot => slot.day));
    const bDays = new Set(b.timeSlots.map(slot => slot.day));
    
    // Check if lecture is on Tue/Thu only (highly valuable for day consolidation)
    const aIsTueThu = aDays.has('Tuesday') || aDays.has('Thursday');
    const bIsTueThu = bDays.has('Tuesday') || bDays.has('Thursday');
    const aOnlyTueThu = aIsTueThu && !aDays.has('Monday') && !aDays.has('Wednesday') && !aDays.has('Friday');
    const bOnlyTueThu = bIsTueThu && !bDays.has('Monday') && !bDays.has('Wednesday') && !bDays.has('Friday');
    
    if (aOnlyTueThu && !bOnlyTueThu) return -1;
    if (!aOnlyTueThu && bOnlyTueThu) return 1;
    
    // Secondary sort by seat availability
    return b.seatsRemaining - a.seatsRemaining;
  });

  const allCombinations: SelectedCourse[][] = [];

  // Get universal sections once (not per lecture) - BUG FIX
  const universalSections = course.sections.filter(section =>
    section.sectionType !== 'Lecture' &&
    section.parentLecture === undefined
  );

  for (const lecture of lectures) {
    // Skip full lectures if excluding
    if (excludeFullSections && !hasAvailableSeats(lecture)) {
      continue;
    }

    // Get sections tied to this specific lecture
    const lectureSpecificSections = course.sections.filter(section => 
      section.sectionType !== 'Lecture' && 
      section.parentLecture === lecture.sectionId
    );

    // Group lecture-specific sections by type first
    const lectureSpecificByType: Record<string, Section[]> = {};
    for (const section of lectureSpecificSections) {
      if (!lectureSpecificByType[section.sectionType]) {
        lectureSpecificByType[section.sectionType] = [];
      }
      if (!excludeFullSections || hasAvailableSeats(section)) {
        lectureSpecificByType[section.sectionType].push(section);
      }
    }

    // Group universal sections by type
    const universalByType: Record<string, Section[]> = {};
    for (const section of universalSections) {
      if (!universalByType[section.sectionType]) {
        universalByType[section.sectionType] = [];
      }
      if (!excludeFullSections || hasAvailableSeats(section)) {
        universalByType[section.sectionType].push(section);
      }
    }

    // Combine: use lecture-specific sections if available, otherwise use universal
    // This ensures L4X is used instead of L18 when you have LEC 004
    const sectionsByType: Record<string, Section[]> = {};
    const allTypes = new Set([...Object.keys(lectureSpecificByType), ...Object.keys(universalByType)]);
    
    for (const type of allTypes) {
      const specificSections = lectureSpecificByType[type] || [];
      const universalSections = universalByType[type] || [];
      
      // If lecture has specific sections for this type, use ONLY those
      // Otherwise, use universal sections
      if (specificSections.length > 0) {
        sectionsByType[type] = specificSections;
      } else if (universalSections.length > 0) {
        sectionsByType[type] = universalSections;
      }
    }

    // If no additional sections required, just return the lecture
    if (Object.keys(sectionsByType).length === 0) {
      allCombinations.push([{
        course,
        selectedSection: lecture,
      }]);
    } else {
      // Generate Cartesian product of section types
      const sectionTypeArrays = Object.values(sectionsByType);
      
      // Skip if any section type has no options (means a required section is all full)
      if (sectionTypeArrays.some(arr => arr.length === 0)) {
        continue;
      }

      const sectionCombos = cartesianProduct(sectionTypeArrays);

      for (const sectionCombo of sectionCombos) {
        const courseSelection: SelectedCourse[] = [
          { course, selectedSection: lecture }
        ];

        for (const section of sectionCombo) {
          courseSelection.push({ course, selectedSection: section });
        }

        allCombinations.push(courseSelection);
      }
    }
  }

  return allCombinations;
}

/**
 * Check if new sections conflict with existing schedule
 * OPTIMIZATION: Uses memoization cache
 */
function hasConflictsWithSchedule(
  newSections: SelectedCourse[],
  existingSchedule: SelectedCourse[],
  cache: Map<string, boolean>
): boolean {
  for (const newCourse of newSections) {
    for (const existingCourse of existingSchedule) {
      // Create cache key
      const key1 = `${newCourse.course.courseCode}-${newCourse.selectedSection.sectionId}`;
      const key2 = `${existingCourse.course.courseCode}-${existingCourse.selectedSection.sectionId}`;
      const cacheKey = key1 < key2 ? `${key1}|${key2}` : `${key2}|${key1}`;

      // Check cache first
      if (cache.has(cacheKey)) {
        if (cache.get(cacheKey)) {
          return true; // Cached conflict
        }
        continue; // Cached no-conflict
      }

      // Check actual conflict
      const hasConflict = sectionsConflict(
        newCourse.selectedSection,
        existingCourse.selectedSection
      );

      cache.set(cacheKey, hasConflict);

      if (hasConflict) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if two sections have time conflicts
 */
function sectionsConflict(section1: Section, section2: Section): boolean {
  for (const slot1 of section1.timeSlots) {
    for (const slot2 of section2.timeSlots) {
      if (timeSlotsOverlap(slot1, slot2)) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// LEGACY COMBINATION GENERATION (Kept for reference, not used)
// ============================================================================

/**
 * Generates all possible combinations of sections across courses
 * For each course, we need to select one lecture and ALL required sections (tutorials, labs, etc.)
 * 
 * Supports complex courses with multiple section types:
 * - Lecture only: [LEC A]
 * - Lecture + Tutorial: [LEC A + TUT 1], [LEC A + TUT 2], etc.
 * - Lecture + Tutorial + Lab: [LEC A + TUT 1 + LAB 1], [LEC A + TUT 1 + LAB 2], etc.
 * 
 * NOTE: This function is no longer used - replaced by generateValidCombinationsWithPruning
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
 * Also adds seat availability score to all preferences
 */
function calculateScore(schedule: SelectedCourse[], preference: string): number {
  let preferenceScore = 0;
  
  switch (preference) {
    case 'shortBreaks':
      preferenceScore = scoreShortBreaks(schedule);
      break;
    case 'longBreaks':
      preferenceScore = scoreLongBreaks(schedule);
      break;
    case 'consistentStart':
      preferenceScore = scoreConsistentStart(schedule);
      break;
    case 'startLate':
      preferenceScore = scoreStartLate(schedule);
      break;
    case 'endEarly':
      preferenceScore = scoreEndEarly(schedule);
      break;
    case 'daysOff':
      preferenceScore = scoreDaysOff(schedule);
      break;
    default:
      preferenceScore = 0;
  }
  
  // Add seat availability score to all preferences
  const seatScore = calculateSeatAvailabilityScore(schedule);
  
  return preferenceScore + seatScore;
}

/**
 * Short Breaks: Minimize gaps between classes
 * Lower total gap = higher score
 * Also penalize number of gaps and time span on campus
 * Bonus for having free days (compact schedule on fewer days)
 */
function scoreShortBreaks(schedule: SelectedCourse[]): number {
  const daySchedules = groupByDay(schedule);
  let totalScore = 0;

  for (const [day, slots] of Object.entries(daySchedules)) {
    if (slots.length === 0) continue;

    const sorted = slots.sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    // Calculate total gap time for this day
    let dayGapTime = 0;
    let gapCount = 0;
    let longGapPenalty = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const endTime = timeToMinutes(sorted[i].endTime);
      const nextStartTime = timeToMinutes(sorted[i + 1].startTime);
      const gap = Math.max(0, nextStartTime - endTime);
      if (gap > 0) {
        dayGapTime += gap;
        gapCount++;
        // Extra penalty for very long gaps (>90 min) - these are really bad for "short breaks"
        if (gap > 90) {
          longGapPenalty += (gap - 90) * 100; // Severe penalty for gaps beyond 90 min (100 pts/min)
        }
      }
    }

    // Calculate time span on campus (first class start to last class end)
    const firstStart = timeToMinutes(sorted[0].startTime);
    const lastEnd = timeToMinutes(sorted[sorted.length - 1].endTime);
    const campusTimeSpan = lastEnd - firstStart;

    // Scoring (all penalties to subtract from base score)
    let dayScore = 10000;
    dayScore -= dayGapTime * 20; // Penalize total gap time (20 pts per minute)
    dayScore -= gapCount * 600; // Penalize number of gaps (600 pts per gap)
    dayScore -= campusTimeSpan * 2; // Penalize long time on campus (2 pts per minute)
    dayScore -= longGapPenalty; // Extra severe penalty for gaps > 90 minutes

    totalScore += Math.max(0, dayScore);
  }

  // Add bonus for free days with diminishing returns
  // 1st free day = 30000 pts (3x a perfect day!), 2nd = 8000 pts, 3rd+ = 2000 pts each
  // This STRONGLY encourages getting free days - worth sacrificing some seat availability
  const daysUsed = getUniqueDays(schedule);
  const freeDays = 5 - daysUsed.length;
  let freeDayBonus = 0;
  if (freeDays >= 1) freeDayBonus += 30000; // First free day - HUGE bonus!
  if (freeDays >= 2) freeDayBonus += 8000;  // Second free day
  if (freeDays >= 3) freeDayBonus += (freeDays - 2) * 2000; // Additional free days
  
  return totalScore + freeDayBonus;
}

/**
 * Long Breaks: Maximize number of breaks >= 60 minutes
 * More long breaks = higher score
 */
function scoreLongBreaks(schedule: SelectedCourse[]): number {
  const longBreakCount = countLongBreaks(schedule);
  return longBreakCount * 2000; // Each long break = 2000 points (increased weight)
}

/**
 * Consistent Start: Minimize variance in daily start times
 * Also minimize gaps between classes for compact schedules
 * Prefer later start times to avoid waking up early
 * Lower variance + fewer gaps + later start = higher score
 */
function scoreConsistentStart(schedule: SelectedCourse[]): number {
  const variance = calculateStartTimeVariance(schedule);
  
  // Calculate total gaps across all days
  const daySchedules = groupByDay(schedule);
  let totalGapTime = 0;
  
  for (const [day, slots] of Object.entries(daySchedules)) {
    if (slots.length === 0) continue;
    
    const sorted = slots.sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const endTime = timeToMinutes(sorted[i].endTime);
      const nextStartTime = timeToMinutes(sorted[i + 1].startTime);
      const gap = Math.max(0, nextStartTime - endTime);
      totalGapTime += gap;
    }
  }
  
  // Calculate average start time to prefer later starts
  const avgStartTime = calculateAverageStartTime(schedule);
  
  // Primary: consistent start times (50000 points for perfect consistency)
  // Secondary: minimize gaps (subtract 5 points per minute of gap)
  // Tertiary: prefer later start times (add 2 points per minute after 9am)
  // This ensures L2A (16:00) beats L2D (11:00) when consistency is equal
  const consistencyScore = 50000 / (1 + variance);
  const gapPenalty = totalGapTime * 5;
  const lateStartBonus = avgStartTime * 2; // Bonus for starting later
  
  return consistencyScore - gapPenalty + lateStartBonus;
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
  return freeDays * 10000; // Each free day = 10000 points (increased weight)
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
