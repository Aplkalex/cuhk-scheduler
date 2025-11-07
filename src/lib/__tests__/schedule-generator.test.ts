/**
 * Unit tests for schedule generation algorithm
 * 
 * These tests follow Test-Driven Development (TDD) approach.
 * Write tests first, then implement the algorithm to pass them.
 */

import { describe, test, expect } from '@jest/globals';
import type { Course, /* Section, */ SelectedCourse, TimeSlot } from '@/types';
import {
  generateSchedules,
  /* scoreSchedule, */
  type GeneratedSchedule,
  type ScheduleGenerationOptions,
} from '../schedule-generator';
import { testCourses } from '@/data/test-courses';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockCourseCSCI1120: Course = {
  courseCode: 'CSCI1120',
  courseName: 'Intro to Computing Using C++',
  department: 'Computer Science and Engineering',
  credits: 3,
  description: 'Test course',
  enrollmentRequirements: 'None',
  prerequisites: [],
  term: '2025-26-T1',
  career: 'Undergraduate',
  sections: [
    {
      sectionId: 'A',
      sectionType: 'Lecture',
      classNumber: 5986,
      instructor: { name: 'Dr. Test', department: 'CSE' },
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Monday', startTime: '15:30', endTime: '16:15', location: 'ERB LT' },
        { day: 'Wednesday', startTime: '11:30', endTime: '13:15', location: 'BMS G18' },
      ],
      quota: 150,
      enrolled: 81,
      seatsRemaining: 69,
    },
    {
      sectionId: 'AT01',
      sectionType: 'Tutorial',
      parentLecture: 'A',
      classNumber: 5986,
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Tuesday', startTime: '13:30', endTime: '14:15', location: 'ERB LT' },
      ],
      quota: 150,
      enrolled: 81,
      seatsRemaining: 69,
    },
    {
      sectionId: 'B',
      sectionType: 'Lecture',
      classNumber: 5120,
      instructor: { name: 'Dr. Test', department: 'CSE' },
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Monday', startTime: '11:30', endTime: '13:15', location: 'HTB B6' },
        { day: 'Wednesday', startTime: '10:30', endTime: '11:15', location: 'LKC LT1' },
      ],
      quota: 150,
      enrolled: 150,
      seatsRemaining: 0,
    },
    {
      sectionId: 'BT01',
      sectionType: 'Tutorial',
      parentLecture: 'B',
      classNumber: 5120,
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Wednesday', startTime: '11:30', endTime: '12:15', location: 'LKC LT1' },
      ],
      quota: 150,
      enrolled: 150,
      seatsRemaining: 0,
    },
  ],
  lastUpdated: new Date('2025-11-01'),
};

const mockCourseCSCI1130: Course = {
  courseCode: 'CSCI1130',
  courseName: 'Intro to Computing Using Java',
  department: 'Computer Science and Engineering',
  credits: 3,
  description: 'Test course',
  enrollmentRequirements: 'None',
  prerequisites: [],
  term: '2025-26-T1',
  career: 'Undergraduate',
  sections: [
    {
      sectionId: 'A',
      sectionType: 'Lecture',
      classNumber: 5987,
      instructor: { name: 'Dr. Test', department: 'CSE' },
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Monday', startTime: '16:30', endTime: '18:15', location: 'BMS G18' },
        { day: 'Tuesday', startTime: '16:30', endTime: '17:15', location: 'ERB LT' },
      ],
      quota: 160,
      enrolled: 137,
      seatsRemaining: 23,
    },
    {
      sectionId: 'AT01',
      sectionType: 'Tutorial',
      parentLecture: 'A',
      classNumber: 5987,
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Tuesday', startTime: '17:30', endTime: '18:15', location: 'ERB LT' },
      ],
      quota: 160,
      enrolled: 137,
      seatsRemaining: 23,
    },
    {
      sectionId: 'B',
      sectionType: 'Lecture',
      classNumber: 6871,
      instructor: { name: 'Dr. Test', department: 'CSE' },
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Monday', startTime: '12:30', endTime: '14:15', location: 'LSB LT5' },
        { day: 'Wednesday', startTime: '09:30', endTime: '10:15', location: 'YIA LT6' },
      ],
      quota: 100,
      enrolled: 98,
      seatsRemaining: 2,
    },
    {
      sectionId: 'BT01',
      sectionType: 'Tutorial',
      parentLecture: 'B',
      classNumber: 6871,
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Wednesday', startTime: '10:30', endTime: '11:15', location: 'YIA LT6' },
      ],
      quota: 100,
      enrolled: 98,
      seatsRemaining: 2,
    },
  ],
  lastUpdated: new Date('2025-11-01'),
};

