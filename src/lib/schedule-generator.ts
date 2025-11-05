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

export type ScheduleMetadata = {
  totalGapMinutes: number;
  gapCount: number;
  maxGapMinutes: number;
  totalCampusSpan: number;
  daysUsed: number;
  freeDays: number;
  avgStartTime: number;
  avgEndTime: number;
  startVariance: number;
  longBreakCount: number;
  totalLongBreakMinutes: number;
  earliestStart: number;
  latestEnd: number;
  seatScore: number;
  preferenceScore: number;
};

export type GeneratedSchedule = {
  sections: SelectedCourse[];
  score: number;
  metadata?: ScheduleMetadata;
};

type ScheduleMetrics = {
  totalGapMinutes: number;
  gapCount: number;
  maxGapMinutes: number;
  totalCampusSpan: number;
  daysUsed: number;
  freeDays: number;
  avgStartTime: number;
  avgEndTime: number;
  startVariance: number;
  longBreakCount: number;
  totalLongBreakMinutes: number;
  earliestStart: number;
  latestEnd: number;
};

type EvaluatedSchedule = {
  sections: SelectedCourse[];
  preferenceScore: number;
  seatScore: number;
  metrics: ScheduleMetrics;
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
  const combinationTarget = Math.max(maxResults * 20, 2000);
  const validSchedules = generateValidCombinationsWithPruning(
    coursesWithFilteredSections,
    excludeFullSections,
    combinationTarget // Generate more than needed to have good selection after scoring
  );
  console.timeEnd('⏱️ Combination generation with pruning');

  console.log(`✅ Generated ${validSchedules.length} valid schedules (after pruning)`);

  // Step 3: Evaluate schedules with aggregated metrics and scores
  console.time('⏱️ Evaluation');
  const evaluatedSchedules: EvaluatedSchedule[] = validSchedules.map(sections => {
    const metrics = calculateScheduleMetrics(sections);
    const preferenceScore = calculatePreferenceScore(metrics, options.preference ?? null);
    const seatScore = calculateSeatAvailabilityScore(sections);

    return {
      sections,
      preferenceScore,
      seatScore,
      metrics,
    };
  });
  console.timeEnd('⏱️ Evaluation');

  // Step 4: Sort lexicographically using preference-aware comparator
  console.time('⏱️ Sorting');
  evaluatedSchedules.sort((a, b) => compareEvaluatedSchedules(a, b, options.preference ?? null));
  console.timeEnd('⏱️ Sorting');

  // Step 5: Slice top N and expose metadata for UI
  const topEvaluated = evaluatedSchedules.slice(0, maxResults);

  const topSchedules: GeneratedSchedule[] = topEvaluated.map(item => ({
    sections: item.sections,
    score: item.preferenceScore,
    metadata: {
      ...item.metrics,
      seatScore: item.seatScore,
      preferenceScore: item.preferenceScore,
    },
  }));

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
 * Calculates raw preference score using aggregated metrics.
 * Higher score should reflect better alignment with the desired preference.
 */
function calculatePreferenceScore(metrics: ScheduleMetrics, preference: string | null): number {
  if (!preference) {
    return metrics.freeDays * 1_000 - metrics.totalGapMinutes * 10;
  }

  switch (preference) {
    case 'shortBreaks': {
      const freeDayBoost = metrics.freeDays * 120_000;
      const gapPenalty = metrics.totalGapMinutes * 1_000;
      const maxGapPenalty = metrics.maxGapMinutes * 250;
      const daySpanPenalty = metrics.totalCampusSpan * 120;
      const earlyStartPenalty = Math.max(0, 600 - metrics.earliestStart) * 300;
      return (
        freeDayBoost
        - gapPenalty
        - maxGapPenalty
        - daySpanPenalty
        - earlyStartPenalty
        + metrics.avgStartTime * 150
      );
    }
    case 'longBreaks': {
      const longBreakReward = metrics.longBreakCount * 400_000 + metrics.totalLongBreakMinutes * 1_200;
      const consolidationPenalty = metrics.totalGapMinutes * 400;
      const spreadPenalty = metrics.totalCampusSpan * 80;
      return (
        longBreakReward
        - consolidationPenalty
        - spreadPenalty
        + metrics.freeDays * 50_000
      );
    }
    case 'consistentStart': {
      const variancePenalty = metrics.startVariance * 4_000;
      const peakWindow = Math.abs(metrics.avgStartTime - 720) * 150; // prefer around noon start
      const freeDayBoost = metrics.freeDays * 80_000;
      const gapPenalty = metrics.totalGapMinutes * 300;
      return (
        2_000_000
        - variancePenalty
        - peakWindow
        - gapPenalty
        - metrics.maxGapMinutes * 120
        + freeDayBoost
      );
    }
    case 'startLate': {
      const lateStartReward = metrics.avgStartTime * 700 + metrics.earliestStart * 500;
      const freeDayBoost = metrics.freeDays * 90_000;
      const morningPenalty = Math.max(0, 660 - metrics.earliestStart) * 400;
      return (
        lateStartReward
        + freeDayBoost
        - metrics.totalGapMinutes * 220
        - morningPenalty
        - metrics.totalCampusSpan * 90
      );
    }
    case 'endEarly': {
      const earlyEndReward = (1440 - metrics.avgEndTime) * 500 + (1440 - metrics.latestEnd) * 500;
      const finishBonus = Math.max(0, 1020 - metrics.latestEnd) * 800;
      const freeDayBoost = metrics.freeDays * 120_000;
      const extraDayPenalty = Math.max(0, metrics.daysUsed - 4) * 180_000;
      const latestPenalty = Math.max(0, metrics.latestEnd - 1020) * 10_000;
      const avgPenalty = Math.max(0, metrics.avgEndTime - 990) * 3_000;
      const maxGapPenalty = Math.max(0, metrics.maxGapMinutes - 180) * 600;
      return (
        earlyEndReward
        + finishBonus
        + freeDayBoost
        - metrics.totalGapMinutes * 180
        - metrics.totalCampusSpan * 90
        - latestPenalty
        - avgPenalty
        - maxGapPenalty
        - extraDayPenalty
      );
    }
    case 'daysOff': {
      const freeDayReward = metrics.freeDays * 1_200_000;
      const dayUsagePenalty = metrics.daysUsed * 200_000;
      const spreadPenalty = metrics.totalCampusSpan * 200;
      const startPenalty = Math.max(0, 600 - metrics.earliestStart) * 200;
      return (
        freeDayReward
        - dayUsagePenalty
        - spreadPenalty
        - metrics.totalGapMinutes * 500
        - startPenalty
        + (1440 - metrics.avgEndTime) * 120
      );
    }
    default:
      return metrics.freeDays * 1_000 - metrics.totalGapMinutes * 10;
  }
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
      // Each section with available seats = moderate bonus points
      score += 120;
    }
  }

  // Additional bonus if ALL sections have available seats
  if (availableSections === totalSections && totalSections > 0) {
    score += 600; // Modest bonus for fully available schedules
  }

  return score;
}

