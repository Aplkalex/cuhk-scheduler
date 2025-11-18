'use client';

import { useState, useCallback, useMemo, useEffect, useRef, useTransition, useDeferredValue, type ChangeEvent } from 'react';
import { Course, Section, SelectedCourse, TermType, SchedulePreferences, DayOfWeek } from '@/types';
import TimetableGrid from '@/components/TimetableGrid';
import { CourseList } from '@/components/CourseList';
import { SearchBar, FilterBar, FilterButton } from '@/components/SearchBar';
import { BuildingReference } from '@/components/BuildingReference';
import BuildingModal from '@/components/BuildingModal';
import { CourseDetailsModal } from '@/components/CourseDetailsModal';
import { SectionSwapModal } from '@/components/SectionSwapModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateCourseColor, calculateTotalCredits, detectConflicts, hasAvailableSeats, detectNewCourseConflicts, countUniqueCourses, removeDependentSectionsForLecture, removeLectureAndDependents, timeToMinutes } from '@/lib/schedule-utils';
import { TIMETABLE_CONFIG, WEEKDAY_SHORT } from '@/lib/constants';
import { generateSchedules, type GeneratedSchedule } from '@/lib/schedule-generator';
import { DISCLAIMER } from '@/lib/constants';
import { Calendar, Book, AlertCircle, AlertTriangle, Info, Trash2, X, Hand, Sparkles, ChevronDown, ChevronUp, ChevronRight, Clock, Download, Upload, Menu, RotateCcw, MapPin, /* Coffee, Check, */ FlaskConical, Lock, Unlock, Github } from 'lucide-react';
import TermSelector from '@/components/TermSelector';
import ConflictToast from '@/components/ConflictToast';
import FullSectionWarningToast, { type FullSectionWarningData } from '@/components/FullSectionWarningToast';

type SnapshotUndoEntry = {
  previousCourses: SelectedCourse[];
  removed: SelectedCourse;
  removedIndex: number;
};

type LegacyUndoEntry = {
  course: SelectedCourse;
  index: number;
};

type UndoEntry = SnapshotUndoEntry | LegacyUndoEntry;

const isSnapshotUndoEntry = (entry: UndoEntry): entry is SnapshotUndoEntry =>
  'previousCourses' in entry;

type GenerationNotice = {
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'error';
};

// Feature flags (compile-time via Next.js env in client)
const ENABLE_TEST_MODE = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';

const useIsMobile = (breakpoint = 1024) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
};

type ScheduleExportEntry = {
  courseCode: string;
  sectionId: string;
  sectionType: Section['sectionType'];
  classNumber?: number;
  color?: string;
  course?: Course;
  selectedSection?: Section;
};

type ScheduleExportFile = {
  version?: number;
  generatedAt?: string;
  term?: string;
  scheduleMode?: string;
  courses: ScheduleExportEntry[];
};

const PREFERENCE_OPTIONS = [
  { id: 'shortBreaks', icon: '⚡', label: 'Short Breaks' },
  { id: 'longBreaks', icon: '☕', label: 'Long Breaks' },
  { id: 'consistentStart', icon: '🎯', label: 'Consistent' },
  { id: 'startLate', icon: '🌅', label: 'Start Late' },
  { id: 'endEarly', icon: '🌆', label: 'End Early' },
  { id: 'daysOff', icon: '🗓️', label: 'Days Off' },
] as const;

type PreferenceId = typeof PREFERENCE_OPTIONS[number]['id'];


const formatTermLabel = (label: string) => {
  if (!label) return label;
  return label.replace(/(\d{4})[\s-](\d{2})/, (_, fullYear: string, end: string) => {
    const shortStart = fullYear.slice(-2);
    return `${shortStart}-${end}`;
  });
};

const DEFAULT_TERMS: Array<{ id: TermType; name: string }> = [
  { id: '2025-26-T1', name: formatTermLabel('2025-26 Term 1') },
  { id: '2025-26-T2', name: formatTermLabel('2025-26 Term 2') },
  { id: '2025-26-Summer', name: formatTermLabel('2025-26 Summer') },
];