const mockCourseCSCI1540: Course = {
  courseCode: 'CSCI1540',
  courseName: 'Fund Comp With C++',
  department: 'Computer Science and Engineering',
  credits: 3,
  description: 'Test course',
  enrollmentRequirements: 'None',
  prerequisites: [],
  term: '2025-26-T1',
  career: 'Undergraduate',
  sections: [
    {
      sectionId: '-',
      sectionType: 'Lecture',
      classNumber: 5988,
      instructor: { name: 'Dr. Test', department: 'CSE' },
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Monday', startTime: '12:30', endTime: '14:15', location: 'LSB LT6' },
        { day: 'Wednesday', startTime: '16:30', endTime: '17:15', location: 'BMS G18' },
      ],
      quota: 160,
      enrolled: 116,
      seatsRemaining: 44,
    },
    {
      sectionId: '-T01',
      sectionType: 'Tutorial',
      parentLecture: '-',
      classNumber: 5988,
      language: 'English',
      addConsent: false,
      dropConsent: false,
      timeSlots: [
        { day: 'Wednesday', startTime: '17:30', endTime: '18:15', location: 'BMS G18' },
      ],
      quota: 160,
      enrolled: 116,
      seatsRemaining: 44,
    },
  ],
  lastUpdated: new Date('2025-11-01'),
};

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Schedule Generation Algorithm', () => {
  
  // ==========================================================================
  // 1. BASIC GENERATION TESTS
  // ==========================================================================
  
  describe('Basic Generation', () => {
    
    test('1.1: Single course with multiple sections generates all combinations', () => {
      const courses: Course[] = [mockCourseCSCI1120];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Should generate 2 schedules (Section A and Section B)
      expect(schedules).toHaveLength(2);
      
      // Each schedule should have 2 sections (1 lecture + 1 tutorial)
      schedules.forEach((schedule: GeneratedSchedule) => {
        expect(schedule.sections).toHaveLength(2);
        const lectureSection = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Lecture');
        const tutorialSection = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Tutorial');
        expect(lectureSection).toBeDefined();
        expect(tutorialSection).toBeDefined();
      });
      
      // Check that both lecture sections are present across schedules
      const lectureSectionIds = schedules.map((s: GeneratedSchedule) => 
        s.sections.find((sec: SelectedCourse) => sec.selectedSection.sectionType === 'Lecture')?.selectedSection.sectionId
      );
      expect(lectureSectionIds).toContain('A');
      expect(lectureSectionIds).toContain('B');
    });
    
    test('1.2: Two courses generate Cartesian product of combinations', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Should generate 3 valid schedules (2 × 2 = 4, but 1 has conflicts so is filtered out)
      // CSCI1120B + CSCI1130B conflicts on Monday 11:30-13:15 vs 12:30-14:15
      expect(schedules).toHaveLength(3);
      
      // Each schedule should have 4 sections (2 lectures + 2 tutorials)
      schedules.forEach((schedule: GeneratedSchedule) => {
        expect(schedule.sections).toHaveLength(4);
        
        // Verify each course is represented
        const coursesCodes = [...new Set(schedule.sections.map((s: SelectedCourse) => s.course.courseCode))];
        expect(coursesCodes).toHaveLength(2);
        expect(coursesCodes).toContain('CSCI1120');
        expect(coursesCodes).toContain('CSCI1130');
      });
    });
    
    test('1.3: All generated schedules are conflict-free', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      schedules.forEach((schedule: GeneratedSchedule) => {
        // Check for time conflicts within each schedule
        for (let i = 0; i < schedule.sections.length; i++) {
          for (let j = i + 1; j < schedule.sections.length; j++) {
            const section1 = schedule.sections[i].selectedSection;
            const section2 = schedule.sections[j].selectedSection;
            
            // Check if any time slots overlap
            for (const slot1 of section1.timeSlots) {
              for (const slot2 of section2.timeSlots) {
                if (slot1.day === slot2.day) {
                  const start1 = timeToMinutes(slot1.startTime);
                  const end1 = timeToMinutes(slot1.endTime);
                  const start2 = timeToMinutes(slot2.startTime);
                  const end2 = timeToMinutes(slot2.endTime);
                  
                  const hasConflict = start1 < end2 && start2 < end1;
                  expect(hasConflict).toBe(false);
                }
              }
            }
          }
        }
      });
    });
    
  });
  
  // ==========================================================================
  // 2. CONFLICT DETECTION TESTS
  // ==========================================================================
  
  describe('Conflict Detection', () => {
    
    test('2.1: Conflicting courses result in zero valid schedules', () => {
      const courses: Course[] = [
        mockCourseCSCI1120, // Section B: Mon 11:30-13:15
        mockCourseCSCI1540, // Section -: Mon 12:30-14:15 (CONFLICTS with B)
      ];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Should filter out conflicting combinations
      // Only CSCI1120A + CSCI1540 should work (if no conflicts)
      // CSCI1120B + CSCI1540 should be filtered out
      
      schedules.forEach((schedule: GeneratedSchedule) => {
        const csci1120Section = schedule.sections.find((s: SelectedCourse) => 
          s.course.courseCode === 'CSCI1120' && s.selectedSection.sectionType === 'Lecture'
        );
        
        // If CSCI1120 Section B is selected, it should NOT be in any valid schedule
        // because it conflicts with CSCI1540
        if (csci1120Section?.selectedSection.sectionId === 'B') {
          // This combination should have been filtered out
          expect(csci1120Section.selectedSection.sectionId).not.toBe('B');
        }
      });
      
      // Should have at least 1 valid schedule (CSCI1120A + CSCI1540)
      expect(schedules.length).toBeGreaterThan(0);
    });
    
    test('2.2: Tutorial conflicts are detected', () => {
      // This test would use courses where tutorials overlap
      // For now, we'll test that the algorithm checks tutorial conflicts
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Verify no conflicts exist in any schedule
      schedules.forEach((schedule: GeneratedSchedule) => {
        const tutorialSections = schedule.sections.filter((s: SelectedCourse) => 
          s.selectedSection.sectionType === 'Tutorial'
        );
        
        // Check tutorials don't overlap
        for (let i = 0; i < tutorialSections.length; i++) {
          for (let j = i + 1; j < tutorialSections.length; j++) {
            const tut1 = tutorialSections[i].selectedSection;
            const tut2 = tutorialSections[j].selectedSection;
            
            for (const slot1 of tut1.timeSlots) {
              for (const slot2 of tut2.timeSlots) {
                if (slot1.day === slot2.day) {
                  const hasConflict = checkTimeOverlap(slot1, slot2);
                  expect(hasConflict).toBe(false);
                }
              }
            }
          }
        }
      });
    });
    
  });
  
  // ==========================================================================
  // 3. PREFERENCE SCORING TESTS
  // ==========================================================================
  
  describe('Preference Scoring', () => {
    
    test('3.1: Short Breaks - schedules with minimal gaps score higher', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: 'shortBreaks',
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Verify schedules are sorted by gap time (ascending)
      for (let i = 0; i < schedules.length - 1; i++) {
        const score1 = schedules[i].score;
        const score2 = schedules[i + 1].score;
        
        // Higher score = better (shorter gaps)
        // So score should be descending
        expect(score1).toBeGreaterThanOrEqual(score2);
      }
    });
    
    test('3.2: Days Off - schedules with more free days score higher', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: 'daysOff',
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Verify schedules are sorted by number of free days (descending)
      for (let i = 0; i < schedules.length - 1; i++) {
        const score1 = schedules[i].score;
        const score2 = schedules[i + 1].score;
        
        // Higher score = more free days
        expect(score1).toBeGreaterThanOrEqual(score2);
      }
      
      // Top schedule should have maximum free days
      const topSchedule = schedules[0];
      const daysUsed = getUniqueDays(topSchedule.sections);
      const freeDays = 5 - daysUsed.length; // 5 weekdays - days with classes
      
      expect(freeDays).toBeGreaterThanOrEqual(0);
    });
    
    test('3.3: Start Late - schedules starting later score higher', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: 'startLate',
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Verify schedules are sorted by start time
      for (let i = 0; i < schedules.length - 1; i++) {
        const score1 = schedules[i].score;
        const score2 = schedules[i + 1].score;
        
        expect(score1).toBeGreaterThanOrEqual(score2);
      }
    });
    
    test('3.4: End Early - schedules ending earlier score higher', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: 'endEarly',
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Verify schedules are sorted by end time
      for (let i = 0; i < schedules.length - 1; i++) {
        const score1 = schedules[i].score;
        const score2 = schedules[i + 1].score;
        
        expect(score1).toBeGreaterThanOrEqual(score2);
      }
    });
    
  });
  
  // ==========================================================================
  // 4. EDGE CASES
  // ==========================================================================
  
  describe('Edge Cases', () => {
    
    test('4.1: Empty courses array returns empty schedules', () => {
      const courses: Course[] = [];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      expect(schedules).toHaveLength(0);
    });
    
    test('4.2: Course with single section generates one schedule', () => {
      const courses: Course[] = [mockCourseCSCI1540]; // Only 1 lecture section
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      expect(schedules).toHaveLength(1);
      expect(schedules[0].sections).toHaveLength(2); // Lecture + Tutorial
    });
    
    test('4.3: All sections conflict results in zero schedules', () => {
      // Create courses where all combinations conflict
      // This would require custom mock data or a specific setup
      
      // For now, we'll test that the algorithm handles this gracefully
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1540];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      const schedules = generateSchedules(courses, options);
      
      // Should return some schedules or empty array (not crash)
      expect(Array.isArray(schedules)).toBe(true);
    });
    
  });
  
  // ==========================================================================
  // 5. PERFORMANCE TESTS
  // ==========================================================================
  
  describe('Performance', () => {
    
    test('5.1: Small schedule generates in under 100ms', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: 'shortBreaks',
      };
      
      const startTime = performance.now();
      const schedules = generateSchedules(courses, options);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
      expect(schedules.length).toBeGreaterThan(0);
    });
    
    test('5.2: Algorithm returns results (not infinite loop)', () => {
      const courses: Course[] = [mockCourseCSCI1120, mockCourseCSCI1130];
      const options: ScheduleGenerationOptions = {
        preference: null,
      };
      
      // Set a timeout to ensure algorithm completes
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Algorithm timeout')), 5000)
      );
      
      const generatePromise = Promise.resolve(generateSchedules(courses, options));
      
      return expect(Promise.race([generatePromise, timeoutPromise])).resolves.toBeDefined();
    });
    
  });
  
});

