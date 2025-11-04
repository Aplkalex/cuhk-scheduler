/**
 * CUHK-specific constants and configuration
 */

// CUHK Brand Colors
export const COLORS = {
  primary: '#4B2E83',      // CUHK Purple
  primaryLight: '#6B46A8',
  primaryDark: '#3A2266',
  secondary: '#FFD700',    // Gold accent
  background: '#F9FAFB',
  text: '#111827',
  textLight: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

// Course colors for timetable visualization
export const COURSE_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#8B5A00', // Brown
];

// Time configuration for timetable grid
export const TIMETABLE_CONFIG = {
  startHour: 8,    // 8 AM
  endHour: 21,     // 9 PM
  slotHeight: 60,  // pixels per hour
  headerHeight: 60,
  sidebarWidth: 80,
};

// Days of the week
export const WEEKDAYS = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const WEEKDAY_SHORT = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
} as const;

// Academic terms
export const TERMS = [
  '2025-26 Term 1',
  '2025-26 Term 2',
  '2024-25 Term 1',
  '2024-25 Term 2',
] as const;

// Academic careers
export const CAREERS = [
  'Undergraduate',
  'Postgraduate',
] as const;

// Section types
export const SECTION_TYPES = [
  'Lecture',
  'Tutorial',
  'Lab',
  'Seminar',
] as const;

// Common CUHK locations/buildings
export const BUILDINGS = {
  LSB: 'Lee Shau Kee Building',
  ERB: 'Engineering Building',
  SHB: 'Sino Building',
  SC: 'Science Centre',
  YIA: 'Yasumoto International Academic Park',
  CYT: 'Cheng Yu Tung Building',
  NAH: 'New Asia-Humanities Building',
} as const;

// Schedule preferences defaults
export const DEFAULT_PREFERENCES = {
  preferredStartTime: '09:00',
  preferredEndTime: '18:00',
  maxGapMinutes: 120,
  minimizeGaps: true,
  backToBack: true,
};

// API endpoints
export const API_ROUTES = {
  courses: '/api/courses',
  courseSearch: '/api/courses/search',
  schedules: '/api/schedules',
  sync: '/api/sync',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  schedule: 'cuhk_schedule',
  preferences: 'cuhk_preferences',
  theme: 'cuhk_theme',
} as const;

// Disclaimer text
export const DISCLAIMER = 
  "⚠️ Course data may not be up-to-date. Always verify information on CUSIS before registration.";

// App metadata
export const APP_CONFIG = {
  name: 'CUHK Course Scheduler',
  description: 'Interactive course planner for CUHK students',
  version: '1.0.0',
  github: 'https://github.com/Aplkalex/cuhk-scheduler',
  email: 'support@cuhk-scheduler.app',
};