function compareEvaluatedSchedules(
  a: EvaluatedSchedule,
  b: EvaluatedSchedule,
  preference: ScheduleGenerationOptions['preference']
): number {
  if (b.preferenceScore !== a.preferenceScore) {
    return b.preferenceScore - a.preferenceScore;
  }

  if (b.seatScore !== a.seatScore) {
    return b.seatScore - a.seatScore;
  }

  const metricsA = a.metrics;
  const metricsB = b.metrics;

  switch (preference) {
    case 'daysOff':
      if (metricsB.freeDays !== metricsA.freeDays) {
        return metricsB.freeDays - metricsA.freeDays;
      }
      if (metricsA.daysUsed !== metricsB.daysUsed) {
        return metricsA.daysUsed - metricsB.daysUsed;
      }
      if (metricsA.avgEndTime !== metricsB.avgEndTime) {
        return metricsA.avgEndTime - metricsB.avgEndTime;
      }
      break;
    case 'shortBreaks':
      if (metricsA.totalGapMinutes !== metricsB.totalGapMinutes) {
        return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
      }
      if (metricsA.maxGapMinutes !== metricsB.maxGapMinutes) {
        return metricsA.maxGapMinutes - metricsB.maxGapMinutes;
      }
      if (metricsB.freeDays !== metricsA.freeDays) {
        return metricsB.freeDays - metricsA.freeDays;
      }
      if (metricsB.avgStartTime !== metricsA.avgStartTime) {
        return metricsB.avgStartTime - metricsA.avgStartTime;
      }
      break;
    case 'longBreaks':
      if (metricsB.totalLongBreakMinutes !== metricsA.totalLongBreakMinutes) {
        return metricsB.totalLongBreakMinutes - metricsA.totalLongBreakMinutes;
      }
      if (metricsB.longBreakCount !== metricsA.longBreakCount) {
        return metricsB.longBreakCount - metricsA.longBreakCount;
      }
      if (metricsB.freeDays !== metricsA.freeDays) {
        return metricsB.freeDays - metricsA.freeDays;
      }
      break;
    case 'consistentStart':
      if (metricsA.startVariance !== metricsB.startVariance) {
        return metricsA.startVariance - metricsB.startVariance;
      }
      if (metricsA.avgStartTime !== metricsB.avgStartTime) {
        return metricsA.avgStartTime - metricsB.avgStartTime;
      }
      if (metricsB.freeDays !== metricsA.freeDays) {
        return metricsB.freeDays - metricsA.freeDays;
      }
      break;
    case 'startLate':
      if (metricsB.avgStartTime !== metricsA.avgStartTime) {
        return metricsB.avgStartTime - metricsA.avgStartTime;
      }
      if (metricsB.earliestStart !== metricsA.earliestStart) {
        return metricsB.earliestStart - metricsA.earliestStart;
      }
      if (metricsB.freeDays !== metricsA.freeDays) {
        return metricsB.freeDays - metricsA.freeDays;
      }
      break;
    case 'endEarly':
      if (metricsA.latestEnd !== metricsB.latestEnd) {
        return metricsA.latestEnd - metricsB.latestEnd;
      }
      if (metricsA.avgEndTime !== metricsB.avgEndTime) {
        return metricsA.avgEndTime - metricsB.avgEndTime;
      }
      if (metricsA.maxGapMinutes !== metricsB.maxGapMinutes) {
        return metricsA.maxGapMinutes - metricsB.maxGapMinutes;
      }
      if (metricsB.freeDays !== metricsA.freeDays) {
        return metricsB.freeDays - metricsA.freeDays;
      }
      break;
    default:
      break;
  }

  if (metricsB.freeDays !== metricsA.freeDays) {
    return metricsB.freeDays - metricsA.freeDays;
  }

  if (metricsA.totalGapMinutes !== metricsB.totalGapMinutes) {
    return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
  }

  if (metricsA.daysUsed !== metricsB.daysUsed) {
    return metricsA.daysUsed - metricsB.daysUsed;
  }

  if (metricsA.avgStartTime !== metricsB.avgStartTime) {
    return metricsA.avgStartTime - metricsB.avgStartTime;
  }

  const fingerprintA = a.sections
    .map(selection => `${selection.course.courseCode}-${selection.selectedSection.sectionId}`)
    .join('|');
  const fingerprintB = b.sections
    .map(selection => `${selection.course.courseCode}-${selection.selectedSection.sectionId}`)
    .join('|');

  return fingerprintA.localeCompare(fingerprintB);
}

