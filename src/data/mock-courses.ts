import { Course } from '@/types';

/**
 * Mock course data for development and testing
 * Based on typical CUHK courses
 */
export const mockCourses: Course[] = [
  {
    courseCode: 'CSCI3100',
    courseName: 'Software Engineering',
    department: 'Computer Science and Engineering',
    credits: 3,
    description: 'This course introduces the theory and practice of software engineering. Topics include software process models, requirements analysis, design patterns, testing, and project management.',
    prerequisites: ['CSCI2100'],
    term: '2025-26 Term 1',
    career: 'Undergraduate',
    sections: [
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        instructor: {
          name: 'Prof. CHAN Tai Man',
          department: 'CSE',
        },
        timeSlots: [
          {
            day: 'Monday',
            startTime: '14:30',
            endTime: '16:15',
            location: 'LSB LT1',
          },
          {
            day: 'Wednesday',
            startTime: '14:30',
            endTime: '16:15',
            location: 'LSB LT1',
          },
        ],
        quota: 120,
        enrolled: 105,
        seatsRemaining: 15,
      },
      {
        sectionId: 'T1',
        sectionType: 'Tutorial',
        timeSlots: [
          {
            day: 'Friday',
            startTime: '09:30',
            endTime: '10:15',
            location: 'SHB 833',
          },
        ],
        quota: 40,
        enrolled: 35,
        seatsRemaining: 5,
      },
      {
        sectionId: 'T2',
        sectionType: 'Tutorial',
        timeSlots: [
          {
            day: 'Friday',
            startTime: '10:30',
            endTime: '11:15',
            location: 'SHB 833',
          },
        ],
        quota: 40,
        enrolled: 38,
        seatsRemaining: 2,
      },
    ],
    lastUpdated: new Date('2025-11-01'),
  },
  {
    courseCode: 'MATH2050',
    courseName: 'Mathematical Analysis I',
    department: 'Mathematics',
    credits: 3,
    description: 'Rigorous treatment of basic calculus. Topics include real numbers, sequences, limits, continuity, differentiation, and integration.',
    term: '2025-26 Term 1',
    career: 'Undergraduate',
    sections: [
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        instructor: {
          name: 'Prof. WONG Siu Kei',
          department: 'MATH',
        },
        timeSlots: [
          {
            day: 'Tuesday',
            startTime: '10:30',
            endTime: '12:15',
            location: 'LSB LT2',
          },
          {
            day: 'Thursday',
            startTime: '10:30',
            endTime: '12:15',
            location: 'LSB LT2',
          },
        ],
        quota: 80,
        enrolled: 72,
        seatsRemaining: 8,
      },
    ],
    lastUpdated: new Date('2025-11-01'),
  },
  {
    courseCode: 'ENGG2780',
    courseName: 'Statistics for Engineers',
    department: 'Engineering',
    credits: 3,
    description: 'Introduction to probability and statistics with engineering applications.',
    term: '2025-26 Term 1',
    career: 'Undergraduate',
    sections: [
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        instructor: {
          name: 'Prof. LEE Ming',
          department: 'ENGG',
        },
        timeSlots: [
          {
            day: 'Monday',
            startTime: '16:30',
            endTime: '18:15',
            location: 'ERB 404',
          },
          {
            day: 'Wednesday',
            startTime: '16:30',
            endTime: '18:15',
            location: 'ERB 404',
          },
        ],
        quota: 100,
        enrolled: 85,
        seatsRemaining: 15,
      },
    ],
    lastUpdated: new Date('2025-11-01'),
  },
  {
    courseCode: 'UGEB1492',
    courseName: 'Data Explosion: from Big Bang to Big Data',
    department: 'General Education',
    credits: 3,
    description: 'An introduction to the concept of data and its role in modern society.',
    term: '2025-26 Term 1',
    career: 'Undergraduate',
    sections: [
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        instructor: {
          name: 'Prof. CHEUNG Ka Lok',
          department: 'GE',
        },
        timeSlots: [
          {
            day: 'Tuesday',
            startTime: '14:30',
            endTime: '17:15',
            location: 'YIA LT1',
          },
        ],
        quota: 150,
        enrolled: 140,
        seatsRemaining: 10,
      },
    ],
    lastUpdated: new Date('2025-11-01'),
  },
  {
    courseCode: 'CSCI2100',
    courseName: 'Data Structures',
    department: 'Computer Science and Engineering',
    credits: 3,
    description: 'Introduction to fundamental data structures and algorithms.',
    prerequisites: ['CSCI1120'],
    term: '2025-26 Term 1',
    career: 'Undergraduate',
    sections: [
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        instructor: {
          name: 'Prof. LAM Yiu Sang',
          department: 'CSE',
        },
        timeSlots: [
          {
            day: 'Monday',
            startTime: '10:30',
            endTime: '12:15',
            location: 'LSB LT3',
          },
          {
            day: 'Thursday',
            startTime: '10:30',
            endTime: '12:15',
            location: 'LSB LT3',
          },
        ],
        quota: 100,
        enrolled: 98,
        seatsRemaining: 2,
        waitlist: 5,
      },
    ],
    lastUpdated: new Date('2025-11-01'),
  },
  {
    courseCode: 'PHYS1001',
    courseName: 'General Physics I',
    department: 'Physics',
    credits: 3,
    description: 'Mechanics, heat, and waves.',
    term: '2025-26 Term 1',
    career: 'Undergraduate',
    sections: [
      {
        sectionId: 'A',
        sectionType: 'Lecture',
        instructor: {
          name: 'Prof. CHENG Wing Tat',
          department: 'PHYS',
        },
        timeSlots: [
          {
            day: 'Tuesday',
            startTime: '16:30',
            endTime: '18:15',
            location: 'SC L1',
          },
          {
            day: 'Friday',
            startTime: '14:30',
            endTime: '16:15',
            location: 'SC L1',
          },
        ],
        quota: 120,
        enrolled: 75,
        seatsRemaining: 45,
      },
    ],
    lastUpdated: new Date('2025-11-01'),
  },
];

/**
 * Get all unique departments from courses
 */
export function getDepartments(): string[] {
  return Array.from(new Set(mockCourses.map(c => c.department))).sort();
}

/**
 * Search courses by query (code or name)
 */
export function searchCourses(query: string): Course[] {
  const lowerQuery = query.toLowerCase();
  return mockCourses.filter(
    course =>
      course.courseCode.toLowerCase().includes(lowerQuery) ||
      course.courseName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get course by code
 */
export function getCourseByCode(code: string): Course | undefined {
  return mockCourses.find(c => c.courseCode === code);
}