export default function Home() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [isTermsLoading, setIsTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsReloadKey, setTermsReloadKey] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [fullSectionWarnings, setFullSectionWarnings] = useState<FullSectionWarningData[]>([]);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showTerm2OnlyNotice, setShowTerm2OnlyNotice] = useState(true);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<SelectedCourse | null>(null);
  const [swapModalCourse, setSwapModalCourse] = useState<SelectedCourse | null>(null);
  const [conflictToast, setConflictToast] = useState<Array<{ course1: string; course2: string }>>([]);
  const [conflictingCourses, setConflictingCourses] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [pendingUndo, setPendingUndo] = useState<UndoEntry | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);
  const [courseFetchError, setCourseFetchError] = useState<string | null>(null);
  const [courseFetchVersion, setCourseFetchVersion] = useState(0);
  const coursesAbortControllerRef = useRef<AbortController | null>(null);
  const fullSectionWarningIdRef = useRef(0);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isSwitchingMode, startModeTransition] = useTransition();
  const [selectedTerm, setSelectedTerm] = useState<TermType>('2025-26-T2');
  const [swapWarning, setSwapWarning] = useState<string | null>(null);
  const [isSwapWarningExiting, setIsSwapWarningExiting] = useState(false);
  const [swapWarningType, setSwapWarningType] = useState<'full' | 'conflict' | null>(null);
  const [generationNotice, setGenerationNotice] = useState<GenerationNotice | null>(null);
  const swapWarningStyles = useMemo(() => {
    if (swapWarningType === 'conflict') {
      return {
        container: 'bg-rose-50/95 dark:bg-rose-900/95 backdrop-blur-xl border border-rose-400 dark:border-rose-600 sm:border-2',
        icon: 'bg-rose-500 dark:bg-rose-600',
        title: 'text-rose-900 dark:text-rose-100',
        text: 'text-rose-800 dark:text-rose-200',
        button:
          'text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 hover:bg-rose-200/50 dark:hover:bg-rose-800/30',
        progressTrack: 'bg-rose-200/50 dark:bg-rose-950/50',
        progressBar: 'bg-rose-500 dark:bg-rose-400',
      } as const;
    }

    return {
      container: 'bg-amber-50/95 dark:bg-amber-900/95 backdrop-blur-xl border border-amber-400 dark:border-amber-600 sm:border-2',
      icon: 'bg-amber-500 dark:bg-amber-600',
      title: 'text-amber-900 dark:text-amber-100',
      text: 'text-amber-800 dark:text-amber-200',
      button:
        'text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-800/30',
      progressTrack: 'bg-amber-200/50 dark:bg-amber-950/50',
      progressBar: 'bg-amber-500 dark:bg-amber-400',
    } as const;
  }, [swapWarningType]);
  
  // Schedule mode: 'manual' or 'auto-generate'
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'auto-generate'>('auto-generate');
  
  // Collapsible My Schedule state
  const [isScheduleCollapsed, setIsScheduleCollapsed] = useState(false);
  const [expandedScheduleCourse, setExpandedScheduleCourse] = useState<number | null>(null);

  // For auto-generate mode: just track which courses (not sections) are selected
  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>([]);

  // Schedule generation preferences (for auto-generate mode)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [preferences, setPreferences] = useState<SchedulePreferences>({
    earliestStartTime: '08:00',
    latestEndTime: '18:00',
    preferredFreeDays: [],
    minGapMinutes: 0,
    maxGapMinutes: 120,
  });

  const [timetableAppearance, setTimetableAppearance] = useState<'modern' | 'frosted'>('modern');

  const emptyTimetableClassName = timetableAppearance === 'frosted'
    ? 'bg-white/70 dark:bg-white/[0.06] backdrop-blur-xl border border-gray-200/30 dark:border-white/[0.12]'
    : 'bg-white/[0.08] dark:bg-transparent border border-gray-200/15 dark:border-white/[0.1] backdrop-blur-none';

  // Unified "sheet" appearance (quick-actions / preference picker)
  const sheetClassName = timetableAppearance === 'frosted'
    ? 'bg-white/60 dark:bg-[#0f0f0f]/55 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl'
    : 'bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl';

  const hasCourseSelectionForGeneration =
    scheduleMode === 'auto-generate'
      ? selectedCourseCodes.length > 0
      : selectedCourses.length > 0;
  
  // Simple preference - only one can be selected at a time
  const [selectedPreference, setSelectedPreference] = useState<PreferenceId | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [preferredDaysOff, setPreferredDaysOff] = useState<DayOfWeek[]>([]);
  const [excludeFullSections, setExcludeFullSections] = useState(false);

  // Generated schedules state
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<number>(0);
  // Persist locked section keys (courseCode|sectionId) across schedule browsing
  const [lockedSectionKeys, setLockedSectionKeys] = useState<string[]>([]);

  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [isMobileActionsClosing, setIsMobileActionsClosing] = useState(false);
  const [isPreferencePickerOpen, setIsPreferencePickerOpen] = useState(false);
  const [isPreferencePickerClosing, setIsPreferencePickerClosing] = useState(false);
  const [isSelectedCoursesSheetOpen, setIsSelectedCoursesSheetOpen] = useState(false);
  const [isSelectedCoursesSheetClosing, setIsSelectedCoursesSheetClosing] = useState(false);
  const [isPrefPending, startPrefTransition] = useTransition();
  const [mobileView, setMobileView] = useState<'courses' | 'timetable'>('courses');
  const showMobileGenerateBar =
    isMobile && scheduleMode === 'auto-generate' && selectedCourseCodes.length > 0;
  const timetableRef = useRef<HTMLDivElement | null>(null);

  // Build tiny preview data for mobile mini-card
  const previewData = useMemo(() => {
    const startOfDay = TIMETABLE_CONFIG.startHour * 60;
    const endOfDay = TIMETABLE_CONFIG.endHour * 60;
    const span = endOfDay - startOfDay;
    const byDay: Record<string, Array<{ topPct: number; heightPct: number; color: string }>> = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [],
    };
    selectedCourses.forEach((sc) => {
      sc.selectedSection.timeSlots.forEach((slot) => {
        if (!(slot.day in byDay)) return;
        const top = Math.max(0, timeToMinutes(slot.startTime) - startOfDay);
        const end = Math.min(endOfDay, timeToMinutes(slot.endTime));
        const height = Math.max(10, end - (timeToMinutes(slot.startTime))); // min height protection
        byDay[slot.day].push({
          topPct: Math.min(100, (top / span) * 100),
          heightPct: Math.min(100, (height / span) * 100),
          color: sc.color ?? generateCourseColor(sc.course.courseCode, []),
        });
      });
    });
    return byDay;
  }, [selectedCourses]);

  const openFullTimetable = useCallback(() => {
    if (isMobile) {
      setMobileView('timetable');
    } else if (timetableRef.current) {
      timetableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isMobile]);

  const handleModeSwitch = useCallback(
    (mode: 'manual' | 'auto-generate') => {
      startModeTransition(() => {
        setScheduleMode(mode);
        setGeneratedSchedules([]);
        setSelectedScheduleIndex(0);
        if (mode === 'auto-generate') {
          const courseCodes = Array.from(
            new Set(
              selectedCourses
                .filter((sc): sc is SelectedCourse => Boolean(sc && sc.course))
                .map((sc) => sc.course.courseCode)
            )
          );
          setSelectedCourseCodes(courseCodes);
          if (isMobile) setMobileView('courses');
        } else {
          setSelectedCourseCodes([]);
          if (isMobile) setMobileView('courses');
        }
      });
    },
    [selectedCourses, startModeTransition, isMobile]
  );

  // Sync selectedCourseCodes with selectedCourses (for manual mode)
  // This keeps the preferences bar in sync when switching modes
  useEffect(() => {
    const courseCodes = Array.from(
      new Set(
        selectedCourses
          .filter((sc): sc is SelectedCourse => Boolean(sc && sc.course))
          .map((sc) => sc.course.courseCode)
      )
    );
    setSelectedCourseCodes(courseCodes);
  }, [selectedCourses]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileActionsOpen(false);
      setIsMobileActionsClosing(false);
    }
  }, [isMobile]);
  
  // Helpers to open/close the mobile quick actions with smooth exit animation
  const openMobileActions = useCallback(() => {
    setIsMobileActionsClosing(false);
    setIsMobileActionsOpen(true);
  }, []);
  const closeMobileActions = useCallback(() => {
    // Trigger exit animation then unmount
    setIsMobileActionsClosing(true);
    window.setTimeout(() => {
      setIsMobileActionsOpen(false);
      setIsMobileActionsClosing(false);
    }, 220); // must match CSS animate duration (see animate-slideDown / animate-fadeOut)
  }, []);

  // Preference picker open/close with smooth exit animation
  const openPreferencePicker = useCallback(() => {
    setIsPreferencePickerClosing(false);
    setIsPreferencePickerOpen(true);
  }, []);
  const closePreferencePicker = useCallback(() => {
    setIsPreferencePickerClosing(true);
    window.setTimeout(() => {
      setIsPreferencePickerOpen(false);
      setIsPreferencePickerClosing(false);
    }, 220);
  }, []);

  const openSelectedCoursesSheet = useCallback(() => {
    setIsSelectedCoursesSheetClosing(false);
    setIsSelectedCoursesSheetOpen(true);
  }, []);
  const closeSelectedCoursesSheet = useCallback(() => {
    setIsSelectedCoursesSheetClosing(true);
    window.setTimeout(() => {
      setIsSelectedCoursesSheetOpen(false);
      setIsSelectedCoursesSheetClosing(false);
    }, 220);
  }, []);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredCourses = useDeferredValue(courses);

  // Term display names
  const termNames = useMemo(() => {
    return terms.reduce((acc, term) => {
      acc[term.id] = term.name;
      return acc;
    }, {} as Record<TermType, string>);
  }, [terms]);

  // Choose courses based on test mode
  // Filter courses based on search, department, and selected term
  const filteredCourses = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.toLowerCase().trim();
    return deferredCourses.filter((course) => {
      const matchesSearch = normalizedQuery.length === 0
        ? true
        : course.courseCode.toLowerCase().includes(normalizedQuery) ||
          course.courseName.toLowerCase().includes(normalizedQuery) ||
          course.sections.some((section) => section.instructor?.name.toLowerCase().includes(normalizedQuery));

      const matchesDepartment = !selectedDepartment || course.department === selectedDepartment;
      const matchesTerm = course.term === selectedTerm;

      return matchesSearch && matchesDepartment && matchesTerm;
    });
  }, [deferredCourses, deferredSearchQuery, selectedDepartment, selectedTerm]);

  const departments = useMemo(
    () => Array.from(new Set(deferredCourses.map((course) => course.department))),
    [deferredCourses]
  );

  // Human-readable department label: remove generic prefixes like "Department of"
  const formatDepartmentLabel = useCallback((dept: string) => {
    if (!dept) return '';
    const trimmed = dept.trim();
    // Strip common prefixes; keep the meaningful part
    // Covers: Department/Dept./Dept of/School/Sch./Faculty/Centre/Center/Institute/Division/Office/Program/Programme (+ optional "of"/"for")
    const cleaned = trimmed
      .replace(/^The\s+/i, '')
      .replace(/^(Department|Dept\.?|School|Sch\.?|Faculty|Centre|Center|Institute|Division|Office|Program|Programme)(\s+(of|for))?\s+/i, '')
      .replace(/^\s*of\s+/i, '') // guard: if a lone leading "of" remains
      .replace(/\s*,\s*$/, '');
    // If extremely long, lightly truncate for chip while preserving the full value in title
    if (cleaned.length > 24) {
      const noParen = cleaned.replace(/\s*\(.+\)$/, '');
      const base = noParen.length > 24 ? noParen.slice(0, 22) + '…' : noParen;
      return base;
    }
    return cleaned;
  }, []);

  // Build department options with a short code + formatted label, sorted alphabetically by label
  const departmentOptions = useMemo(() => {
    // Aggregate codes (from courseCode prefix) per department
    const codeCounts = new Map<string, Map<string, number>>();
    for (const course of deferredCourses) {
      const dept = course.department;
      const match = course.courseCode?.match(/^([A-Za-z]+)/);
      const prefix = match ? match[1].toUpperCase() : undefined;
      if (!dept || !prefix) continue;
      if (!codeCounts.has(dept)) codeCounts.set(dept, new Map());
      const map = codeCounts.get(dept)!;
      map.set(prefix, (map.get(prefix) ?? 0) + 1);
    }

    const options = departments.map((dept) => {
      const label = formatDepartmentLabel(dept);
      const codes = codeCounts.get(dept);
      // Pick most frequent prefix as "code"
      let code: string | undefined;
      if (codes && codes.size > 0) {
        code = Array.from(codes.entries()).sort((a, b) => {
          // sort desc by count, tie-breaker shorter code first, then alpha
          if (b[1] !== a[1]) return b[1] - a[1];
          if (a[0].length !== b[0].length) return a[0].length - b[0].length;
          return a[0].localeCompare(b[0]);
        })[0][0];
      }
      return { value: dept, label, code };
    });

    options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return options;
  }, [departments, deferredCourses, formatDepartmentLabel]);

  const selectedCourseMap = useMemo(() => {
    const map = new Map<string, SelectedCourse[]>();
    selectedCourses.forEach((sc) => {
      const list = map.get(sc.course.courseCode);
      if (list) {
        list.push(sc);
      } else {
        map.set(sc.course.courseCode, [sc]);
      }
    });
    return map;
  }, [selectedCourses]);

  // Available courses for timetable interactions
  const availableCourses = courses;

  const updateConflicts = useCallback((courses: SelectedCourse[]) => {
    const allConflicts = detectConflicts(courses);
    const conflictingCodes = new Set<string>();
    allConflicts.forEach(conflict => {
      conflictingCodes.add(conflict.course1.course.courseCode);
      conflictingCodes.add(conflict.course2.course.courseCode);
    });
    setConflictingCourses(Array.from(conflictingCodes));
  }, []);

  const handleDismissUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingUndo(null);
  }, []);

  const pushUndoEntry = useCallback((entry: UndoEntry) => {
    setUndoStack(prev => {
      const next = [entry, ...prev];
      return next.slice(0, 25);
    });

    handleDismissUndo();

    setPendingUndo(entry);
    undoTimerRef.current = setTimeout(() => {
      handleDismissUndo();
    }, 6000);
  }, [handleDismissUndo]);

  const undoLastRemoval = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) {
        return prev;
      }

      const [latest, ...rest] = prev;

      if (isSnapshotUndoEntry(latest)) {
        const restoredCourses = latest.previousCourses.map(course => ({ ...course }));
        setSelectedCourses(restoredCourses);
        updateConflicts(restoredCourses);
      } else {
        // Fallback for legacy entries captured before the snapshot update
        setSelectedCourses(current => {
          const next = [...current];
          const insertIndex = Math.min(latest.index, next.length);
          next.splice(insertIndex, 0, latest.course);
          updateConflicts(next);
          return next;
        });
      }

      handleDismissUndo();
      return rest;
    });
  }, [updateConflicts, handleDismissUndo]);

  useEffect(() => {
    return () => {
      handleDismissUndo();
    };
  }, [handleDismissUndo]);

  const retryFetchTerms = useCallback(() => {
    setTermsReloadKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setIsTermsLoading(true);
    setTermsError(null);

    fetch('/api/terms', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load terms');
        }
        return response.json();
      })
      .then((data) => {
    if (!isMounted) return;
        if (!data?.data || !Array.isArray(data.data)) {
          throw new Error('Malformed term response');
        }
        const nextTerms = data.data.map((term: { id: string; name: string }) => ({
          id: term.id as TermType,
          name: formatTermLabel(term.name ?? term.id),
        }));
        if (nextTerms.length > 0) {
          setTerms(nextTerms);
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }
        if (!isMounted) return;
        setTermsError(error.message ?? 'Unable to load terms');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsTermsLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [termsReloadKey]);

  useEffect(() => {
    if (terms.length === 0) {
      return;
    }
    const hasSelected = terms.some(term => term.id === selectedTerm);
    if (!hasSelected) {
      setSelectedTerm(terms[0].id);
    }
  }, [terms, selectedTerm]);

  const retryFetchCourses = useCallback(() => {
    setCourseFetchVersion(prev => prev + 1);
  }, []);

  useEffect(() => {
    coursesAbortControllerRef.current?.abort();
    const controller = new AbortController();
    coursesAbortControllerRef.current = controller;

    setIsCoursesLoading(true);
    setCourseFetchError(null);

    const params = new URLSearchParams();
    params.set('term', selectedTerm);
    if (isTestMode) {
      params.set('testMode', 'true');
    }
    params.set('_v', courseFetchVersion.toString());

    fetch(`/api/courses?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load courses');
        }
        return response.json();
      })
      .then((data) => {
        if (!data?.data || !Array.isArray(data.data)) {
          throw new Error('Malformed course response');
        }
        setCourses(data.data as Course[]);
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }
        setCourseFetchError(error.message ?? 'Unable to load courses');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsCoursesLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedTerm, isTestMode, courseFetchVersion]);

  const queueFullSectionWarning = useCallback((course: Course, section: Section) => {
    setFullSectionWarnings(prev => [
      ...prev,
      {
        id: fullSectionWarningIdRef.current++,
        course,
        section,
      },
    ]);
  }, []);

  const dismissFullSectionWarning = useCallback((id: number) => {
    setFullSectionWarnings(prev => prev.filter(warning => warning.id !== id));
  }, []);

  const showGenerationNotice = useCallback((notice: GenerationNotice) => {
    setGenerationNotice(notice);
  }, []);

  const dismissGenerationNotice = useCallback(() => {
    setGenerationNotice(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isUndoShortcut = (event.metaKey || event.ctrlKey) && !event.shiftKey && key === 'z';

      if (isUndoShortcut) {
        if (undoStack.length === 0) {
          return;
        }
        event.preventDefault();
        undoLastRemoval();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack.length, undoLastRemoval]);

  // Add a course section to schedule
  const handleAddSection = (course: Course, section: Section) => {
    // Show warning if section is full
    if (!hasAvailableSeats(section)) {
      queueFullSectionWarning(course, section);
    }

    // Get existing color for this course if any section is already selected
    const existingCourseColor = selectedCourses.find(
      (sc) => sc.course.courseCode === course.courseCode
    )?.color;

    // Get all currently used colors to avoid duplicates
    const usedColors = Array.from(new Set(
      selectedCourses.map(sc => sc.color).filter((c): c is string => c !== undefined)
    ));

    // Check if this is a lecture and if another lecture from the same course is already selected
    if (section.sectionType === 'Lecture') {
      const existingLectureIndex = selectedCourses.findIndex(
        (sc) => sc.course.courseCode === course.courseCode && sc.selectedSection.sectionType === 'Lecture'
      );

      const prunedCourses = removeDependentSectionsForLecture(
        selectedCourses,
        course.courseCode,
        section.sectionId
      );

      const lectureColor = (
        existingLectureIndex !== -1
          ? selectedCourses[existingLectureIndex].color
          : undefined
      ) ?? existingCourseColor ?? generateCourseColor(course.courseCode, usedColors);

      const firstCourseIndex = prunedCourses.findIndex(
        (sc) => sc.course.courseCode === course.courseCode
      );

      const insertIndex = existingLectureIndex !== -1
        ? Math.min(existingLectureIndex, prunedCourses.length)
        : firstCourseIndex === -1
          ? prunedCourses.length
          : firstCourseIndex;

      const nextCourses = [...prunedCourses];
      nextCourses.splice(insertIndex, 0, {
        course,
        selectedSection: section,
        color: lectureColor,
      });

      setSelectedCourses(nextCourses);
      return;
    }

    // For tutorials, check if the parent lecture is selected
    if (section.sectionType === 'Tutorial' && section.parentLecture) {
      const parentLectureCourse = selectedCourses.find(
        (sc) => sc.course.courseCode === course.courseCode && 
                sc.selectedSection.sectionType === 'Lecture' && 
                sc.selectedSection.sectionId === section.parentLecture
      );

      if (!parentLectureCourse) {
        // Auto-add the parent lecture
        const parentLecture = course.sections.find(
          (s) => s.sectionType === 'Lecture' && s.sectionId === section.parentLecture
        );

        if (parentLecture) {
          const lectureColor = existingCourseColor || generateCourseColor(course.courseCode, usedColors);
          const newCourses = [
            ...selectedCourses,
            {
              course,
              selectedSection: parentLecture,
              color: lectureColor,
            },
            {
              course,
              selectedSection: section,
              color: lectureColor, // Same color as lecture
            },
          ];
          setSelectedCourses(newCourses);
          return;
        }
      } else {
        // Replace existing tutorial from the same lecture
        const existingTutorialIndex = selectedCourses.findIndex(
          (sc) => sc.course.courseCode === course.courseCode && 
                  sc.selectedSection.sectionType === 'Tutorial' && 
                  sc.selectedSection.parentLecture === section.parentLecture
        );

        if (existingTutorialIndex !== -1) {
          const updatedCourses = [...selectedCourses];
          updatedCourses[existingTutorialIndex] = {
            course,
            selectedSection: section,
            color: parentLectureCourse.color, // Use same color as lecture
          };
          setSelectedCourses(updatedCourses);
          return;
        }

        // Add new tutorial with same color as lecture
        const newCourse: SelectedCourse = {
          course,
          selectedSection: section,
          color: parentLectureCourse.color,
        };

        // Detect conflicts before adding tutorial
        const conflictingCourseCodes = detectNewCourseConflicts(newCourse, selectedCourses);
        if (conflictingCourseCodes.length > 0) {
          const newConflicts = conflictingCourseCodes.map(code => ({
            course1: course.courseCode,
            course2: code
          }));
          setConflictToast(newConflicts);
          setConflictingCourses([course.courseCode, ...conflictingCourseCodes]);
        }

        setSelectedCourses([...selectedCourses, newCourse]);
        return;
      }
    }

    // Default: add new section
    const newCourse: SelectedCourse = {
      course,
      selectedSection: section,
      color: existingCourseColor || generateCourseColor(course.courseCode, usedColors),
    };

    // Detect conflicts before adding
    const conflictingCourseCodes = detectNewCourseConflicts(newCourse, selectedCourses);
    if (conflictingCourseCodes.length > 0) {
      // Show toast notification
      const newConflicts = conflictingCourseCodes.map(code => ({
        course1: course.courseCode,
        course2: code
      }));
      setConflictToast(newConflicts);
      
      // Update conflicting courses list (include both the new course and conflicting ones)
      setConflictingCourses([course.courseCode, ...conflictingCourseCodes]);
    }

    setSelectedCourses([...selectedCourses, newCourse]);
  };

  // Remove a course from schedule
  const handleRemoveCourse = useCallback((index: number) => {
    setSelectedCourses(prev => {
      const courseToRemove = prev[index];
      if (!courseToRemove) {
        return prev;
      }
      // Respect lock: block removal if locked
      if (courseToRemove.locked) {
        showGenerationNotice({
          title: 'Unlock To Remove',
          message: `${courseToRemove.course.courseCode} is locked. Unlock it first to remove.`,
          tone: 'warning',
        });
        return prev;
      }

      const snapshot = prev.map(course => ({ ...course }));
      let next = prev.filter((_, i) => i !== index);

      if (courseToRemove.selectedSection.sectionType === 'Lecture') {
        next = removeLectureAndDependents(
          next,
          courseToRemove.course.courseCode,
          courseToRemove.selectedSection.sectionId
        );
      }

      pushUndoEntry({ previousCourses: snapshot, removed: { ...courseToRemove }, removedIndex: index });
      updateConflicts(next);
      return next;
    });
  }, [pushUndoEntry, updateConflicts]);

  // Swap lecture section and automatically assign tutorial
  const handleSwapLectureSection = (courseCode: string, currentLectureId: string, newLectureId: string) => {
    // Find the course data
    const courseData = courses.find(c => c.courseCode === courseCode && c.term === selectedTerm);
    if (!courseData) return;

    // Find the new lecture section
    const newLecture = courseData.sections.find(s => s.sectionId === newLectureId && s.sectionType === 'Lecture');
    if (!newLecture) return;

    // Find available tutorials for the new lecture
    const availableTutorials = courseData.sections.filter(
      s => s.sectionType === 'Tutorial' && s.parentLecture === newLectureId
    );

    // Pick a random tutorial (or the first one if only one available)
    const randomTutorial = availableTutorials.length > 0
      ? availableTutorials[Math.floor(Math.random() * availableTutorials.length)]
      : null;

    // Update selected courses
    setSelectedCourses(prev => {
      const updated = prev.map(selectedCourse => {
        if (selectedCourse.course.courseCode === courseCode) {
          // Check if this is the lecture to swap
          if (selectedCourse.selectedSection.sectionType === 'Lecture' && 
              selectedCourse.selectedSection.sectionId === currentLectureId) {
            return {
              ...selectedCourse,
              selectedSection: newLecture,
            };
          }
          // Remove old tutorials for this lecture
          if (selectedCourse.selectedSection.sectionType === 'Tutorial' && 
              selectedCourse.selectedSection.parentLecture === currentLectureId) {
            return null; // Mark for removal
          }
        }
        return selectedCourse;
      }).filter(Boolean) as SelectedCourse[];

      // Add the new tutorial if available
      if (randomTutorial) {
        updated.push({
          course: courseData,
          selectedSection: randomTutorial,
          color: updated.find(c => c.course.courseCode === courseCode)?.color || generateCourseColor(courseCode, []),
        });
      }

      updateConflicts(updated);
      return updated;
    });
  };

  // Swap non-lecture sections of the same course (Tutorial, Lab, etc.)
  // For tutorials: requires same parentLecture (enforced by caller); for labs without parent lecture, swap by ID.
  const handleSwapTutorialSection = (courseCode: string, fromSectionId: string, toSectionId: string) => {
    // Find the course data
    const courseData = courses.find(c => c.courseCode === courseCode && c.term === selectedTerm);
    if (!courseData) return;

    // Find the target section by ID (supports Tutorial or Lab)
    const newSection = courseData.sections.find(s => s.sectionId === toSectionId);
    if (!newSection) return;

    // Update selected courses
    setSelectedCourses(prev => {
      const updated = prev.map(selectedCourse => {
        if (selectedCourse.course.courseCode === courseCode &&
            selectedCourse.selectedSection.sectionId === fromSectionId) {
          return {
            ...selectedCourse,
            selectedSection: newSection,
          };
        }
        return selectedCourse;
      });

      updateConflicts(updated);
      return updated;
    });
  };

  // Remove section from course list
  const handleRemoveSection = useCallback((course: Course, section: Section) => {
    setSelectedCourses(prev => {
      const index = prev.findIndex(
        (sc) => sc.course.courseCode === course.courseCode && sc.selectedSection.sectionId === section.sectionId
      );

      if (index === -1) {
        return prev;
      }

      // Respect lock: block removal if locked
      const target = prev[index];
      if (target?.locked) {
        showGenerationNotice({
          title: 'Unlock To Remove',
          message: `${course.courseCode} ${section.sectionId} is locked. Unlock it first to remove.`,
          tone: 'warning',
        });
        return prev;
      }

      const removedCourse = prev[index];
      let next = prev.filter((_, i) => i !== index);

      if (section.sectionType === 'Lecture') {
        next = removeLectureAndDependents(next, course.courseCode, section.sectionId);
      }
      const snapshot = prev.map(selected => ({ ...selected }));
      pushUndoEntry({ previousCourses: snapshot, removed: { ...removedCourse }, removedIndex: index });
      updateConflicts(next);
      return next;
    });
  }, [pushUndoEntry, updateConflicts]);

  // Handle swap warnings
  const handleSwapWarning = useCallback((message: string, type: 'full' | 'conflict') => {
    setSwapWarning(message);
    setSwapWarningType(type);
    setIsSwapWarningExiting(false);
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setIsSwapWarningExiting(true);
      setTimeout(() => {
        setSwapWarning(null);
        setSwapWarningType(null);
      }, 300);
    }, 5000);
  }, []);

  // Handle course click (show course details modal)
  const handleCourseClick = useCallback((course: SelectedCourse) => {
    // Always show course details when clicking on a course in the timetable
    setSelectedCourseDetails(course);
  }, []);

  // Handle remove course from timetable
  const handleCourseClickRemove = useCallback((course: SelectedCourse) => {
    const index = selectedCourses.indexOf(course);
    handleRemoveCourse(index);
  }, [selectedCourses, handleRemoveCourse]);

  // Handle location click
  const handleLocationClick = useCallback((location: string) => {
    setSelectedLocation(location);
  }, []);


  // Clear all courses
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTermChangeConfirm, setShowTermChangeConfirm] = useState(false);
  const [pendingTerm, setPendingTerm] = useState<TermType | null>(null);
  
  const handleClearSchedule = () => {
    setShowClearConfirm(true);
  };

  const confirmClearSchedule = () => {
    // Clear all schedule-related state
    setSelectedCourses([]);
    setSelectedCourseCodes([]);
    setGeneratedSchedules([]);
    setSelectedScheduleIndex(0);
    setShowClearConfirm(false);
    setUndoStack([]);
    setFullSectionWarnings([]);
    handleDismissUndo();
    updateConflicts([]);
  };

  // Handle term change - clear schedule when switching terms
  const handleTermChange = (newTerm: TermType) => {
    if (selectedCourses.length > 0) {
      // If there are courses in the schedule, show confirmation modal
      setPendingTerm(newTerm);
      setShowTermChangeConfirm(true);
    } else {
      // No courses, just switch terms
      setSelectedTerm(newTerm);
    }
  };

  const confirmTermChange = () => {
    if (pendingTerm) {
      setSelectedCourses([]);
      setConflictToast([]);
      setFullSectionWarnings([]);
      setConflictingCourses([]);
      setSelectedTerm(pendingTerm);
      setShowTermChangeConfirm(false);
      setPendingTerm(null);
    }
  };

  const handleExportSchedule = useCallback(() => {
    if (selectedCourses.length === 0) {
      showGenerationNotice({
        title: 'Nothing to export',
        message: 'Add courses to your schedule before exporting.',
        tone: 'warning',
      });
      return;
    }

    const payload: ScheduleExportFile = {
      version: 1,
      generatedAt: new Date().toISOString(),
      term: selectedTerm,
      scheduleMode,
      courses: selectedCourses.map((selected) => ({
        courseCode: selected.course.courseCode,
        sectionId: selected.selectedSection.sectionId,
        sectionType: selected.selectedSection.sectionType,
        classNumber: selected.selectedSection.classNumber,
        color: selected.color,
        course: selected.course,
        selectedSection: selected.selectedSection,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `cuhk-schedule-${selectedTerm}-${new Date().toISOString().slice(0, 10)}.json`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    showGenerationNotice({
      title: 'Schedule exported',
      message: 'Downloaded a JSON copy of your timetable.',
      tone: 'info',
    });
  }, [selectedCourses, scheduleMode, selectedTerm, showGenerationNotice]);

  const handleImportButtonClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportSchedule = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as ScheduleExportFile;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.courses)) {
          throw new Error('Invalid file format. Expected an exported schedule.');
        }

        if (parsed.term && parsed.term !== selectedTerm) {
          const matchingTerm = terms.find((term) => term.id === parsed.term);
          if (matchingTerm) {
            setSelectedTerm(matchingTerm.id);
          }
        }

        const usedColors: string[] = [];
        const missingCourses = new Set<string>();
        const missingSections = new Set<string>();
        const restored: SelectedCourse[] = [];

        parsed.courses.forEach((entry) => {
          if (!entry || typeof entry.courseCode !== 'string' || typeof entry.sectionId !== 'string') {
            return;
          }
          const resolvedCourse =
            courses.find((course) => course.courseCode === entry.courseCode) ?? entry.course;
          if (!resolvedCourse) {
            missingCourses.add(entry.courseCode);
            return;
          }

          const resolvedSection =
            resolvedCourse.sections.find((section) => {
              const sameId = section.sectionId === entry.sectionId;
              const sameType = section.sectionType === entry.sectionType;
              const sameClass =
                entry.classNumber == null ||
                section.classNumber == null ||
                section.classNumber === entry.classNumber;
              return sameId && sameType && sameClass;
            }) ?? entry.selectedSection;

          if (!resolvedSection) {
            missingSections.add(`${entry.courseCode} ${entry.sectionId}`);
            return;
          }

          const color =
            typeof entry.color === 'string'
              ? entry.color
              : generateCourseColor(resolvedCourse.courseCode, usedColors);

          usedColors.push(color);
          restored.push({
            course: resolvedCourse,
            selectedSection: resolvedSection,
            color,
          });
        });

        if (restored.length === 0) {
          throw new Error('No matching courses were found in this file.');
        }

        setSelectedCourses(restored);
        setGeneratedSchedules([]);
        setSelectedScheduleIndex(0);
        setUndoStack([]);
        setFullSectionWarnings([]);
        setConflictToast([]);
        setConflictingCourses([]);
        setExpandedScheduleCourse(null);
        setSwapModalCourse(null);
        setSelectedCourseDetails(null);
        setSwapWarning(null);
        setSwapWarningType(null);
        setIsSwapWarningExiting(false);
        handleDismissUndo();
        updateConflicts(restored);

        const uniqueImportedCourses = new Set(
          restored
            .filter((sc): sc is SelectedCourse => Boolean(sc && sc.course))
            .map((sc) => sc.course.courseCode)
        ).size;
        const missingSummary =
          missingCourses.size > 0 || missingSections.size > 0
            ? ` Skipped ${missingCourses.size + missingSections.size} item(s) that are unavailable in the current dataset.`
            : '';

        showGenerationNotice({
          title: 'Schedule imported',
          message: `Loaded ${uniqueImportedCourses} course${uniqueImportedCourses !== 1 ? 's' : ''}.${missingSummary}`,
          tone: missingSummary ? 'warning' : 'info',
        });
      } catch (error) {
        console.error('Failed to import schedule', error);
        showGenerationNotice({
          title: 'Import failed',
          message: error instanceof Error ? error.message : 'Unknown error occurred.',
          tone: 'error',
        });
      } finally {
        event.target.value = '';
      }
    },
    [courses, handleDismissUndo, selectedTerm, showGenerationNotice, terms, updateConflicts]
  );

  const cancelTermChange = () => {
    setShowTermChangeConfirm(false);
    setPendingTerm(null);
  };

  // Toggle course selection in auto-generate mode
  const handleToggleCourseSelection = (courseCode: string) => {
    setSelectedCourseCodes(prev => {
      if (prev.includes(courseCode)) {
        // Removing a course
        const newCodes = prev.filter(code => code !== courseCode);
        
        // Only show confirmation if:
        // 1. This is the last course AND
        // 2. There are generated schedules to clear
        if (newCodes.length === 0 && generatedSchedules.length > 0) {
          setShowClearConfirm(true);
          return prev; // Don't remove yet, wait for confirmation
        }
        
        // Remove this course from generated schedules
        if (generatedSchedules.length > 0) {
          const updatedSchedules = generatedSchedules.map(schedule => ({
            ...schedule,
            sections: schedule.sections.filter(section => section.course.courseCode !== courseCode)
          }));
          setGeneratedSchedules(updatedSchedules);
          
          // Update currently displayed schedule
          if (selectedScheduleIndex < updatedSchedules.length) {
            const currentSchedule = updatedSchedules[selectedScheduleIndex];
            const schedulesWithColors = assignColorsToSchedule(currentSchedule.sections);
            setSelectedCourses(schedulesWithColors);
            updateConflicts(schedulesWithColors);
            setConflictToast([]);
          }
        }
        
        return newCodes;
      } else {
        // Adding a course
        return [...prev, courseCode];
      }
    });
  };

  // Handle schedule generation
  // Helper function to assign colors to a schedule
  const assignColorsToSchedule = (sections: SelectedCourse[], lockKeys: string[] = lockedSectionKeys): SelectedCourse[] => {
    const colorMap = new Map<string, string>();
    const usedColors: string[] = [];

    const cleaned = sections.filter(
      (sc): sc is SelectedCourse => Boolean(sc && sc.course && sc.selectedSection)
    );

    return cleaned.map(sc => {
      const courseCode = sc.course.courseCode;

      // Get or generate color for this course
      if (!colorMap.has(courseCode)) {
        const color = generateCourseColor(courseCode, usedColors);
        colorMap.set(courseCode, color);
        usedColors.push(color);
      }

      const key = `${courseCode}|${sc.selectedSection.sectionId}`;
      const locked = lockKeys.includes(key);
      return {
        ...sc,
        color: colorMap.get(courseCode)!,
        ...(locked ? { locked: true } : {}),
      };
    });
  };

  const handleGenerateSchedules = async () => {
    // In auto-generate mode, use selectedCourseCodes
    // In manual mode, use selectedCourses
    // Defensive clean-up to avoid undefined entries
    const cleanSelected = selectedCourses.filter(
      (sc): sc is SelectedCourse => Boolean(sc && sc.course && sc.selectedSection)
    );
    if (cleanSelected.length !== selectedCourses.length) {
      // Purge any invalid selections to avoid crashes
      setSelectedCourses(cleanSelected);
      showGenerationNotice({
        title: 'Fixed Invalid Selections',
        message: `Removed ${selectedCourses.length - cleanSelected.length} invalid item(s) from your schedule before generating.`,
        tone: 'info',
      });
    }
    let coursesToGenerate: Course[] = [];
    let lockedKeys: string[] = [];
    try {
      // Determine locked selections (act as constraints)
      const lockedSelections = cleanSelected.filter(sc => sc.locked);
      const lockedCodes = new Set(lockedSelections.map(sc => sc.course.courseCode));
      lockedKeys = lockedSelections.map(sc => `${sc.course.courseCode}|${sc.selectedSection.sectionId}`);
      setLockedSectionKeys(lockedKeys);

      // In auto mode, include any locked course codes even if not manually selected in chips
      const selectedCodesSet = new Set(
        (selectedCourseCodes.filter(Boolean) as string[]).map((s) => s.trim())
      );
      lockedCodes.forEach((code) => selectedCodesSet.add(code));

      const baseCoursesToGenerate = scheduleMode === 'auto-generate'
        ? courses.filter(c => selectedCodesSet.has(c.courseCode) && c.term === selectedTerm)
        : Array.from(new Map(cleanSelected.map(sc => [sc.course.courseCode, sc.course])).values());

      // Constrain locked courses to their locked sections only
      coursesToGenerate = baseCoursesToGenerate.map((c) => {
        if (!lockedCodes.has(c.courseCode)) return c;
        const allowedIds = new Set(
          lockedSelections
            .filter(sc => sc.course.courseCode === c.courseCode)
            .map(sc => sc.selectedSection.sectionId)
        );
        const constrainedSections = c.sections.filter(s => allowedIds.has(s.sectionId));
        return {
          ...c,
          sections: constrainedSections.length > 0 ? constrainedSections : c.sections,
        };
      });
    } catch (e) {
      console.error('Failed to prepare courses for generation', e, { selectedCourses, selectedCourseCodes });
      showGenerationNotice({
        title: 'Unable to Generate',
        message: 'A data issue occurred while preparing your selected courses. Try clearing your schedule and re-selecting courses.',
        tone: 'error',
      });
      setIsGenerating(false);
      return;
    }

    // Prevent generation if no courses are selected
    if (coursesToGenerate.length === 0) {
      showGenerationNotice({
        title: 'Add Courses to Begin',
        message: 'Select at least one course before generating schedules.',
        tone: 'info',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate schedules using the algorithm
      const schedules = generateSchedules(coursesToGenerate, {
        preference: selectedPreference,
        maxResults: 100,
        excludeFullSections,
      });

      setGeneratedSchedules(schedules);
      setSelectedScheduleIndex(0);

      // If we have schedules, load the first one with colors assigned
      if (schedules.length > 0) {
        const schedulesWithColors = assignColorsToSchedule(schedules[0].sections, lockedKeys);
        setSelectedCourses(schedulesWithColors);
        updateConflicts(schedulesWithColors);
        setConflictToast([]);
        // Auto-navigate to timetable on mobile so users see the result immediately
        if (isMobile) {
          setMobileView('timetable');
        }
      } else {
        showGenerationNotice({
          title: 'No Valid Schedules Found',
          message: 'Try selecting different courses, adjusting preferences, or allowing full sections.',
          tone: 'warning',
        });
        updateConflicts([]);
        setConflictToast([]);
      }

      console.log(`✨ Generated ${schedules.length} valid schedules`);
    } catch (error) {
      console.error('Error generating schedules:', error);
      showGenerationNotice({
        title: 'Error Generating Schedules',
        message: 'Something went wrong while building schedules. Please try again.',
        tone: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle drag and drop - move a course section to a new day
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragEnd = (courseCode: string, sectionId: string, newDay: DayOfWeek) => {
    setSelectedCourses(prev => {
      return prev.map(course => {
        // If this is the dragged course section, update its time slots to the new day
        if (course.course.courseCode === courseCode && course.selectedSection.sectionId === sectionId) {
          const updatedTimeSlots = course.selectedSection.timeSlots.map(slot => ({
            ...slot,
            day: newDay, // Move all time slots to the new day
          }));

          return {
            ...course,
            selectedSection: {
              ...course.selectedSection,
              timeSlots: updatedTimeSlots,
            },
          };
        }
        
        return course;
      });
    });
  };

  // Calculate stats
  const totalCredits = calculateTotalCredits(selectedCourses);
  const uniqueCourseCount = countUniqueCourses(selectedCourses);
  const conflicts = detectConflicts(selectedCourses);

  return (
    <div className="h-screen flex flex-col relative">
      <input
        type="file"
        accept="application/json"
        ref={importInputRef}
        onChange={handleImportSchedule}
        className="hidden"
        aria-hidden="true"
      />
      {/* Dark mode background overlay - ensures solid black */}
      <div className="fixed inset-0 bg-[#1e1e1e] -z-10 dark:block hidden" />
      
      {/* Header - Ultra compact */}
      <header className="bg-white/80 dark:bg-[#252526]/70 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-700/30 sticky top-0 z-50 flex-shrink-0">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <div className="flex items-center gap-2">
              <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Queuesis
              </div>
              {/* Mobile Quick Actions trigger near brand */}
              <button
                type="button"
                onClick={() => (isMobileActionsOpen ? closeMobileActions() : openMobileActions())}
                className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 ease-out shadow-sm active:scale-95 group
                           bg-gray-100/80 border-gray-200 text-gray-700 hover:bg-gray-200/80 hover:border-gray-300
                           dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                aria-label="Open quick actions"
                title="Quick actions"
                aria-expanded={isMobileActionsOpen}
              >
                <Menu className="w-4 h-4 transition-transform duration-200 ease-out group-hover:rotate-90 text-purple-600 dark:text-white" />
              </button>
              {/* Mobile GitHub link next to menu */}
              <a
                href="https://github.com/Aplkalex/Queuesis"
                target="_blank"
                rel="noopener noreferrer"
                className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 ease-out shadow-sm active:scale-95
                           bg-gray-100/80 border-gray-200 text-gray-700 hover:bg-gray-200/80 hover:border-gray-300
                           dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                aria-label="Open GitHub repository"
                title="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              {/* Mobile Import/Export near brand (timetable view) */}
              {isMobile && mobileView === 'timetable' && (
                <>
                  <button
                    type="button"
                    onClick={handleImportButtonClick}
                    className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 ease-out shadow-sm active:scale-95
                               bg-gray-100/80 border-gray-200 text-gray-700 hover:bg-gray-200/80 hover:border-gray-300
                               dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    title="Import schedule"
                    aria-label="Import schedule"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSchedule}
                    disabled={selectedCourses.length === 0}
                    className={`ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 ease-out shadow-sm active:scale-95 ${
                      selectedCourses.length === 0
                        ? 'bg-gray-100/60 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-white/5 dark:text-gray-500 dark:border-white/10'
                        : 'bg-gray-100/80 text-green-600 border-gray-200 hover:bg-gray-200/80 hover:border-gray-300 dark:bg-white/5 dark:text-green-400 dark:border-white/10 dark:hover:bg-white/10'
                    }`}
                    title="Export schedule"
                    aria-label="Export schedule"
                    aria-disabled={selectedCourses.length === 0}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Stats and Theme Toggle - Compact */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* GitHub link (desktop) */}
              <a
                href="https://github.com/Aplkalex/Queuesis"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 ease-out shadow-sm hover:shadow-md active:scale-95
                           bg-gray-100/80 border-gray-200 text-gray-700 hover:bg-gray-200/80 hover:border-gray-300
                           dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                aria-label="Open GitHub repository"
                title="GitHub"
              >
                <Github className="w-4.5 h-4.5" />
              </a>
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>
              
              {/* Test Mode Toggle (hidden unless explicitly enabled) */}
              {ENABLE_TEST_MODE && (
                <button
                  onClick={() => {
                    const newTestMode = !isTestMode;
                    setIsTestMode(newTestMode);
                    // Switch to T2 when entering test mode (test courses are in T2)
                    if (newTestMode) {
                      setSelectedTerm('2025-26-T2');
                    }
                    // Clear selections when switching modes
                    setSelectedCourses([]);
                    setSelectedCourseCodes([]);
                    setGeneratedSchedules([]);
                    setSelectedScheduleIndex(0);
                  }}
                  className={`
                    hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200 shadow-sm
                    ${isTestMode 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                  title={isTestMode ? 'Switch to Normal Mode' : 'Switch to Test Mode (Large Courses)'}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Test</span>
                </button>
              )}

              <div className="text-center">
                <div className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 dark:text-purple-400">{uniqueCourseCount}</div>
                <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">Courses</div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-lg lg:text-xl font-bold text-purple-600 dark:text-purple-400">{totalCredits}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">Credits</div>
              </div>
              {conflicts.length > 0 && (
                <div className="text-center">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-red-600 dark:text-red-400">{conflicts.length}</div>
                  <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">Conflicts</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full px-2 sm:px-4 lg:px-6 py-2 lg:py-3 bg-transparent flex flex-col ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {/* Warnings container - only takes space when needed */}
        <div className="max-w-[1600px] w-full mx-auto space-y-2 mb-2 flex-shrink-0">
          {/* Term availability notice - Red, dismissible (match disclaimer styling) */}
          {showTerm2OnlyNotice && (
            <div className="bg-red-50/70 dark:bg-red-900/10 backdrop-blur-md border border-red-200/50 dark:border-red-800/30 rounded-lg p-2 flex items-center gap-2 shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-[11px] sm:text-xs text-red-800 dark:text-red-300 flex-1">
                Current version only has 2025-26 Term 2 data. Other terms may be incomplete or unavailable.
              </p>
              <button
                onClick={() => setShowTerm2OnlyNotice(false)}
                className="p-0.5 hover:bg-red-200/50 dark:hover:bg-red-800/30 rounded transition-colors flex-shrink-0"
                aria-label="Dismiss term availability notice"
              >
                <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              </button>
            </div>
          )}
          {/* Test Mode Banner (hidden unless explicitly enabled) */}
          {ENABLE_TEST_MODE && isTestMode && (
            <div className="bg-emerald-50/70 dark:bg-emerald-900/10 backdrop-blur-md border border-emerald-200/50 dark:border-emerald-800/30 rounded-lg p-2 flex items-center gap-2 shadow-lg">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <p className="text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 flex-1">
                <strong>Test Mode Active:</strong> Using large test courses (ECON 102, STAT 305, CPSC 221) to evaluate auto-scheduler performance with many sections.
              </p>
            </div>
          )}
          
          {/* Disclaimer - Compact and dismissible */}
          {showDisclaimer && (
            <div className="bg-amber-50/70 dark:bg-amber-900/10 backdrop-blur-md border border-amber-200/50 dark:border-amber-800/30 rounded-lg p-2 flex items-center gap-2 shadow-lg">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 flex-1">{DISCLAIMER}</p>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 rounded transition-colors flex-shrink-0"
                aria-label="Dismiss disclaimer"
              >
                <X className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </button>
            </div>
          )}

          {termsError && (
            <div className="bg-red-50/75 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/60 rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-[11px] sm:text-xs text-red-700 dark:text-red-200 flex-1">
                Unable to refresh term list. {termsError}
              </p>
              <button
                onClick={retryFetchTerms}
                className="px-2 py-1 text-[11px] font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {isTermsLoading && !termsError && (
            <div className="bg-white/70 dark:bg-[#252526]/70 border border-gray-200/50 dark:border-gray-700/50 rounded-lg px-3 py-2 text-[11px] text-gray-600 dark:text-gray-300 shadow-inner">
              Syncing latest term info…
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 w-full flex-1 min-h-0">
          {/* Left sidebar - Fixed width with Course search and My Schedule */}
          <div className={`w-full lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px] flex flex-col ${isMobile ? '' : 'min-h-0 flex-shrink-0'} ${isMobile && mobileView !== 'courses' ? 'hidden' : ''}`}>
            {/* Scrollable sidebar content */}
            <div
              className={`${isMobile ? '' : 'flex-1 overflow-y-auto overflow-x-hidden min-h-0'} space-y-3 pr-1 pb-32 lg:pb-0 scrollbar-thin scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent`}
              style={isMobile ? undefined : { WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {/* Mode Toggle (desktop only) */}
              <div className="hidden lg:block bg-white/70 dark:bg-[#252526]/70 backdrop-blur-xl rounded-xl shadow-lg p-2 border border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1e1e1e]/50 rounded-lg">
                <button
                  onClick={() => handleModeSwitch('auto-generate')}
                  disabled={isSwitchingMode}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    scheduleMode === 'auto-generate'
                      ? 'bg-white dark:bg-[#2d2d30] text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  } ${isSwitchingMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Sparkles className="w-4 h-4" />
                  Auto-Generate
                </button>
                <button
                  onClick={() => handleModeSwitch('manual')}
                  disabled={isSwitchingMode}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    scheduleMode === 'manual'
                      ? 'bg-white dark:bg-[#2d2d30] text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                  Manual
                </button>
              </div>
            </div>

            {/* My Schedule - Collapsible */}
            <div className="bg-white/70 dark:bg-[#252526]/70 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/30 dark:border-gray-700/30 flex-shrink-0 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      My Schedule
                    </h2>
                    <TermSelector
                      terms={terms}
                      selectedTerm={selectedTerm}
                      onChange={handleTermChange}
                      isLoading={isTermsLoading}
                      supportedTermId={'2025-26-T2'}
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 px-1 py-0.5 rounded-lg border border-gray-200/70 dark:border-gray-700/40 bg-white/70 dark:bg-[#1e1e1e]/60">
                    <button
                      onClick={handleImportButtonClick}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors"
                      title="Import schedule"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleExportSchedule}
                      disabled={selectedCourses.length === 0}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                        selectedCourses.length === 0
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed bg-transparent'
                          : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title="Export schedule"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    {selectedCourses.length > 0 && (
                      <button
                        onClick={handleClearSchedule}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Clear All"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsScheduleCollapsed(!isScheduleCollapsed)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title={isScheduleCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {isScheduleCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {!isScheduleCollapsed && selectedCourses.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {uniqueCourseCount} course{uniqueCourseCount !== 1 ? 's' : ''} • {calculateTotalCredits(selectedCourses)} credits
                  </div>
                )}
              </div>

              {/* Selected Courses - Collapsible content */}
              {!isScheduleCollapsed && selectedCourses.length > 0 && (
                <div className="px-4 py-3 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent">
                  <div className="space-y-2">
                    {selectedCourses.map((sc, idx) => {
                      const isExpanded = expandedScheduleCourse === idx;
                      const section = sc.selectedSection;
                      const hasSeats = hasAvailableSeats(section);
                      
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden transition-all"
                          style={{ 
                            backgroundColor: `${sc.color}10`,
                            borderColor: `${sc.color}40`
                          }}
                        >
                          {/* Section Header */}
                          <div className="group flex items-center gap-2 p-2 hover:bg-white/50 dark:hover:bg-black/20 transition-all">
                            <button
                              onClick={() => setExpandedScheduleCourse(isExpanded ? null : idx)}
                              className="flex-shrink-0 p-0.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: sc.color }}
                            />
                            <button
                              onClick={() => setExpandedScheduleCourse(isExpanded ? null : idx)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                                {sc.course.courseCode}
                              </div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                {section.sectionType} {section.sectionId}
                              </div>
                            </button>
                            <button
                              onClick={() => !sc.locked && handleRemoveCourse(idx)}
                              disabled={sc.locked}
                              className={`p-1 rounded transition-all opacity-60 group-hover:opacity-100 ${sc.locked ? 'text-gray-400 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                              title={sc.locked ? 'Unlock to remove' : 'Remove course'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            {/* Lock/Unlock toggle */}
                            <button
                              onClick={() => {
                                setSelectedCourses(prev => prev.map((item, i) => i === idx ? { ...item, locked: !item.locked } : item));
                                setLockedSectionKeys(prev => {
                                  const key = `${sc.course.courseCode}|${sc.selectedSection.sectionId}`;
                                  const set = new Set(prev);
                                  if (set.has(key)) set.delete(key); else set.add(key);
                                  return Array.from(set);
                                });
                              }}
                              className={`p-1 rounded transition-all opacity-60 group-hover:opacity-100 ${sc.locked ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'}`}
                              title={sc.locked ? 'Unlock (allow changes)' : 'Lock (fix this section)'}
                            >
                              {sc.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Expanded Section Details */}
                          {isExpanded && (
                            <div className="px-3 py-2 bg-white/30 dark:bg-black/20 border-t border-gray-200/50 dark:border-gray-600/50 space-y-2">
                              {/* Schedule */}
                              <div>
                                <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Schedule
                                </div>
                                <div className="space-y-1">
                                  {section.timeSlots.map((slot, slotIdx) => (
                                    <div key={slotIdx} className="text-[10px] text-gray-600 dark:text-gray-400">
                                      {slot.day} {slot.startTime} - {slot.endTime}
                                      {slot.location && (
                                        <button
                                          type="button"
                                          onClick={() => handleLocationClick(slot.location!)}
                                          className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 ml-1 transition-colors"
                                          title={`Open ${slot.location} on map`}
                                        >
                                          <span aria-hidden>📍</span>
                                          <span className="underline decoration-dotted underline-offset-2">
                                            {slot.location}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Instructor */}
                              {section.instructor && (
                                <div>
                                  <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    👤 Instructor
                                  </div>
                                  <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                    {section.instructor.name}
                                  </div>
                                </div>
                              )}

                              {/* Enrollment Status */}
                              <div>
                                <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                  📊 Enrollment
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Status:
                                  </span>
                                  <span className={`font-semibold px-1.5 py-0.5 rounded ${
                                    hasSeats 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  }`}>
                                    {hasSeats ? 'Open' : 'Closed'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] mt-1">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Enrolled / Quota:
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {section.enrolled} / {section.quota}
                                  </span>
                                </div>
                                {hasSeats && (
                                  <div className="flex items-center justify-between text-[10px] mt-1">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Seats Remaining:
                                    </span>
                                    <span className="font-semibold text-green-700 dark:text-green-400">
                                      {section.seatsRemaining}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Quick actions: Lock all / Unlock all for this course */}
                              <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const code = sc.course.courseCode;
                                    setSelectedCourses(prev => prev.map(item =>
                                      item.course.courseCode === code ? { ...item, locked: true } : item
                                    ));
                                    setLockedSectionKeys(prev => {
                                      const set = new Set(prev);
                                      selectedCourses
                                        .filter((item): item is SelectedCourse => Boolean(item && item.course && item.selectedSection))
                                        .filter(item => item.course.courseCode === code)
                                        .forEach(item => set.add(`${item.course.courseCode}|${item.selectedSection.sectionId}`));
                                      return Array.from(set);
                                    });
                                  }}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white"
                                  title="Lock all sections of this course"
                                >
                                  <Lock className="w-3 h-3 inline-block mr-1" />
                                  Lock All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const code = sc.course.courseCode;
                                    setSelectedCourses(prev => prev.map(item =>
                                      item.course.courseCode === code ? { ...item, locked: false } : item
                                    ));
                                    setLockedSectionKeys(prev => {
                                      const set = new Set(prev);
                                      selectedCourses
                                        .filter((item): item is SelectedCourse => Boolean(item && item.course && item.selectedSection))
                                        .filter(item => item.course.courseCode === code)
                                        .forEach(item => set.delete(`${item.course.courseCode}|${item.selectedSection.sectionId}`));
                                      return Array.from(set);
                                    });
                                  }}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                                  title="Unlock all sections of this course"
                                >
                                  <Unlock className="w-3 h-3 inline-block mr-1" />
                                  Unlock All
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!isScheduleCollapsed && selectedCourses.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No courses added yet
                  </p>
                </div>
              )}
            </div>

            {/* Mini Timetable Preview (mobile) */}
            {isMobile && selectedCourses.length > 0 && (
              <div className="bg-white/70 dark:bg-[#252526]/70 backdrop-blur-xl rounded-xl shadow-lg p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">This Week</h3>
                  </div>
                  <button
                    type="button"
                    onClick={openFullTimetable}
                    className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-[11px] font-semibold"
                  >
                    Open
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5 h-16">
                  {(['Monday','Tuesday','Wednesday','Thursday','Friday'] as const).map((day) => (
                    <div key={day} className="relative rounded-md bg-white/40 dark:bg-white/[0.06] border border-gray-200/50 dark:border-white/[0.08] overflow-hidden pt-3">
                      <div className="absolute inset-x-0 top-0 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pointer-events-none">
                        {WEEKDAY_SHORT[day]}
                      </div>
                      {previewData[day].map((b, i) => (
                        <div
                          key={i}
                          className="absolute left-0.5 right-0.5 rounded-sm"
                          style={{
                            top: `calc(0.9 * ${b.topPct}% )`,
                            height: `calc(0.9 * ${b.heightPct}%)`,
                            backgroundColor: b.color,
                            opacity: 0.85,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Search */}
            <div className="bg-white/70 dark:bg-[#252526]/70 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Book className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Find Courses</h2>
              </div>

              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search courses..."
                className="mb-3"
              />

              <FilterBar
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              >
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                    Department
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <FilterButton
                      active={selectedDepartment === null}
                      onClick={() => setSelectedDepartment(null)}
                    >
                      All
                    </FilterButton>
                    {departmentOptions.map((opt) => (
                      <FilterButton
                        key={opt.value}
                        active={selectedDepartment === opt.value}
                        onClick={() => setSelectedDepartment(opt.value)}
                      >
                        <span title={opt.value} className="whitespace-nowrap">
                          {opt.code ? `${opt.code} — ${opt.label}` : opt.label}
                        </span>
                      </FilterButton>
                    ))}
                  </div>
                </div>
              </FilterBar>
            </div>

            {/* Course list - Scrollable - Takes remaining space */}
            <div className="space-y-3">
              {courseFetchError && (
                <div className="p-3 rounded-lg border border-red-200/70 dark:border-red-800/60 bg-red-50/70 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-200 flex items-center justify-between gap-3">
                  <span className="flex-1">Failed to load courses. {courseFetchError}</span>
                  <button
                    onClick={retryFetchCourses}
                    className="px-2 py-1 rounded-md bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {isCoursesLoading && !courseFetchError && (
                <div className="p-3 rounded-lg border border-purple-200/60 dark:border-purple-800/50 bg-white/70 dark:bg-[#1e1e1e]/60 text-xs text-purple-700 dark:text-purple-200 shadow-inner">
                  Loading courses…
                </div>
              )}

              <CourseList
                courses={filteredCourses}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                selectedCourses={selectedCourses}
                selectedCourseMap={selectedCourseMap}
                mode={scheduleMode}
                selectedCourseCodes={selectedCourseCodes}
                onToggleCourseSelection={handleToggleCourseSelection}
              />
            </div>
            </div>
          </div>

          {/* Right side - Preferences + Timetable */}
          <div className={`flex-1 min-w-0 flex flex-col min-h-0 gap-3 ${isMobile && mobileView !== 'timetable' ? 'hidden' : ''}`}>
            {/* Compact Preferences Bar - Only in Auto-Generate mode when courses selected */}
            {scheduleMode === 'auto-generate' && selectedCourseCodes.length > 0 && (
              isMobile ? null : (
              <div className="bg-white/90 dark:bg-[#252526]/90 backdrop-blur-xl rounded-xl shadow-lg p-2.5 border border-gray-200/50 dark:border-gray-700/30 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {/* Course Count Badge */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md flex-shrink-0">
                    <Book className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                      {selectedCourseCodes.length}
                    </span>
                  </div>

                  {/* Compact Course Pills - Scrollable with better sizing */}
                  <div className="flex gap-1 overflow-x-auto scrollbar-none max-w-[300px] lg:max-w-[400px]">
                    {selectedCourseCodes.map(code => (
                      <div
                        key={code}
                        className="group flex items-center gap-1 px-2 py-1 bg-purple-600 dark:bg-purple-700 rounded-md whitespace-nowrap flex-shrink-0"
                      >
                        <span className="text-xs font-bold text-white">
                          {code}
                        </span>
                        <button
                          onClick={() => handleToggleCourseSelection(code)}
                          className="text-white/70 hover:text-white hover:bg-white/20 rounded-full p-0.5 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Compact Preferences - Buttons with hover text */}
                  <div className="flex gap-1 flex-1 justify-center">
                    {PREFERENCE_OPTIONS.map((pref) => (
                      <button
                        key={pref.id}
                        onClick={() => setSelectedPreference(selectedPreference === pref.id ? null : pref.id)}
                        className={`group relative px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                          selectedPreference === pref.id
                            ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-[#2d2d30] border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <span className="text-sm leading-none">{pref.icon}</span>
                        <span className={`text-[10px] font-medium whitespace-nowrap transition-all ${
                          selectedPreference === pref.id 
                            ? 'opacity-100 max-w-20' 
                            : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-20'
                        }`}>
                          {pref.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Skip Full Sections Toggle */}
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-white/50 dark:bg-[#1e1e1e]/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Skip full
                    </span>
                    <button
                      onClick={() => setExcludeFullSections(!excludeFullSections)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ${
                        excludeFullSections 
                          ? 'bg-purple-600 dark:bg-purple-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={excludeFullSections}
                      title={excludeFullSections ? "Skip full sections: ON" : "Skip full sections: OFF"}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
                          excludeFullSections ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Compact Generate Button */}
                  <button
                    onClick={handleGenerateSchedules}
                    disabled={!hasCourseSelectionForGeneration || isGenerating}
                    aria-disabled={!hasCourseSelectionForGeneration || isGenerating}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed text-xs flex-shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Gen...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span className="hidden sm:inline">Generate</span>
                      </>
                    )}
                  </button>

                  {/* Schedule Navigator - Show when schedules are generated */}
                  {generatedSchedules.length > 0 && (
                    <div className={`flex items-center gap-2 flex-shrink-0 px-3 py-2 rounded-xl border ${
                      generatedSchedules.length > 1 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800'
                        : 'bg-gradient-to-r from-purple-50 to-purple-50 dark:from-purple-950/20 dark:to-purple-950/20 border-purple-200 dark:border-purple-700'
                    }`}>
                      {/* Previous button - Only show if more than 1 schedule */}
                      {generatedSchedules.length > 1 && (
                              <button
                                onClick={() => {
                                  const newIndex = selectedScheduleIndex > 0 ? selectedScheduleIndex - 1 : generatedSchedules.length - 1;
                                  setSelectedScheduleIndex(newIndex);
                                  const schedulesWithColors = assignColorsToSchedule(generatedSchedules[newIndex].sections);
                                  setSelectedCourses(schedulesWithColors);
                                  updateConflicts(schedulesWithColors);
                                  setConflictToast([]);
                                }}
                          className="p-2 bg-white dark:bg-[#1e1e1e] rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-all shadow-sm hover:shadow-md"
                          title="Previous schedule"
                        >
                          <ChevronDown className="w-4 h-4 rotate-90 text-green-600 dark:text-green-400" />
                        </button>
                      )}

                      {/* Counter */}
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {generatedSchedules.length > 1 
                            ? `${selectedScheduleIndex + 1} / ${generatedSchedules.length}`
                            : '1 schedule'
                          }
                        </span>
                      </div>

                      {/* Next button - Only show if more than 1 schedule */}
                      {generatedSchedules.length > 1 && (
                              <button
                                onClick={() => {
                                  const newIndex = selectedScheduleIndex < generatedSchedules.length - 1 ? selectedScheduleIndex + 1 : 0;
                                  setSelectedScheduleIndex(newIndex);
                                  const schedulesWithColors = assignColorsToSchedule(generatedSchedules[newIndex].sections);
                                  setSelectedCourses(schedulesWithColors);
                                  updateConflicts(schedulesWithColors);
                                  setConflictToast([]);
                                }}
                          className="p-2 bg-white dark:bg-[#1e1e1e] rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-all shadow-sm hover:shadow-md"
                          title="Next schedule"
                        >
                          <ChevronDown className="w-4 h-4 -rotate-90 text-green-600 dark:text-green-400" />
                        </button>
                      )}

                      {/* Divider */}
                      <div className={`h-6 w-px ${
                        generatedSchedules.length > 1
                          ? 'bg-green-300 dark:bg-green-700'
                          : 'bg-purple-300 dark:bg-purple-700'
                      }`}></div>

                      {/* Clear button */}
                      <button
                        onClick={handleClearSchedule}
                        className="p-2 bg-white dark:bg-[#1e1e1e] rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shadow-sm hover:shadow-md group"
                        title="Clear schedules"
                      >
                        <X className="w-4 h-4 text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )
            )}

            {!isMobile && (
              <div className="flex items-center justify-end gap-2 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                Style
              </span>
              <div className="inline-flex overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-[10px] font-semibold uppercase tracking-[0.16em]">
                <button
                  type="button"
                  onClick={() => setTimetableAppearance('modern')}
                  className={`px-2.5 py-1 transition-colors ${
                    timetableAppearance === 'modern'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/10'
                  }`}
                >
                  Modern
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableAppearance('frosted')}
                  className={`px-2.5 py-1 transition-colors border-l border-gray-200/60 dark:border-gray-700/40 ${
                    timetableAppearance === 'frosted'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/10'
                  }`}
                >
                  Frosted
                </button>
              </div>
            </div>
            )}

            {/* Timetable - Scrollable area */}
            <div ref={timetableRef} className={`flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent min-h-0 ${isMobile ? 'pb-44' : ''}`}>
              {selectedCourses.length > 0 ? (
                <TimetableGrid
                  selectedCourses={selectedCourses}
                  onCourseClick={handleCourseClick}
                  onRemoveCourse={handleCourseClickRemove}
                  onLocationClick={handleLocationClick}
                  conflictingCourses={conflictingCourses}
                  enableDragDrop={true}
                  onSwapLectures={handleSwapLectureSection}
                  onSwapTutorials={handleSwapTutorialSection}
                  availableCourses={availableCourses}
                  onSwapWarning={handleSwapWarning}
                  appearance={timetableAppearance}
                />
              ) : (
                <div className={`${emptyTimetableClassName} rounded-xl shadow-lg p-8 lg:p-12 text-center transition-colors`}>
                  <Calendar className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Your schedule is empty
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Search for courses and click the + button to add them to your schedule
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Controls */}
      {/* Tabs bar (Courses | Timetable) - show only when no other mobile bottom bar is visible */}
      {isMobile && !((mobileView === 'courses' && showMobileGenerateBar) || (mobileView === 'timetable' && generatedSchedules.length > 0)) && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0)+8px)]">
          <div className={`mx-auto max-w-md ${sheetClassName} rounded-full p-1 flex items-center justify-between`}>
            <button
              type="button"
              onClick={() => setMobileView('courses')}
              className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold transition ${mobileView === 'courses' ? 'bg-purple-600 text-white shadow' : 'text-gray-700 dark:text-gray-300'}`}
            >
              Courses
            </button>
            <button
              type="button"
              onClick={() => setMobileView('timetable')}
              disabled={selectedCourses.length === 0}
              className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold transition ${mobileView === 'timetable' ? 'bg-purple-600 text-white shadow' : selectedCourses.length === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}
            >
              Timetable
            </button>
          </div>
        </div>
      )}

      {/* Sticky Generate Bar (Mobile) - courses view only */}
      {showMobileGenerateBar && isMobile && mobileView === 'courses' && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0)+8px)] z-40 px-3 pb-2 animate-fadeIn">
          <div
            className={`mx-auto max-w-md rounded-2xl ${sheetClassName} shadow-[0_16px_40px_-12px_rgba(88,28,135,0.35)]`}
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={openSelectedCoursesSheet}
                className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md active:scale-[0.97] transition"
                title="View selected courses"
              >
                <Book className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  {selectedCourseCodes.length} {selectedCourseCodes.length === 1 ? 'course' : 'courses'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openPreferencePicker()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-[#1e1e1e]/70 text-xs font-semibold text-gray-700 dark:text-gray-200 active:scale-[0.98] transition"
                title="Break preference"
              >
                <span className="text-sm">
                  {(() => {
                    switch (selectedPreference) {
                      case 'shortBreaks': return '⚡';
                      case 'longBreaks': return '☕';
                      case 'daysOff': return '🗓️';
                      case 'startLate': return '🌅';
                      case 'endEarly': return '🌆';
                      case 'consistentStart': return '🎯';
                      default: return '🎛️';
                    }
                  })()}
                </span>
                <span className="truncate">
                  {(() => {
                    switch (selectedPreference) {
                      case 'shortBreaks': return 'Short breaks';
                      case 'longBreaks': return 'Long breaks';
                      case 'daysOff': return 'Days off';
                      case 'startLate': return 'Start late';
                      case 'endEarly': return 'End early';
                      case 'consistentStart': return 'Consistent';
                      default: return 'Preference';
                    }
                  })()}
                </span>
              </button>

              <button
                type="button"
                onClick={handleGenerateSchedules}
                disabled={!hasCourseSelectionForGeneration || isGenerating}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed text-xs"
                aria-disabled={!hasCourseSelectionForGeneration || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gen...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Timetable bottom bar (Mobile) - timetable view only */}
      {isMobile && mobileView === 'timetable' && generatedSchedules.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0)+8px)] z-40 px-3 pb-2">
          <div className={`mx-auto max-w-md rounded-2xl ${sheetClassName} shadow-[0_16px_40px_-12px_rgba(88,28,135,0.35)]`}>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <button
                type="button"
                onClick={openSelectedCoursesSheet}
                className="flex items-center gap-1 px-2 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-900/40 dark:text-purple-200"
                title="View selected courses"
              >
                <Book className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{selectedCourses.length} {selectedCourses.length === 1 ? 'course' : 'courses'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileView('courses')}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-[#1e1e1e]/70 text-xs font-semibold text-gray-700 dark:text-gray-200"
                title="Back to courses"
              >
                Courses
              </button>
              <div className="flex items-center gap-1">
                {generatedSchedules.length > 1 && (
                  <button
                    onClick={() => {
                      const newIndex = selectedScheduleIndex > 0 ? selectedScheduleIndex - 1 : generatedSchedules.length - 1;
                      setSelectedScheduleIndex(newIndex);
                      const schedulesWithColors = assignColorsToSchedule(generatedSchedules[newIndex].sections);
                      setSelectedCourses(schedulesWithColors);
                      updateConflicts(schedulesWithColors);
                      setConflictToast([]);
                    }}
                    className="px-2 py-2 rounded-xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700"
                    title="Previous schedule"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>
                )}
                <div className="px-3 py-2 rounded-xl bg-white/60 dark:bg-[#1e1e1e]/60 text-xs font-bold">
                  {generatedSchedules.length > 1 ? `${selectedScheduleIndex + 1}/${generatedSchedules.length}` : '1/1'}
                </div>
                {generatedSchedules.length > 1 && (
                  <button
                    onClick={() => {
                      const newIndex = selectedScheduleIndex < generatedSchedules.length - 1 ? selectedScheduleIndex + 1 : 0;
                      setSelectedScheduleIndex(newIndex);
                      const schedulesWithColors = assignColorsToSchedule(generatedSchedules[newIndex].sections);
                      setSelectedCourses(schedulesWithColors);
                      updateConflicts(schedulesWithColors);
                      setConflictToast([]);
                    }}
                    className="px-2 py-2 rounded-xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700"
                    title="Next schedule"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerateSchedules}
                disabled={!hasCourseSelectionForGeneration || isGenerating}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed text-xs"
                aria-disabled={!hasCourseSelectionForGeneration || isGenerating}
                title="Regenerate"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gen...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected courses quick sheet (mobile) */}
      {isMobile && (isSelectedCoursesSheetOpen || isSelectedCoursesSheetClosing) && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={`absolute inset-0 bg-black/45 ${isSelectedCoursesSheetClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            onClick={closeSelectedCoursesSheet}
          />
          <div
            className={`absolute bottom-0 inset-x-0 rounded-t-3xl ${sheetClassName} p-5 space-y-4 max-h-[70vh] overflow-y-auto ${isSelectedCoursesSheetClosing ? 'animate-slideDown' : 'animate-slideUp'} transform-gpu`}
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Selected courses</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tap a course to view details.</p>
              </div>
              <button
                type="button"
                onClick={closeSelectedCoursesSheet}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                aria-label="Close selected courses"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              // In auto-generate mode before generating, selectedCourses may be empty; use selectedCourseCodes fallback.
              const hasSectionSelections = selectedCourses.length > 0;
              const list = hasSectionSelections
                ? selectedCourses.map((sc) => ({
                    key: `${sc.course.courseCode}-${sc.selectedSection.sectionId}`,
                    title: `${sc.course.courseCode} • ${sc.selectedSection.sectionType} ${sc.selectedSection.sectionId}`,
                    sub: sc.selectedSection.timeSlots
                      .map((slot) => `${slot.day} ${slot.startTime}-${slot.endTime}`)
                      .join(', '),
                    color: sc.color ?? '#8B5CF6',
                    onClick: () => {
                      setSelectedCourseDetails(sc);
                      closeSelectedCoursesSheet();
                    },
                  }))
                : selectedCourseCodes.map((code) => {
                    const courseInfo = courses.find((c) => c.courseCode === code);
                    return {
                      key: code,
                      title: courseInfo ? `${courseInfo.courseCode} • ${courseInfo.courseName}` : code,
                      sub: courseInfo ? courseInfo.sections.length ? `${courseInfo.sections.length} sections` : 'No sections loaded' : 'Course selected',
                      color: '#8B5CF6',
                      onClick: () => {
                        // Jump to courses tab and scroll the course into view if possible
                        setMobileView('courses');
                        closeSelectedCoursesSheet();
                        // no direct scroll target available here without refs
                      },
                    };
                  });

              if (list.length === 0) {
                return <p className="text-sm text-gray-500 dark:text-gray-400">You haven&apos;t added any courses yet.</p>;
              }

              return (
                <div className="space-y-2">
                  {list.map((item) => (
                    <button
                      key={item.key}
                      onClick={item.onClick}
                      className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-[#1e1e1e]/70 hover:bg-white dark:hover:bg-[#1e1e1e]/90 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{item.sub}</span>
                        </div>
                        <span
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: item.color, borderColor: item.color }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Building Reference floating button */}
      <div className="hidden lg:block">
        <BuildingReference onBuildingClick={setSelectedLocation} />
      </div>

      {isMobile && (
        <>
          {/* Bottom-right FAB removed on mobile in favor of header trigger */}

          {(isMobileActionsOpen || isMobileActionsClosing) && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className={`absolute inset-0 bg-black/45 ${isMobileActionsClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                onClick={() => closeMobileActions()}
              />
          <div className={`absolute bottom-0 inset-x-0 rounded-t-3xl ${sheetClassName} p-5 space-y-4 max-h-[85vh] overflow-y-auto ${isMobileActionsClosing ? 'animate-slideDown' : 'animate-slideUp'} transform-gpu`} style={{willChange:'transform'}}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick actions</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Switch modes, tweak appearance, or open references.</p>
              </div>
                  <button
                    type="button"
                    onClick={() => closeMobileActions()}
                    className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Mode</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSwitchingMode}
                      onClick={() => handleModeSwitch('auto-generate')}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${scheduleMode === 'auto-generate' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1e1e1e]'}`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      disabled={isSwitchingMode}
                      onClick={() => handleModeSwitch('manual')}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${scheduleMode === 'manual' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1e1e1e]'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Timetable style</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTimetableAppearance('modern')}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${timetableAppearance === 'modern' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1e1e1e]'}`}
                    >
                      Modern
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimetableAppearance('frosted')}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${timetableAppearance === 'frosted' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#1e1e1e]'}`}
                    >
                      Frosted
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Theme</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Light / Dark</p>
                  </div>
                  <ThemeToggle />
                </div>

                

                <BuildingReference
                  onBuildingClick={(location) => {
                    setSelectedLocation(location);
                  }}
                  renderTrigger={(open) => (
                    <button
                      type="button"
                      onClick={open}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-colors
                                 border-gray-200 bg-white/80 hover:bg-white
                                 dark:border-purple-700 dark:bg-gradient-to-r dark:from-[#12011f] dark:to-[#200033]"
                    >
                      <div className="flex-1 pr-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Building reference</p>
                        <p className="text-[11px] text-gray-600 dark:text-purple-200">Find campus locations quickly</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center
                                      bg-gray-100 text-purple-600
                                      dark:bg-white/15 dark:text-purple-200">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                />

                <button
                  type="button"
                  onClick={() => closeMobileActions()}
                  className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Generation Notice Modal */}
      {generationNotice && (() => {
        const tone = generationNotice.tone;
        const toneStyles = {
          info: {
            iconWrapper: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200',
            title: 'text-blue-900 dark:text-blue-100',
            button: 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400',
            accent: 'bg-black',
          },
          warning: {
            iconWrapper: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-200',
            title: 'text-amber-900 dark:text-amber-100',
            button: 'bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-400',
            accent: 'bg-black',
          },
          error: {
            iconWrapper: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-200',
            title: 'text-rose-900 dark:text-rose-100',
            button: 'bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-400',
            accent: 'bg-black',
          },
        } as const;
        const styles = toneStyles[tone];
        const Icon = tone === 'info' ? Info : tone === 'warning' ? AlertTriangle : AlertCircle;
        return (
          <div
            className="fixed inset-0 z-[9999] bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
            onClick={dismissGenerationNotice}
          >
            <div
              className="relative w-full max-w-md bg-white/95 dark:bg-[#131313]/95 rounded-2xl shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden animate-slideUp"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-full shadow ${styles.iconWrapper}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${styles.title}`}>
                      {generationNotice.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {generationNotice.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={dismissGenerationNotice}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition p-1"
                    aria-label="Dismiss message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={dismissGenerationNotice}
                    className={`${styles.button} text-white font-semibold px-4 py-2 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/40 transition-transform hover:scale-[1.01]`}
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all border border-gray-200/40 dark:border-gray-700/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Clear Schedule?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This will remove all courses</p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to clear your entire schedule? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#2d2d30] text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearSchedule}
                className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preference Picker (mobile bottom sheet with native wheel select)
         - Uses OS spinner for excellent performance and accessibility on phones */}
      {(isPreferencePickerOpen || isPreferencePickerClosing) && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={`absolute inset-0 bg-black/45 ${isPreferencePickerClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            onClick={() => closePreferencePicker()}
          />
          <div className={`absolute bottom-0 inset-x-0 rounded-t-3xl ${sheetClassName} p-5 space-y-4 max-h-[70vh] ${isPreferencePickerClosing ? 'animate-slideDown' : 'animate-slideUp'} transform-gpu`} style={{willChange:'transform'}}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Break Preference</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Choose how we treat gaps between classes</p>
              </div>
              <button
                type="button"
                onClick={() => closePreferencePicker()}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preference grid (replaces plain select) */}
            <div className="grid grid-cols-2 gap-2">
              {([{id: null as PreferenceId | null, icon: '🎛️', label: 'No preference'}] as const)
                .concat(PREFERENCE_OPTIONS as any)
                .map((opt: any) => {
                  const active = selectedPreference === opt.id || (opt.id === null && selectedPreference === null);
                  return (
                    <button
                      key={`${opt.id ?? 'none'}`}
                      type="button"
                      onClick={() => startPrefTransition(() => setSelectedPreference(opt.id))}
                      aria-pressed={active}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition-all text-sm transform-gpu ${
                        active
                          ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/25'
                          : 'bg-white/70 dark:bg-[#1e1e1e]/70 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-white/80 dark:hover:bg-[#252526]'
                      }`}
                    >
                      <span className="text-base">{opt.icon}</span>
                      <span className="font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center justify-between mt-2 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Skip full sections</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Ignore sections without seats</p>
              </div>
              <button
                onClick={() => setExcludeFullSections(!excludeFullSections)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  excludeFullSections ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={excludeFullSections}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    excludeFullSections ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => closePreferencePicker()}
              className="w-full py-3 rounded-2xl bg-purple-600 text-white font-semibold shadow-lg shadow-purple-500/25 active:scale-[0.99] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Term Change Confirmation Modal */}
      {showTermChangeConfirm && pendingTerm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all border border-gray-200/40 dark:border-gray-700/40 animate-slideUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 p-3 rounded-full">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Switch Term?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTermLabel(termNames[selectedTerm] ?? selectedTerm)} → {formatTermLabel(termNames[pendingTerm] ?? pendingTerm)}
                </p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Switching terms will clear your current schedule with <span className="font-semibold text-gray-900 dark:text-white">{uniqueCourseCount} course{uniqueCourseCount !== 1 ? 's' : ''}</span>.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You can switch back to {formatTermLabel(termNames[selectedTerm] ?? selectedTerm)} later to create a new schedule.
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelTermChange}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#2d2d30] text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmTermChange}
                className="flex-1 px-4 py-2 bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-500/25"
              >
                Switch Term
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Section Warning Toasts */}
      {fullSectionWarnings.length > 0 && (
        <div className="fixed top-16 left-3 right-3 sm:top-20 sm:right-4 sm:left-auto z-50 flex flex-col items-stretch sm:items-end gap-2 sm:gap-3">
          {fullSectionWarnings.map((warning) => (
            <FullSectionWarningToast
              key={warning.id}
              warning={warning}
              onDismiss={dismissFullSectionWarning}
              duration={6000}
            />
          ))}
        </div>
      )}

      {/* Swap Warning Toast */}
      {swapWarning && (
        <div className={`fixed top-24 left-3 right-3 sm:top-36 sm:right-4 sm:left-auto z-50 ${isSwapWarningExiting ? 'animate-slideOutToTop' : 'animate-slideInFromTop'}`}>
          <div className={`${swapWarningStyles.container} rounded-lg sm:rounded-xl shadow-2xl overflow-hidden w-full max-w-md mx-auto sm:mx-0`}>
            <div className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className={`${swapWarningStyles.icon} text-white p-1.5 sm:p-2 rounded-full flex-shrink-0 shadow-lg`}>
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold ${swapWarningStyles.title} mb-1 text-sm sm:text-base`}>
                    Section Swapped with Warning
                  </h4>
                  <p className={`text-xs sm:text-sm ${swapWarningStyles.text}`}>
                    {swapWarning}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSwapWarningExiting(true);
                    setTimeout(() => {
                      setSwapWarning(null);
                      setSwapWarningType(null);
                    }, 300);
                  }}
                  className={`${swapWarningStyles.button} rounded p-1 transition-all flex-shrink-0`}
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className={`h-0.5 sm:h-1 ${swapWarningStyles.progressTrack}`}>
              <div 
                className={`h-full ${swapWarningStyles.progressBar} animate-shrink`}
                style={{ animationDuration: '5000ms' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {pendingUndo && (() => {
        const removedEntry = isSnapshotUndoEntry(pendingUndo) ? pendingUndo.removed : pendingUndo.course;
        const section = removedEntry.selectedSection;
        const firstSlot = section.timeSlots[0];
        const timeRange = firstSlot ? `${firstSlot.day}, ${firstSlot.startTime} - ${firstSlot.endTime}` : null;
        return (
          <div className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:right-6 sm:left-auto z-50 w-full max-w-xs sm:max-w-sm">
            <div className="relative bg-white/90 dark:bg-[#1f1f24]/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_28px_60px_-28px_rgba(88,28,135,0.45)] p-4 flex gap-3 items-start">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Removed {removedEntry.course.courseCode}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {section.sectionType} {section.sectionId}{timeRange ? ` • ${timeRange}` : ''}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                  Press ⌘Z or Ctrl+Z to undo
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={undoLastRemoval}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-400 text-white text-xs font-semibold shadow-lg shadow-purple-500/30 transition-transform hover:scale-[1.03]"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissUndo}
                    className="px-3 py-1.5 rounded-lg border border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10 transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissUndo}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition p-1"
                aria-label="Dismiss undo notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Building Location Modal - Single instance for entire page */}
      {selectedLocation && (
        <BuildingModal
          location={selectedLocation}
          isOpen={true}
          onClose={() => setSelectedLocation(null)}
          appearance={timetableAppearance}
        />
      )}

      {/* Course Details Modal */}
      <CourseDetailsModal
        selectedCourse={selectedCourseDetails}
        onClose={() => setSelectedCourseDetails(null)}
        onLocationClick={(location) => setSelectedLocation(location)}
      />

      {/* Section Swap Modal */}
      {swapModalCourse && (
        <SectionSwapModal
          course={swapModalCourse.course}
          currentSection={swapModalCourse.selectedSection}
          onSwap={(newSectionId) => {
            handleSwapLectureSection(
              swapModalCourse.course.courseCode,
              swapModalCourse.selectedSection.sectionId,
              newSectionId
            );
          }}
          onClose={() => setSwapModalCourse(null)}
        />
      )}

      {/* Conflict Toast Notification */}
      {conflictToast.length > 0 && (
        <ConflictToast
          conflicts={conflictToast}
          onClose={() => {
            setConflictToast([]);
            // Don't clear conflictingCourses here - they should stay highlighted
          }}
          duration={5000}
        />
      )}
    </div>
  );
}
