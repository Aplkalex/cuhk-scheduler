/**
 * Schedule Generation Algorithm
 * 
 * Generates all valid schedule combinations from selected courses,
 * filters out conflicts, and ranks by user preferences.
 */

import { Course, Section, SelectedCourse, TimeSlot, /* DayOfWeek */ } from '@/types';
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

export type ScheduleMetrics = {
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
  const preference = options.preference ?? null;

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
  const combinationTarget = Math.max(maxResults * 40, 4000);
  const validSchedules = generateValidCombinationsWithPruning(
    coursesWithFilteredSections,
    excludeFullSections,
    combinationTarget,
    preference // Generate more than needed to have good selection after scoring
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  maxResults: number,
  preference: ScheduleGenerationOptions['preference'] | null
): SelectedCourse[][] {
  const validSchedules: SelectedCourse[][] = [];
  const conflictCache = new Map<string, boolean>(); // Memoization for conflict checks
  const preferConsolidation = preference === 'daysOff' || preference === 'longBreaks' || preference === 'consistentStart';

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
  
  const sortedCourses = coursesWithAnalysis
    .sort((a, b) => {
      if (preferConsolidation) {
        const aMonOnly = a.hasMonWedFri && !a.hasTueThu;
        const bMonOnly = b.hasMonWedFri && !b.hasTueThu;
        if (aMonOnly !== bMonOnly) {
          return aMonOnly ? -1 : 1;
        }

        const aMixed = a.hasMonWedFri && a.hasTueThu;
        const bMixed = b.hasMonWedFri && b.hasTueThu;
        if (aMixed !== bMixed) {
          return aMixed ? -1 : 1;
        }

        const aTueOnly = a.hasTueThu && !a.hasMonWedFri;
        const bTueOnly = b.hasTueThu && !b.hasMonWedFri;
        if (aTueOnly !== bTueOnly) {
          return aTueOnly ? 1 : -1;
        }
      } else {
        const aTueOnly = a.hasTueThu && !a.hasMonWedFri;
        const bTueOnly = b.hasTueThu && !b.hasMonWedFri;
        if (aTueOnly !== bTueOnly) {
          return aTueOnly ? -1 : 1;
        }

        const aMixed = a.hasTueThu && a.hasMonWedFri;
        const bMixed = b.hasTueThu && b.hasMonWedFri;
        if (aMixed !== bMixed) {
          return aMixed ? -1 : 1;
        }
      }

      return a.course.courseCode.localeCompare(b.course.courseCode);
    })
    .map(item => item.course);
  
  console.log('📊 Course order for day separation:',
    sortedCourses.map((c) => {
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
    let courseCombinations = getCourseSectionCombinations(course, excludeFullSections, preference);
    
    // OPTIMIZATION: Sort combinations to prefer day consolidation
    // Calculate a "day consolidation score" that heavily favors:
    // 1. Perfect separation (no overlap) - creates free days
    // 2. Perfect consolidation (complete overlap) - maximizes compactness
    const currentDays = new Set(
      currentSchedule.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day))
    );
    const numCurrentDays = currentDays.size;

    if (courseIndex === 1 && numCurrentDays > 0) {
      console.log(`📅 After course ${courseIndex}, currently using ${numCurrentDays} days: ${[...currentDays].join(', ')}`);
    }

    courseCombinations = courseCombinations.sort((a, b) => {
      const aDays = new Set(a.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day)));
      const bDays = new Set(b.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day)));

      const aTotalDays = new Set([...currentDays, ...aDays]).size;
      const bTotalDays = new Set([...currentDays, ...bDays]).size;

      const aNewDays = [...aDays].filter(day => !currentDays.has(day)).length;
      const bNewDays = [...bDays].filter(day => !currentDays.has(day)).length;

      if (preferConsolidation) {
        if (aNewDays !== bNewDays) {
          return aNewDays - bNewDays;
        }
        if (aTotalDays !== bTotalDays) {
          return aTotalDays - bTotalDays;
        }
      } else {
        if (aTotalDays !== bTotalDays) {
          return aTotalDays - bTotalDays;
        }
      }

      const aSeats = a.reduce((sum, item) => sum + item.selectedSection.seatsRemaining, 0);
      const bSeats = b.reduce((sum, item) => sum + item.selectedSection.seatsRemaining, 0);

      if (preference === 'endEarly') {
        const aLatestEnd = Math.max(...a.flatMap(item => item.selectedSection.timeSlots.map(slot => timeToMinutes(slot.endTime))));
        const bLatestEnd = Math.max(...b.flatMap(item => item.selectedSection.timeSlots.map(slot => timeToMinutes(slot.endTime))));
        if (aLatestEnd !== bLatestEnd) {
          return aLatestEnd - bLatestEnd;
        }
      }

      if (preference === 'startLate') {
        const aEarliest = Math.min(...a.flatMap(item => item.selectedSection.timeSlots.map(slot => timeToMinutes(slot.startTime))));
        const bEarliest = Math.min(...b.flatMap(item => item.selectedSection.timeSlots.map(slot => timeToMinutes(slot.startTime))));
        if (aEarliest !== bEarliest) {
          return bEarliest - aEarliest;
        }
      }

      return bSeats - aSeats;
    });

    if (courseIndex === 1 && courseCombinations.length > 0) {
      const firstChoice = courseCombinations[0];
      const lecture = firstChoice.find(item => item.selectedSection.sectionType === 'Lecture');
      const days = new Set(firstChoice.flatMap(item => item.selectedSection.timeSlots.map(slot => slot.day)));
      console.log(`  ✅ Will try first: ${lecture?.course.courseCode} ${lecture?.selectedSection.sectionId} on ${[...days].join(',')}`);
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
  excludeFullSections: boolean,
  preference: ScheduleGenerationOptions['preference'] | null
): SelectedCourse[][] {
  let lectures = course.sections.filter(s => s.sectionType === 'Lecture');
  
  if (lectures.length === 0) {
    console.warn(`Course ${course.courseCode} has no lecture sections`);
    return [];
  }

  // OPTIMIZATION: Sort lectures to try those with better day patterns first
  // Prioritize based on preference: day consolidation-heavy preferences favour Mon/Wed/Fri blocks
  const preferConsolidation = preference === 'daysOff' || preference === 'longBreaks' || preference === 'consistentStart';
  lectures = lectures.sort((a, b) => {
    const aDays = new Set(a.timeSlots.map(slot => slot.day));
    const bDays = new Set(b.timeSlots.map(slot => slot.day));
    
    // Check if lecture is on Tue/Thu only (highly valuable for day consolidation)
    const aIsTueThu = aDays.has('Tuesday') || aDays.has('Thursday');
    const bIsTueThu = bDays.has('Tuesday') || bDays.has('Thursday');
    const aOnlyTueThu = aIsTueThu && !aDays.has('Monday') && !aDays.has('Wednesday') && !aDays.has('Friday');
    const bOnlyTueThu = bIsTueThu && !bDays.has('Monday') && !bDays.has('Wednesday') && !bDays.has('Friday');
    const aOnlyMonWedFri = (aDays.has('Monday') || aDays.has('Wednesday') || aDays.has('Friday')) && !aIsTueThu;
    const bOnlyMonWedFri = (bDays.has('Monday') || bDays.has('Wednesday') || bDays.has('Friday')) && !bIsTueThu;

    if (preferConsolidation) {
      if (aOnlyMonWedFri !== bOnlyMonWedFri) {
        return aOnlyMonWedFri ? -1 : 1;
      }
      if (aOnlyTueThu !== bOnlyTueThu) {
        return aOnlyTueThu ? 1 : -1;
      }
    } else {
      if (aOnlyTueThu && !bOnlyTueThu) return -1;
      if (!aOnlyTueThu && bOnlyTueThu) return 1;
    }
    
    if (preference === 'endEarly') {
      const aLatest = Math.max(...a.timeSlots.map(slot => timeToMinutes(slot.endTime)));
      const bLatest = Math.max(...b.timeSlots.map(slot => timeToMinutes(slot.endTime)));
      if (aLatest !== bLatest) {
        return aLatest - bLatest;
      }
    }

    if (preference === 'startLate') {
      const aEarliest = Math.min(...a.timeSlots.map(slot => timeToMinutes(slot.startTime)));
      const bEarliest = Math.min(...b.timeSlots.map(slot => timeToMinutes(slot.startTime)));
      if (aEarliest !== bEarliest) {
        return bEarliest - aEarliest;
      }
    }
    
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MINUTES_PER_DAY = 1440;

const BASE_WEIGHTS = {
  freeDays: 5_000_000,
  dayUsagePenalty: 200_000,
  totalGapPenalty: 8_000,
  maxGapPenalty: 6_000,
  campusSpanPenalty: 2_500,
  longBreakMinutesPenalty: 5_000,
  longBreakCountPenalty: 600_000,
};

function calculateBaseScore(metrics: ScheduleMetrics): number {
  const freeDayScore = metrics.freeDays * BASE_WEIGHTS.freeDays;
  const dayUsageScore = metrics.daysUsed * BASE_WEIGHTS.dayUsagePenalty;
  const gapPenalty = metrics.totalGapMinutes * BASE_WEIGHTS.totalGapPenalty;
  const longGapPenalty = metrics.maxGapMinutes * BASE_WEIGHTS.maxGapPenalty;
  const campusSpanPenalty = metrics.totalCampusSpan * BASE_WEIGHTS.campusSpanPenalty;
  const longBreakPenalty = metrics.totalLongBreakMinutes * BASE_WEIGHTS.longBreakMinutesPenalty;
  const longBreakCountPenalty = metrics.longBreakCount * BASE_WEIGHTS.longBreakCountPenalty;

  return (
    freeDayScore
    - dayUsageScore
    - gapPenalty
    - longGapPenalty
    - campusSpanPenalty
    - longBreakPenalty
    - longBreakCountPenalty
  );
}

/**
 * Calculates raw preference score using aggregated metrics.
 * Higher score should reflect better alignment with the desired preference.
 */
function calculatePreferenceScore(metrics: ScheduleMetrics, preference: string | null): number {
  const baseScore = calculateBaseScore(metrics);

  if (!preference) {
    return baseScore;
  }

  switch (preference) {
    case 'shortBreaks': {
      const neutralizedBase = baseScore
        - metrics.freeDays * BASE_WEIGHTS.freeDays
        + metrics.daysUsed * BASE_WEIGHTS.dayUsagePenalty;
      const gapRelief = metrics.totalGapMinutes * (BASE_WEIGHTS.totalGapPenalty - 3_000);
      const maxGapRelief = metrics.maxGapMinutes * (BASE_WEIGHTS.maxGapPenalty - 5_000);
      const spanPenalty = metrics.totalCampusSpan * 3_000;
      const earlyStartPenalty = Math.max(0, 600 - metrics.earliestStart) * 5_000;
      const midMorningReward = Math.max(0, 780 - metrics.avgStartTime) * 5_000;
      const freeDayPenalty = metrics.freeDays * 600_000;
      const dayUsagePenalty = Math.abs(metrics.daysUsed - 5) * 180_000;
      const shortGapPenalty = Math.max(0, 360 - metrics.totalGapMinutes) * 4_200;
      const maxGapShortfallPenalty = Math.max(0, 150 - metrics.maxGapMinutes) * 40_000;
      const lateStartPenalty = Math.max(0, metrics.avgStartTime - 675) * 16_000;
      const longGapReward = Math.max(0, metrics.maxGapMinutes - 150) * 8_000;
      const totalGapReward = Math.max(0, metrics.totalGapMinutes - 360) * 7_000;
      const lateFinishReward = Math.max(0, metrics.latestEnd - 1050) * 28_000;
      const longBreakReward = Math.max(0, metrics.longBreakCount - 2) * 160_000;
      const longBreakPenalty = Math.max(0, metrics.longBreakCount - 3) * 220_000;
      return (
        neutralizedBase
        + gapRelief
        + maxGapRelief
        + midMorningReward
        + longGapReward
        + totalGapReward
        + lateFinishReward
        + longBreakReward
        - spanPenalty
        - earlyStartPenalty
        - dayUsagePenalty
        - freeDayPenalty
        - shortGapPenalty
        - maxGapShortfallPenalty
        - lateStartPenalty
        - longBreakPenalty
      );
    }
    case 'longBreaks': {
      const neutralizedBase = baseScore
        - metrics.freeDays * BASE_WEIGHTS.freeDays
        + metrics.daysUsed * BASE_WEIGHTS.dayUsagePenalty
        + metrics.totalGapMinutes * BASE_WEIGHTS.totalGapPenalty
        + metrics.totalLongBreakMinutes * BASE_WEIGHTS.longBreakMinutesPenalty
        + metrics.longBreakCount * BASE_WEIGHTS.longBreakCountPenalty;
      const maxGapReward = metrics.maxGapMinutes * 7_500;
      const preferredWindowReward = Math.max(0, metrics.avgStartTime - 690) * 5_000;
      const earliestStartPenalty = Math.max(0, 720 - metrics.earliestStart) * 12_000;
      const managedLongBreakMinutes = Math.min(metrics.totalLongBreakMinutes, 360) * 6_800;
      const excessLongBreakPenalty = Math.max(0, metrics.totalLongBreakMinutes - 360) * 11_000;
      const longBreakCountReward = Math.min(metrics.longBreakCount, 3) * 350_000;
      const surplusLongBreakPenalty = Math.max(0, metrics.longBreakCount - 3) * 700_000;
      const gapSmoothingPenalty = Math.max(0, metrics.totalGapMinutes - 360) * 9_000;
      const freeDayAdjustment = metrics.freeDays >= 1
        ? 480_000 - Math.max(0, metrics.freeDays - 1) * 260_000
        : -720_000;
      const dayUsagePenalty = Math.max(0, metrics.daysUsed - 4) * 620_000;
      const latestEndPenalty = Math.max(0, metrics.latestEnd - 1110) * 65_000;
      const eveningWrapPenalty = Math.max(0, metrics.avgEndTime - 1065) * 4_000;
      return (
        neutralizedBase
        + managedLongBreakMinutes
        + preferredWindowReward
        + longBreakCountReward
        + maxGapReward
        + freeDayAdjustment
        - earliestStartPenalty
        - gapSmoothingPenalty
        - dayUsagePenalty
        - latestEndPenalty
        - eveningWrapPenalty
        - excessLongBreakPenalty
        - surplusLongBreakPenalty
        - metrics.totalCampusSpan * 800
      );
    }
    case 'consistentStart': {
      const neutralizedBase = baseScore
        - metrics.freeDays * BASE_WEIGHTS.freeDays
        + metrics.daysUsed * BASE_WEIGHTS.dayUsagePenalty
        + metrics.totalGapMinutes * BASE_WEIGHTS.totalGapPenalty
        + metrics.maxGapMinutes * BASE_WEIGHTS.maxGapPenalty;
      const variancePenalty = Math.log1p(metrics.startVariance) * 240_000;
      const anchorReward = Math.max(0, 840 - Math.abs(metrics.earliestStart - 720)) * 8_000;
      const cadenceReward = Math.max(0, 150 - Math.abs(metrics.avgStartTime - metrics.earliestStart)) * 3_200;
      const maxGapAlignment = Math.max(0, 180 - Math.abs(metrics.maxGapMinutes - 180)) * 35_000;
      const totalGapAlignment = Math.max(0, 360 - Math.abs(metrics.totalGapMinutes - 360)) * 9_000;
      const campusSpanRelief = Math.min(metrics.totalCampusSpan, 1_140) * 1_800;
      const freeDayBalance = metrics.freeDays >= 1 ? 420_000 : -600_000;
      const extraFreeDayPenalty = Math.max(0, metrics.freeDays - 1) * 360_000;
      const dayUsagePenalty = Math.abs(metrics.daysUsed - 4) * 300_000;
      const latestEndPenalty = Math.max(0, metrics.latestEnd - 1_110) * 60_000;
      const earlyAnchorPenalty = Math.max(0, 720 - metrics.earliestStart) * 22_000;
      const longBreakDeviationPenalty = Math.max(0, metrics.totalLongBreakMinutes - 360) * 7_000;
      return (
        neutralizedBase
        + anchorReward
        + cadenceReward
        + maxGapAlignment
        + totalGapAlignment
        + campusSpanRelief
        + freeDayBalance
        - variancePenalty
        - extraFreeDayPenalty
        - dayUsagePenalty
        - latestEndPenalty
        - earlyAnchorPenalty
        - longBreakDeviationPenalty
      );
    }
    case 'startLate': {
      const neutralizedBase = baseScore
        - metrics.freeDays * BASE_WEIGHTS.freeDays
        + metrics.daysUsed * BASE_WEIGHTS.dayUsagePenalty
        + metrics.totalGapMinutes * BASE_WEIGHTS.totalGapPenalty
        + metrics.maxGapMinutes * BASE_WEIGHTS.maxGapPenalty;
      const avgStartReward = Math.max(0, metrics.avgStartTime - 600) * 7_000;
      const lateMorningBoost = Math.max(0, metrics.avgStartTime - 720) * 12_000;
      const earliestStartReward = Math.max(0, metrics.earliestStart - 630) * 10_000;
      const morningPenalty = Math.max(0, 780 - metrics.earliestStart) * 26_000;
      const totalGapAlignment = Math.max(0, 240 - Math.abs(metrics.totalGapMinutes - 240)) * 8_000;
      const maxGapAlignment = Math.max(0, 120 - Math.abs(metrics.maxGapMinutes - 120)) * 18_000;
      const longBreakReward = Math.min(metrics.totalLongBreakMinutes, 300) * 5_000;
      const freeDayBalance = metrics.freeDays >= 1 ? 420_000 : -480_000;
      const variancePenalty = Math.log1p(metrics.startVariance) * 70_000;
      const dayUsagePenalty = Math.max(0, metrics.daysUsed - 4) * 650_000;
      const lateFinishPenalty = Math.max(0, metrics.latestEnd - 1_110) * 85_000;
      return (
        neutralizedBase
        + avgStartReward
        + lateMorningBoost
        + earliestStartReward
        - morningPenalty
        + totalGapAlignment
        + maxGapAlignment
        + longBreakReward
        + freeDayBalance
        - dayUsagePenalty
        - lateFinishPenalty
        - variancePenalty
        - metrics.totalCampusSpan * 2_000
      );
    }
    case 'endEarly': {
      const neutralizedBase = baseScore
        - metrics.freeDays * BASE_WEIGHTS.freeDays
        + metrics.daysUsed * BASE_WEIGHTS.dayUsagePenalty
        + metrics.totalGapMinutes * BASE_WEIGHTS.totalGapPenalty
        + metrics.maxGapMinutes * BASE_WEIGHTS.maxGapPenalty
        + metrics.totalCampusSpan * BASE_WEIGHTS.campusSpanPenalty
        + metrics.totalLongBreakMinutes * BASE_WEIGHTS.longBreakMinutesPenalty
        + metrics.longBreakCount * BASE_WEIGHTS.longBreakCountPenalty;
      const earlyWrapReward = Math.max(0, 1080 - metrics.latestEnd) * 90_000;
      const cutoffReward = Math.max(0, 1020 - metrics.latestEnd) * 240_000;
      const avgEndReward = Math.max(0, 1035 - metrics.avgEndTime) * 20_000;
      const totalGapHarmony = Math.max(0, 1080 - Math.abs(metrics.totalGapMinutes - 1080)) * 2_400;
      const longBreakMinutesReward = Math.min(metrics.totalLongBreakMinutes, 1_080) * 4_200;
      const longBreakCadenceReward = Math.min(metrics.longBreakCount, 6) * 240_000;
      const avgStartAlignment = Math.max(0, 660 - Math.abs(metrics.avgStartTime - 660)) * 7_000;
      const startVarianceReward = Math.sqrt(metrics.startVariance) * 15_000;
      const latePenalty = Math.max(0, metrics.latestEnd - 1020) * 300_000;
      const overflowGapPenalty = Math.max(0, metrics.totalGapMinutes - 1_320) * 4_000;
      const longBreakOverflowPenalty = Math.max(0, metrics.totalLongBreakMinutes - 1_080) * 5_000;
      const earlyStartPenalty = Math.max(0, 600 - metrics.avgStartTime) * 8_000;
      const lateStartPenalty = Math.max(0, metrics.avgStartTime - 660) * 5_000;
      const earlyAveragePenalty = Math.max(0, 660 - metrics.avgStartTime) * 6_000;
      const extraFreeDayBonus = metrics.freeDays * 120_000;
      return (
        neutralizedBase
        + earlyWrapReward
        + avgEndReward
        + cutoffReward
        + totalGapHarmony
        + longBreakMinutesReward
        + longBreakCadenceReward
        + avgStartAlignment
        + startVarianceReward
        - latePenalty
        - overflowGapPenalty
        - longBreakOverflowPenalty
        - earlyStartPenalty
        - lateStartPenalty
        - earlyAveragePenalty
        + extraFreeDayBonus
      );
    }
    case 'daysOff': {
      const neutralizedBase =
        baseScore
        + metrics.totalGapMinutes * BASE_WEIGHTS.totalGapPenalty
        + metrics.maxGapMinutes * BASE_WEIGHTS.maxGapPenalty
        + metrics.totalLongBreakMinutes * BASE_WEIGHTS.longBreakMinutesPenalty
  + metrics.longBreakCount * BASE_WEIGHTS.longBreakCountPenalty
  + metrics.totalCampusSpan * BASE_WEIGHTS.campusSpanPenalty;
      const freeDayBoost = metrics.freeDays * 7_000_000;
      const consolidationReward = Math.pow(Math.max(0, 5 - metrics.daysUsed), 2) * 1_200_000;
  const gentleGapPenalty = metrics.totalGapMinutes * 320;
      const earlyStartPenalty = Math.max(0, 540 - metrics.earliestStart) * 2_000;
      const lateFinishPenalty = Math.max(0, metrics.latestEnd - 1080) * 60_000;
      const lateAveragePenalty = Math.max(0, metrics.avgEndTime - 1080) * 8_000;
  const avgStartAlignment = Math.max(0, 120 - Math.abs(metrics.avgStartTime - 660)) * 9_000;
      const kickoffReward = Math.max(0, 660 - metrics.earliestStart) * 3_000;
  const longBreakPenalty = metrics.longBreakCount * 120_000;
  const longBreakMinutesPenalty = metrics.totalLongBreakMinutes * 120;
      return (
        neutralizedBase
        + freeDayBoost
        + consolidationReward
  + avgStartAlignment
        + kickoffReward
        - gentleGapPenalty
        - earlyStartPenalty
        - lateFinishPenalty
        - lateAveragePenalty
        - longBreakPenalty
        - longBreakMinutesPenalty
        - metrics.totalCampusSpan * 1_200
      );
    }
    default:
      return baseScore;
  }
}

export function getPreferenceScoreForMetrics(
  metrics: ScheduleMetrics,
  preference: ScheduleGenerationOptions['preference']
): number {
  return calculatePreferenceScore(metrics, preference ?? null);
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

  const preferenceTieBreak = compareByPreferenceMetrics(metricsA, metricsB, preference);
  if (preferenceTieBreak !== 0) {
    return preferenceTieBreak;
  }

  const universalTieBreak = compareUniversalPriorities(metricsA, metricsB, preference);
  if (universalTieBreak !== 0) {
    return universalTieBreak;
  }

  if (preference === 'shortBreaks') {
    const alignmentDiff = getShortBreakAlignmentScore(a.sections) - getShortBreakAlignmentScore(b.sections);
    if (alignmentDiff !== 0) {
      return alignmentDiff;
    }
  }

  const fingerprintA = a.sections
    .map(selection => `${selection.course.courseCode}-${selection.selectedSection.sectionId}`)
    .join('|');
  const fingerprintB = b.sections
    .map(selection => `${selection.course.courseCode}-${selection.selectedSection.sectionId}`)
    .join('|');

  return fingerprintA.localeCompare(fingerprintB);
}

const shortBreakAlignmentCache = new WeakMap<SelectedCourse[], number>();

function getShortBreakAlignmentScore(schedule: SelectedCourse[]): number {
  if (shortBreakAlignmentCache.has(schedule)) {
    return shortBreakAlignmentCache.get(schedule)!;
  }

  const score = computeShortBreakAlignmentScore(schedule);
  shortBreakAlignmentCache.set(schedule, score);
  return score;
}

function computeShortBreakAlignmentScore(schedule: SelectedCourse[]): number {
  const lectureSlotsByCourse = new Map<string, TimeSlot[]>();
  const supplementalSlots: Array<{ courseCode: string; slot: TimeSlot }> = [];

  for (const selection of schedule) {
    const { course, selectedSection } = selection;

    if (selectedSection.sectionType === 'Lecture') {
      const existing = lectureSlotsByCourse.get(course.courseCode) || [];
      lectureSlotsByCourse.set(course.courseCode, existing.concat(selectedSection.timeSlots));
      continue;
    }

    for (const slot of selectedSection.timeSlots) {
      supplementalSlots.push({ courseCode: course.courseCode, slot });
    }
  }

  let totalGap = 0;

  for (const { courseCode, slot } of supplementalSlots) {
    const lectureSlots = lectureSlotsByCourse.get(courseCode);
    if (!lectureSlots || lectureSlots.length === 0) {
      totalGap += 720;
      continue;
    }

    let bestGap = Number.POSITIVE_INFINITY;

    for (const lectureSlot of lectureSlots) {
      if (lectureSlot.day !== slot.day) {
        continue;
      }

      const lectureStart = timeToMinutes(lectureSlot.startTime);
      const lectureEnd = timeToMinutes(lectureSlot.endTime);
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);

      if (slotStart >= lectureEnd) {
        bestGap = Math.min(bestGap, slotStart - lectureEnd);
      } else if (lectureStart >= slotEnd) {
        bestGap = Math.min(bestGap, lectureStart - slotEnd);
      } else {
        bestGap = 0;
        break;
      }
    }

    if (!Number.isFinite(bestGap)) {
      totalGap += 720;
    } else {
      totalGap += bestGap;
    }
  }

  return totalGap;
}

function compareByPreferenceMetrics(
  metricsA: ScheduleMetrics,
  metricsB: ScheduleMetrics,
  preference: ScheduleGenerationOptions['preference']
): number {
  switch (preference) {
    case 'daysOff': {
      if (metricsB.freeDays !== metricsA.freeDays) {
        return metricsB.freeDays - metricsA.freeDays;
      }
      if (metricsA.daysUsed !== metricsB.daysUsed) {
        return metricsA.daysUsed - metricsB.daysUsed;
      }
      if (metricsA.totalGapMinutes !== metricsB.totalGapMinutes) {
        return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
      }
      return metricsA.avgEndTime - metricsB.avgEndTime;
    }
    case 'shortBreaks': {
      if (metricsA.totalGapMinutes !== metricsB.totalGapMinutes) {
        return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
      }
      if (metricsA.maxGapMinutes !== metricsB.maxGapMinutes) {
        return metricsA.maxGapMinutes - metricsB.maxGapMinutes;
      }
      return metricsA.totalCampusSpan - metricsB.totalCampusSpan;
    }
    case 'longBreaks': {
      if (metricsB.totalLongBreakMinutes !== metricsA.totalLongBreakMinutes) {
        return metricsB.totalLongBreakMinutes - metricsA.totalLongBreakMinutes;
      }
      if (metricsB.longBreakCount !== metricsA.longBreakCount) {
        return metricsB.longBreakCount - metricsA.longBreakCount;
      }
      return metricsB.totalGapMinutes - metricsA.totalGapMinutes;
    }
    case 'consistentStart': {
      if (metricsA.startVariance !== metricsB.startVariance) {
        return metricsA.startVariance - metricsB.startVariance;
      }
      if (metricsA.avgStartTime !== metricsB.avgStartTime) {
        return metricsA.avgStartTime - metricsB.avgStartTime;
      }
      return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
    }
    case 'startLate': {
      if (metricsB.earliestStart !== metricsA.earliestStart) {
        return metricsB.earliestStart - metricsA.earliestStart;
      }
      if (metricsB.avgStartTime !== metricsA.avgStartTime) {
        return metricsB.avgStartTime - metricsA.avgStartTime;
      }
      return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
    }
    case 'endEarly': {
      if (metricsA.latestEnd !== metricsB.latestEnd) {
        return metricsA.latestEnd - metricsB.latestEnd;
      }
      if (metricsA.avgEndTime !== metricsB.avgEndTime) {
        return metricsA.avgEndTime - metricsB.avgEndTime;
      }
      return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
    }
    default:
      return 0;
  }
}

function compareUniversalPriorities(
  metricsA: ScheduleMetrics,
  metricsB: ScheduleMetrics,
  preference: ScheduleGenerationOptions['preference']
): number {
  if (metricsB.freeDays !== metricsA.freeDays) {
    return metricsB.freeDays - metricsA.freeDays;
  }

  if (preference === 'longBreaks') {
    if (metricsB.longBreakCount !== metricsA.longBreakCount) {
      return metricsB.longBreakCount - metricsA.longBreakCount;
    }
    if (metricsB.totalLongBreakMinutes !== metricsA.totalLongBreakMinutes) {
      return metricsB.totalLongBreakMinutes - metricsA.totalLongBreakMinutes;
    }
    if (metricsB.totalGapMinutes !== metricsA.totalGapMinutes) {
      return metricsB.totalGapMinutes - metricsA.totalGapMinutes;
    }
    if (metricsB.totalCampusSpan !== metricsA.totalCampusSpan) {
      return metricsB.totalCampusSpan - metricsA.totalCampusSpan;
    }
  } else {
    if (metricsA.longBreakCount !== metricsB.longBreakCount) {
      return metricsA.longBreakCount - metricsB.longBreakCount;
    }
    if (metricsA.totalLongBreakMinutes !== metricsB.totalLongBreakMinutes) {
      return metricsA.totalLongBreakMinutes - metricsB.totalLongBreakMinutes;
    }
    if (metricsA.maxGapMinutes !== metricsB.maxGapMinutes) {
      return metricsA.maxGapMinutes - metricsB.maxGapMinutes;
    }
    if (metricsA.totalGapMinutes !== metricsB.totalGapMinutes) {
      return metricsA.totalGapMinutes - metricsB.totalGapMinutes;
    }
    if (metricsA.totalCampusSpan !== metricsB.totalCampusSpan) {
      return metricsA.totalCampusSpan - metricsB.totalCampusSpan;
    }
  }

  if (metricsB.earliestStart !== metricsA.earliestStart) {
    return metricsB.earliestStart - metricsA.earliestStart;
  }

  if (metricsA.latestEnd !== metricsB.latestEnd) {
    return metricsA.latestEnd - metricsB.latestEnd;
  }

  if (metricsA.startVariance !== metricsB.startVariance) {
    return metricsA.startVariance - metricsB.startVariance;
  }

  if (metricsB.avgStartTime !== metricsA.avgStartTime) {
    return metricsB.avgStartTime - metricsA.avgStartTime;
  }

  if (metricsA.avgEndTime !== metricsB.avgEndTime) {
    return metricsA.avgEndTime - metricsB.avgEndTime;
  }

  if (metricsA.gapCount !== metricsB.gapCount) {
    return metricsA.gapCount - metricsB.gapCount;
  }

  return 0;
}

/**
 * Calculate aggregated metrics required for ranking schedules
 */
export function calculateScheduleMetrics(schedule: SelectedCourse[]): ScheduleMetrics {
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
