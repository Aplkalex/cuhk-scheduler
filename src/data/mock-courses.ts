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
    description: 'This course introduces the theory and practice of software engineering. Topics include software process models, requirements analysis, design patterns, testing, and project management. Students will work in teams to develop a software project using modern development methodologies and tools.',
    enrollmentRequirements: 'Prerequisites: CSCI2100. Not for students who have taken ENGG3080.',
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
        language: 'English',
        addConsent: false,
        dropConsent: false,
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
        language: 'English',
        addConsent: false,
        dropConsent: false,
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
        language: 'English',
        addConsent: false,
        dropConsent: false,
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
    description: 'Rigorous treatment of calculus of functions of one variable. Topics include real numbers, sequences and series, continuity, differentiation, and integration. This course emphasizes mathematical rigor and proof techniques, preparing students for advanced mathematics courses.',
    enrollmentRequirements: 'Prerequisites: MATH1510 or consent of the instructor. Not for students who have taken MATH2010.',
    prerequisites: ['MATH1510'],
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
        language: 'English',
        addConsent: true,
        dropConsent: false,
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
    department: 'Systems Engineering and Engineering Management',
    credits: 3,
    description: 'Introduction to probability and statistics for engineering students. Topics include descriptive statistics, probability, random variables, sampling distributions, and hypothesis testing. Applications to engineering problems and data analysis using statistical software.',
    enrollmentRequirements: 'For engineering students only. Not for students who have taken STAT2001 or STAT2011.',
    prerequisites: [],
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
        language: 'English',
        addConsent: false,
        dropConsent: true,
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
    description: 'An introduction to the concept of data and its role in modern society. This course explores the evolution of data from the Big Bang to modern big data technologies, examining how data shapes our understanding of the universe and influences decision-making in contemporary society. Topics include data collection, analysis, visualization, and ethical considerations.',
    enrollmentRequirements: 'For undergraduate students only. This course fulfills General Education requirements.',
    term: '2025-26 Term 1',
    career: 'Undergraduate',
    sections: [
      {
        sectionId: 'A',
        language: 'Bilingual',
        addConsent: false,
        dropConsent: false,
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
    description: 'Introduction to fundamental data structures and algorithms. This course covers arrays, linked lists, stacks, queues, trees, graphs, hash tables, and their applications. Students will learn algorithm analysis, complexity theory, and implement these structures in programming assignments.',
    enrollmentRequirements: 'Prerequisites: CSCI1120 or equivalent programming experience. Not for students who have taken ESTR2102.',
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
        language: 'English',
        addConsent: false,
        dropConsent: false,
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
    description: 'Mechanics, heat, and waves. This course covers fundamental principles of classical mechanics including kinematics, Newton\'s laws, energy, momentum, rotational motion, oscillations, and wave phenomena. Laboratory sessions provide hands-on experience with experimental techniques and data analysis.',
    enrollmentRequirements: 'For science and engineering students. Co-requisite: MATH1010 or equivalent.',
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
        language: 'English',
        addConsent: false,
        dropConsent: false,
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
