// Core data types for CUHK Course Scheduler

/**
 * Academic term selector (for dropdown)
 */
export type TermType = '2025-26-T1' | '2025-26-T2' | '2025-26-Summer';

/**
 * Days of the week
 */
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/**
 * Academic term information
 */
export interface Term {
  id: string;
  name: string; // e.g., "2025-26 Term 1"
  startDate: Date;
  endDate: Date;
  year: string; // e.g., "2025-26"
  term: number; // 1 or 2
}

/**
 * Time slot for a course section
 */
export interface TimeSlot {
  day: DayOfWeek;
  startTime: string; // 24-hour format, e.g., "14:30"
  endTime: string;   // 24-hour format, e.g., "16:15"
  location?: string; // e.g., "LSB LT1", "ERB 404"
}

/**
 * Instructor information
 */
export interface Instructor {
  name: string;
  email?: string;
  department?: string;
}

/**
 * Course section (e.g., Lecture A, Tutorial T1)
 */
export interface Section {
  sectionId: string; // e.g., "A", "B", "T1", "L1"
  sectionType: 'Lecture' | 'Tutorial' | 'Lab' | 'Seminar';
  instructor?: Instructor;
  timeSlots: TimeSlot[];
  quota: number; // Total seats
  enrolled: number; // Current enrollment
  seatsRemaining: number;
  waitlist?: number;
  language?: 'English' | 'Cantonese' | 'Mandarin' | 'Bilingual'; // Teaching language (follows instructor)
  addConsent?: boolean; // Whether add consent is required for this section
  dropConsent?: boolean; // Whether drop consent is required for this section
  parentLecture?: string; // For tutorials/labs: which lecture section they belong to (e.g., "A")
  classNumber?: number; // CUSIS class number
}

/**
 * Full course information
 */
export interface Course {
  _id?: string; // MongoDB ID
  courseCode: string; // e.g., "CSCI3100"
  courseName: string; // e.g., "Software Engineering"
  department: string; // e.g., "Computer Science and Engineering"
  credits: number; // e.g., 3
  description?: string; // Detailed course description
  enrollmentRequirements?: string; // e.g., "Not for students who have taken ACCT2111"
  prerequisites?: string[];
  sections: Section[];
  term: TermType; // e.g., "2025-26-T1"
  career: 'Undergraduate' | 'Postgraduate';
  
  // Additional metadata
  lastUpdated?: Date;
}

/**
 * User's selected course for their schedule
 */
export interface SelectedCourse {
  course: Course;
  selectedSection: Section;
  color?: string; // For visual differentiation on timetable
}

/**
 * User's complete schedule
 */
export interface Schedule {
  _id?: string; // MongoDB ID
  userId?: string; // For future auth implementation
  name: string; // e.g., "Fall 2025 Schedule"
  term: string;
  courses: SelectedCourse[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Timetable conflict information
 */
export interface Conflict {
  course1: SelectedCourse;
  course2: SelectedCourse;
  conflictingTimeSlots: {
    slot1: TimeSlot;
    slot2: TimeSlot;
  }[];
}

/**
 * User preferences for schedule optimization (auto-generate mode)
 */
export interface SchedulePreferences {
  // Time preferences
  earliestStartTime: string; // e.g., "08:00" - No classes before this time
  latestEndTime: string; // e.g., "18:00" - No classes after this time
  
  // Free days preference
  preferredFreeDays: DayOfWeek[]; // Days user prefers to have no classes
  
  // Gap preferences
  minGapMinutes: number; // Minimum gap between classes (0 = back-to-back allowed)
  maxGapMinutes: number; // Maximum gap between classes (e.g., 120 = 2 hours)
}

/**
 * Search/filter parameters
 */
export interface CourseFilters {
  searchQuery?: string; // Search by code, name, or instructor
  department?: string;
  credits?: number;
  term?: string;
  career?: 'Undergraduate' | 'Postgraduate';
  hasSeatsAvailable?: boolean;
  days?: DayOfWeek[];
  timeRange?: {
    start: string;
    end: string;
  };
}

/**
 * Data sync log (for tracking scraper runs)
 */
export interface SyncLog {
  _id?: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'partial';
  coursesUpdated: number;
  errors?: string[];
  term: string;
}