/**
 * Calculate aggregated metrics required for ranking schedules
 */
function calculateScheduleMetrics(schedule: SelectedCourse[]): ScheduleMetrics {
  const daySchedules = groupByDay(schedule);
  let totalGapMinutes = 0;
  let gapCount = 0;
  let maxGapMinutes = 0;
  let totalCampusSpan = 0;
  let longBreakCount = 0;
  let totalLongBreakMinutes = 0;
  let earliestStart = Infinity;
  let latestEnd = -Infinity;

  const dayStarts: number[] = [];
  const dayEnds: number[] = [];

  for (const slots of Object.values(daySchedules)) {
    if (slots.length === 0) {
      continue;
    }

    const sorted = [...slots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const dayStart = timeToMinutes(sorted[0].startTime);
    const dayEnd = timeToMinutes(sorted[sorted.length - 1].endTime);

    dayStarts.push(dayStart);
    dayEnds.push(dayEnd);

    earliestStart = Math.min(earliestStart, dayStart);
    latestEnd = Math.max(latestEnd, dayEnd);

    totalCampusSpan += Math.max(0, dayEnd - dayStart);

    for (let i = 0; i < sorted.length - 1; i++) {
      const endTime = timeToMinutes(sorted[i].endTime);
      const nextStartTime = timeToMinutes(sorted[i + 1].startTime);
      const gap = Math.max(0, nextStartTime - endTime);

      if (gap > 0) {
        totalGapMinutes += gap;
        gapCount += 1;
        maxGapMinutes = Math.max(maxGapMinutes, gap);

        if (gap >= 60) {
          longBreakCount += 1;
          totalLongBreakMinutes += gap;
        }
      }
    }
  }

  const daysUsed = dayStarts.length;
  const freeDays = Math.max(0, 5 - daysUsed);

  const sumStarts = dayStarts.reduce((acc, val) => acc + val, 0);
  const sumEnds = dayEnds.reduce((acc, val) => acc + val, 0);

  const avgStartTime = daysUsed > 0 ? sumStarts / daysUsed : 0;
  const avgEndTime = daysUsed > 0 ? sumEnds / daysUsed : 0;

  let startVariance = 0;
  if (daysUsed > 0) {
    startVariance = dayStarts.reduce((acc, val) => acc + Math.pow(val - avgStartTime, 2), 0) / daysUsed;
  }

  if (!Number.isFinite(earliestStart)) {
    earliestStart = 0;
  }
  if (!Number.isFinite(latestEnd)) {
    latestEnd = 0;
  }

  return {
    totalGapMinutes,
    gapCount,
    maxGapMinutes,
    totalCampusSpan,
    daysUsed,
    freeDays,
    avgStartTime,
    avgEndTime,
    startVariance,
    longBreakCount,
    totalLongBreakMinutes,
    earliestStart,
    latestEnd,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================


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

// ============================================================================
// EXPORTS
// ============================================================================

export { scoreSchedule };

/**
 * Score a single schedule (used by tests)
 */
function scoreSchedule(schedule: GeneratedSchedule, preference: string): number {
  const metrics = calculateScheduleMetrics(schedule.sections);
  return calculatePreferenceScore(metrics, preference);
}
