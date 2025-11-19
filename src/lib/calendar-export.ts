import type { DayOfWeek, SelectedCourse, TermType } from '@/types';

const HONG_KONG_TZ = 'Asia/Hong_Kong';
const DEFAULT_CALENDAR_WEEKS = 13;

const DAY_INDEX: Record<DayOfWeek, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Term start dates for ICS generation.
 * Override with env vars NEXT_PUBLIC_TERM_START_<TERM_ID_WITH_UNDERSCORES>, e.g.
 *  NEXT_PUBLIC_TERM_START_2025_26_T1=2025-09-02
 */
export const TERM_START_DATES: Partial<Record<TermType, string>> = {
  '2025-26-T1': '2025-09-01',
  '2025-26-T2': '2026-01-12',
  '2025-26-Summer': '2026-05-18',
};

const envTermStartDates: Partial<Record<TermType, string | undefined>> = {
  '2025-26-T1': process.env.NEXT_PUBLIC_TERM_START_2025_26_T1,
  '2025-26-T2': process.env.NEXT_PUBLIC_TERM_START_2025_26_T2,
  '2025-26-Summer': process.env.NEXT_PUBLIC_TERM_START_2025_26_SUMMER,
};

export const GOOGLE_CALENDAR_IMPORT_URL = 'https://calendar.google.com/calendar/u/0/r/settings/export';

const VTIMEZONE_BLOCK = [
  'BEGIN:VTIMEZONE',
  `TZID:${HONG_KONG_TZ}`,
  'X-LIC-LOCATION:Asia/Hong_Kong',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0800',
  'TZOFFSETTO:+0800',
  'TZNAME:HKT',
  'DTSTART:19700101T000000',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const pad = (value: number) => value.toString().padStart(2, '0');

const formatLocalTimestamp = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(
    date.getMinutes()
  )}${pad(date.getSeconds())}`;

const formatUtcTimestamp = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

const escapeIcsText = (value?: string | null) => {
  if (!value) return '';
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
};

const resolveTermStartDate = (term: TermType): Date => {
  const override = envTermStartDates[term];
  const configured = override || TERM_START_DATES[term];
  if (configured) {
    return new Date(`${configured}T00:00:00+08:00`);
  }
  // Fallback: next Monday from today to avoid crashes if no date is set
  const today = new Date();
  const copy = new Date(today);
  const offset = (1 - copy.getDay() + 7) % 7; // Monday
  copy.setDate(copy.getDate() + offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getSlotDate = (anchor: Date, day: DayOfWeek, time: string) => {
  const dayIndex = DAY_INDEX[day];
  const start = new Date(anchor);
  const anchorDay = start.getDay();
  const offset = (dayIndex - anchorDay + 7) % 7;
  start.setDate(start.getDate() + offset);
  const [hours = '0', minutes = '0'] = time.split(':');
  start.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);
  return start;
};

export const buildScheduleICS = (
  schedule: SelectedCourse[],
  term: TermType,
  options?: { weeks?: number }
) => {
  if (!schedule || schedule.length === 0) {
    throw new Error('No courses were supplied for ICS export.');
  }

  const anchor = resolveTermStartDate(term);
  const weekCount = options?.weeks ?? DEFAULT_CALENDAR_WEEKS;
  const dtStamp = formatUtcTimestamp(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Queuesis//CUHK Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Queuesis ${term} Timetable`,
    `X-WR-TIMEZONE:${HONG_KONG_TZ}`,
    ...VTIMEZONE_BLOCK,
  ];

  schedule.forEach((selectedCourse, courseIdx) => {
    const section = selectedCourse.selectedSection;
    if (!section?.timeSlots?.length) return;

    section.timeSlots.forEach((slot, slotIdx) => {
      if (!slot.startTime || !slot.endTime || !slot.day) {
        return;
      }

      const startDate = getSlotDate(anchor, slot.day, slot.startTime);
      const endDate = getSlotDate(anchor, slot.day, slot.endTime);
      const dtStart = formatLocalTimestamp(startDate);
      const dtEnd = formatLocalTimestamp(endDate);
      const uid = `${selectedCourse.course.courseCode}-${section.sectionId}-${slot.day}-${slot.startTime}-${courseIdx}-${slotIdx}@queuesis.app`;

      const details = [
        selectedCourse.course.courseName,
        `Section: ${section.sectionType} ${section.sectionId}`,
        slot.location ? `Location: ${slot.location}` : undefined,
        section.instructor?.name ? `Instructor: ${section.instructor.name}` : undefined,
      ].filter(Boolean);

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:${escapeIcsText(`${selectedCourse.course.courseCode} ${section.sectionId}`)}`,
        `DTSTART;TZID=${HONG_KONG_TZ}:${dtStart}`,
        `DTEND;TZID=${HONG_KONG_TZ}:${dtEnd}`,
        `RRULE:FREQ=WEEKLY;COUNT=${weekCount}`,
        `CATEGORIES:${escapeIcsText(section.sectionType)}`,
        `DESCRIPTION:${escapeIcsText(details.join('\n'))}`,
        slot.location ? `LOCATION:${escapeIcsText(slot.location)}` : 'LOCATION:TBA',
        'END:VEVENT'
      );
    });
  });

  lines.push('END:VCALENDAR');

  return {
    ics: lines.join('\r\n'),
    anchorDate: anchor,
    weekCount,
  };
};