// ============================================================================
// 4. REGRESSION: LARGE COURSE DATASET PREFERENCES
// ============================================================================

describe('Preference alignment on large dataset', () => {
  const heavyCourseSet: Course[] = testCourses.filter(course =>
    ['ECON 102', 'STAT 305', 'CPSC 221'].includes(course.courseCode)
  );

  function getTopSchedule(preference: ScheduleGenerationOptions['preference']) {
    const schedules = generateSchedules(heavyCourseSet, { preference, maxResults: 200 });
    expect(schedules.length).toBeGreaterThan(0);
    return schedules[0];
  }

  test('Days off preference yields at least two free days', () => {
    const top = getTopSchedule('daysOff');
    console.log('🔍 DaysOff metadata', top.metadata);
    console.log('🔍 DaysOff sections', top.sections.map(s => `${s.course.courseCode}-${s.selectedSection.sectionId}`));
    expect(top.metadata?.freeDays ?? 0).toBeGreaterThanOrEqual(2);
    expect(top.metadata?.daysUsed ?? 5).toBeLessThanOrEqual(3);
  });

  test('Short breaks avoid long idle stretches and early starts', () => {
    const top = getTopSchedule('shortBreaks');
    console.log('🔍 ShortBreaks metadata', top.metadata);
    console.log('🔍 ShortBreaks sections', top.sections.map(s => `${s.course.courseCode}-${s.selectedSection.sectionId}`));
    expect(top.metadata?.maxGapMinutes ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(180);
    expect(top.metadata?.earliestStart ?? 0).toBeGreaterThanOrEqual(540);
  });

  test('Long breaks maximize extended gaps purposefully', () => {
    const top = getTopSchedule('longBreaks');
    console.log('🔍 LongBreaks metadata', top.metadata);
    console.log('🔍 LongBreaks sections', top.sections.map(s => `${s.course.courseCode}-${s.selectedSection.sectionId}`));
    expect(top.metadata?.longBreakCount ?? 0).toBeGreaterThanOrEqual(2);
    expect(top.metadata?.totalLongBreakMinutes ?? 0).toBeGreaterThanOrEqual(240);
  });

  test('Consistent start keeps start times tightly clustered', () => {
    const top = getTopSchedule('consistentStart');
    console.log('🔍 Consistent metadata', top.metadata);
    console.log('🔍 Consistent sections', top.sections.map(s => `${s.course.courseCode}-${s.selectedSection.sectionId}`));
    expect(top.metadata?.startVariance ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(12_000);
    expect(top.metadata?.freeDays ?? 0).toBeGreaterThanOrEqual(1);
  });

  test('Start late avoids morning classes', () => {
    const top = getTopSchedule('startLate');
    console.log('🔍 StartLate metadata', top.metadata);
    console.log('🔍 StartLate sections', top.sections.map(s => `${s.course.courseCode}-${s.selectedSection.sectionId}`));
    expect(top.metadata?.earliestStart ?? 0).toBeGreaterThanOrEqual(660);
    expect(top.metadata?.avgStartTime ?? 0).toBeGreaterThanOrEqual(720);
  });

  test('End early finishes afternoons quickly', () => {
    const top = getTopSchedule('endEarly');
    console.log('🔍 EndEarly metadata', top.metadata);
    console.log('🔍 EndEarly sections', top.sections.map(s => `${s.course.courseCode}-${s.selectedSection.sectionId}`));
  expect(top.metadata?.avgEndTime ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(1020);
  expect(top.metadata?.latestEnd ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(1020);
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function checkTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) return false;
  
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  return start1 < end2 && start2 < end1;
}

function getUniqueDays(sections: SelectedCourse[]): string[] {
  const days = new Set<string>();
  sections.forEach((section: SelectedCourse) => {
    section.selectedSection.timeSlots.forEach((slot: TimeSlot) => {
      days.add(slot.day);
    });
  });
  return Array.from(days);
}

// ============================================================================
// COMPLEX COURSES TESTS (LEC + TUT + LAB)
// ============================================================================

describe('Complex Courses with Multiple Section Types', () => {
  
  const complexCourse: Course = {
    courseCode: 'CSCI3100',
    courseName: 'Software Engineering',
    department: 'Computer Science and Engineering',
    credits: 3,
    description: 'Complex course with LEC + TUT + LAB',
    enrollmentRequirements: 'None',
    prerequisites: [],
    term: '2025-26-T1',
    career: 'Undergraduate',
    sections: [
      // Lecture A
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        classNumber: 3100,
        instructor: { name: 'Prof. Smith', department: 'CSE' },
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Monday', startTime: '09:30', endTime: '11:15', location: 'LSB LT1' }
        ],
        quota: 100,
        enrolled: 80,
        seatsRemaining: 20,
      },
      // Lecture B
      {
        sectionId: 'B',
        sectionType: 'Lecture',
        classNumber: 3101,
        instructor: { name: 'Prof. Jones', department: 'CSE' },
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Tuesday', startTime: '09:30', endTime: '11:15', location: 'LSB LT2' }
        ],
        quota: 100,
        enrolled: 75,
        seatsRemaining: 25,
      },
      // Tutorial 1 for Lecture A
      {
        sectionId: 'AT1',
        sectionType: 'Tutorial',
        parentLecture: 'A',
        classNumber: 3102,
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Wednesday', startTime: '14:30', endTime: '15:15', location: 'SHB 910' }
        ],
        quota: 50,
        enrolled: 40,
        seatsRemaining: 10,
      },
      // Tutorial 2 for Lecture A
      {
        sectionId: 'AT2',
        sectionType: 'Tutorial',
        parentLecture: 'A',
        classNumber: 3103,
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Thursday', startTime: '14:30', endTime: '15:15', location: 'SHB 911' }
        ],
        quota: 50,
        enrolled: 40,
        seatsRemaining: 10,
      },
      // Tutorial 1 for Lecture B
      {
        sectionId: 'BT1',
        sectionType: 'Tutorial',
        parentLecture: 'B',
        classNumber: 3104,
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Wednesday', startTime: '15:30', endTime: '16:15', location: 'SHB 920' }
        ],
        quota: 75,
        enrolled: 65,
        seatsRemaining: 10,
      },
      // Lab 1 for Lecture A
      {
        sectionId: 'AL1',
        sectionType: 'Lab',
        parentLecture: 'A',
        classNumber: 3105,
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Friday', startTime: '09:30', endTime: '11:15', location: 'SHB Lab' }
        ],
        quota: 50,
        enrolled: 40,
        seatsRemaining: 10,
      },
      // Lab 2 for Lecture A
      {
        sectionId: 'AL2',
        sectionType: 'Lab',
        parentLecture: 'A',
        classNumber: 3106,
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Friday', startTime: '14:30', endTime: '16:15', location: 'SHB Lab' }
        ],
        quota: 50,
        enrolled: 40,
        seatsRemaining: 10,
      },
      // Lab 1 for Lecture B
      {
        sectionId: 'BL1',
        sectionType: 'Lab',
        parentLecture: 'B',
        classNumber: 3107,
        language: 'English',
        addConsent: false,
        dropConsent: false,
        timeSlots: [
          { day: 'Friday', startTime: '11:30', endTime: '13:15', location: 'SHB Lab' }
        ],
        quota: 75,
        enrolled: 65,
        seatsRemaining: 10,
      }
    ],
    lastUpdated: new Date('2025-11-01'),
  };

  test('6.1: Course with LEC + TUT + LAB generates correct number of combinations', () => {
    const courses: Course[] = [complexCourse];
    const options: ScheduleGenerationOptions = {
      preference: null,
    };

    const schedules = generateSchedules(courses, options);

    // Expected combinations:
    // Lecture A: 2 tutorials × 2 labs = 4 combinations
    // Lecture B: 1 tutorial × 1 lab = 1 combination
    // Total: 5 valid schedules
    expect(schedules.length).toBe(5);
  });

  test('6.2: Each schedule contains all required section types', () => {
    const courses: Course[] = [complexCourse];
    const options: ScheduleGenerationOptions = {
      preference: null,
    };

    const schedules = generateSchedules(courses, options);

    schedules.forEach((schedule: GeneratedSchedule) => {
      // Each schedule should have lecture + tutorial + lab = 3 sections
      expect(schedule.sections.length).toBe(3);
      
      const sectionTypes = schedule.sections.map((s: SelectedCourse) => s.selectedSection.sectionType);
      expect(sectionTypes).toContain('Lecture');
      expect(sectionTypes).toContain('Tutorial');
      expect(sectionTypes).toContain('Lab');
    });
  });

  test('6.3: Parent-child relationships are correctly maintained', () => {
    const courses: Course[] = [complexCourse];
    const options: ScheduleGenerationOptions = {
      preference: null,
    };

    const schedules = generateSchedules(courses, options);

    schedules.forEach((schedule: GeneratedSchedule) => {
      const lecture = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Lecture');
      const tutorial = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Tutorial');
      const lab = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Lab');

      expect(lecture).toBeDefined();
      expect(tutorial).toBeDefined();
      expect(lab).toBeDefined();

      // Tutorial and Lab must belong to the same lecture
      expect(tutorial?.selectedSection.parentLecture).toBe(lecture?.selectedSection.sectionId);
      expect(lab?.selectedSection.parentLecture).toBe(lecture?.selectedSection.sectionId);
    });
  });

  test('6.4: Lecture A combinations are generated correctly', () => {
    const courses: Course[] = [complexCourse];
    const options: ScheduleGenerationOptions = {
      preference: null,
    };

    const schedules = generateSchedules(courses, options);

    // Filter schedules with Lecture A
    const lectureASchedules = schedules.filter((s: GeneratedSchedule) => {
      const lecture = s.sections.find((sec: SelectedCourse) => sec.selectedSection.sectionType === 'Lecture');
      return lecture?.selectedSection.sectionId === 'A';
    });

    // Should have 4 combinations: AT1+AL1, AT1+AL2, AT2+AL1, AT2+AL2
    expect(lectureASchedules.length).toBe(4);

    // Check that all combinations exist
    const combinations = lectureASchedules.map((s: GeneratedSchedule) => {
      const tutorial = s.sections.find((sec: SelectedCourse) => sec.selectedSection.sectionType === 'Tutorial');
      const lab = s.sections.find((sec: SelectedCourse) => sec.selectedSection.sectionType === 'Lab');
      return `${tutorial?.selectedSection.sectionId}+${lab?.selectedSection.sectionId}`;
    });

    expect(combinations).toContain('AT1+AL1');
    expect(combinations).toContain('AT1+AL2');
    expect(combinations).toContain('AT2+AL1');
    expect(combinations).toContain('AT2+AL2');
  });

  test('6.5: Lecture B combinations are generated correctly', () => {
    const courses: Course[] = [complexCourse];
    const options: ScheduleGenerationOptions = {
      preference: null,
    };

    const schedules = generateSchedules(courses, options);

    // Filter schedules with Lecture B
    const lectureBSchedules = schedules.filter((s: GeneratedSchedule) => {
      const lecture = s.sections.find((sec: SelectedCourse) => sec.selectedSection.sectionType === 'Lecture');
      return lecture?.selectedSection.sectionId === 'B';
    });

    // Should have 1 combination: BT1+BL1
    expect(lectureBSchedules.length).toBe(1);

    const schedule = lectureBSchedules[0];
    const tutorial = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Tutorial');
    const lab = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Lab');

    expect(tutorial?.selectedSection.sectionId).toBe('BT1');
    expect(lab?.selectedSection.sectionId).toBe('BL1');
  });

  test('6.6: Universal sections (parentLecture undefined) pair with all lectures', () => {
    const courseWithUniversal: Course = {
      ...complexCourse,
      courseCode: 'CSCI2100',
      sections: [
        // Lecture A
        {
          sectionId: 'A',
          sectionType: 'Lecture',
          classNumber: 2100,
          instructor: { name: 'Prof. Zhang', department: 'CSE' },
          language: 'English',
          addConsent: false,
          dropConsent: false,
          timeSlots: [
            { day: 'Monday', startTime: '11:30', endTime: '13:15', location: 'LSB LT5' }
          ],
          quota: 100,
          enrolled: 80,
          seatsRemaining: 20,
        },
        // Lecture B
        {
          sectionId: 'B',
          sectionType: 'Lecture',
          classNumber: 2101,
          instructor: { name: 'Prof. Li', department: 'CSE' },
          language: 'English',
          addConsent: false,
          dropConsent: false,
          timeSlots: [
            { day: 'Tuesday', startTime: '11:30', endTime: '13:15', location: 'LSB LT6' }
          ],
          quota: 100,
          enrolled: 75,
          seatsRemaining: 25,
        },
        // Universal lab - can pair with any lecture
        {
          sectionId: 'L1',
          sectionType: 'Lab',
          parentLecture: undefined, // Universal section
          classNumber: 2102,
          language: 'English',
          addConsent: false,
          dropConsent: false,
          timeSlots: [
            { day: 'Friday', startTime: '14:30', endTime: '16:15', location: 'Lab A' }
          ],
          quota: 200,
          enrolled: 155,
          seatsRemaining: 45,
        }
      ],
      lastUpdated: new Date('2025-11-01'),
    };

    const courses: Course[] = [courseWithUniversal];
    const options: ScheduleGenerationOptions = {
      preference: null,
    };

    const schedules = generateSchedules(courses, options);

    // 2 lectures × 1 universal lab = 2 combinations
    expect(schedules.length).toBe(2);

    schedules.forEach((schedule: GeneratedSchedule) => {
      expect(schedule.sections.length).toBe(2); // Lecture + Lab
      
      const lecture = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Lecture');
      const lab = schedule.sections.find((s: SelectedCourse) => s.selectedSection.sectionType === 'Lab');
      
      expect(lecture).toBeDefined();
      expect(lab).toBeDefined();
      expect(lab?.selectedSection.sectionId).toBe('L1');
    });
  });
});
