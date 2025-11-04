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
  slotHeight: 50,  // pixels per hour (more compact to reduce scrolling)
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

// Complete CUHK locations/buildings
export const BUILDINGS = {
  AB1: 'Academic Building No.1',
  AMEW: 'Art Museum East Wing',
  ARC: 'Lee Shau Kee Architecture Building',
  BMS: 'Basic Medical Sciences Building',
  CCCC: 'Chung Chi College Chapel',
  CCT: 'Chung Chi College Theology Building',
  'CK TSE': 'C.K. Tse Room (C.C. Library)',
  CKB: 'Chen Kou Bun Building',
  CML: "Ch'ien Mu Library",
  CWC: 'C.W. Chu College',
  CYT: 'Cheng Yu Tung Building',
  ELB: 'Esther Lee Building',
  ERB: 'William M.W. Mong Engineering Building',
  FYB: 'Wong Foo Yuan Building',
  HCA: 'Pi Chiu Building',
  HCF: 'Sir Philip Haddon-Cave Sports Field',
  HTB: 'Ho Tim Building',
  HTC: 'Haddon-Cave Tennis Court # 6, 7',
  HYS: 'Hui Yeung Shing Building',
  IBSB: 'Lo Kwee-Seong Integrated Biomedical Sciences Building',
  ICS: 'Institute of Chinese Studies',
  KHB: 'Fung King Hey Building',
  KKB: 'Leung Kau Kui Building',
  KSB: 'Kwok Sports Building',
  LDS: 'Li Dak Sum Building',
  LHC: 'Y.C. Liang Hall',
  LHCH: 'Lee Hysan Concert Hall',
  LKC: 'Li Koon Chun Hall',
  LN: 'Lingnan Stadium, Chung Chi College',
  'LPN LT': 'Lai Chan Pui Ngong Lecture Theatre (in Y.C. Liang Hall)',
  LSB: 'Lady Shaw Building',
  LSK: 'Lee Shau Kee Building',
  LWC: 'Li Wai Chun Building',
  MCO: 'Morningside College Seminar Room',
  MMW: 'Mong Man Wai Building',
  NAA: 'Cheng Ming Building, New Asia College',
  NAG: 'New Asia College Gymnasium',
  NAH: 'Humanities Building, New Asia College',
  NATT: 'New Asia College Table Tennis Room',
  'PGH3 MPH': 'Multi-purpose Hall, Jockey Club Postgraduate Hall 3',
  'PSC MPH': 'Multi-purpose Hall, Pommerenke Student Centre',
  PWH: 'Prince of Wales Hospital',
  RRS: 'Sir Run Run Shaw Hall',
  SB: 'Sino Building',
  SC: 'Science Centre',
  SCE: 'Science Centre East Block',
  SCSH: 'Multi-purpose Sports Hall, Shaw College',
  SCTT: 'Table Tennis Room, Shaw College',
  SHB: 'Ho Sin-Hang Engineering Building',
  SP: 'Swimming Pool',
  'SWC LT': 'Lecture Theatre, Shaw College',
  SWH: 'Swire Hall, Fung King Hey Building',
  TC: 'Tennis Court # 3, 4, 5',
  'TYW LT': 'T.Y. Wong Hall, Ho Sin-Hang Engineering Building',
  'UC TT': 'Table Tennis Room, United College',
  UCA: 'Tsang Shiu Tim Building, United College',
  UCC: 'T.C. Cheng Building, United College',
  UCG: 'The Thomas H.C. Cheung Gymnasium of United College',
  UG: 'University Gymnasium',
  'USC TT': 'University Sports Centre, Table Tennis Room',
  WLS: 'Wen Lan Tang, Shaw College',
  WMY: 'Wu Ho Man Yuen Building',
  WS1: 'Lee W.S. College South Block',
  WYST: 'Wu Yee Sun College Theatre',
  YCT: 'President Chi-tung Yung Memorial Building',
  YIA: 'Yasumoto International Academic Park',
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
