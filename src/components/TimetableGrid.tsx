'use client';

import { useState, memo, useTransition, useRef, useEffect, useMemo } from 'react';
import type { CSSProperties, /* MouseEvent */ } from 'react';
import { SelectedCourse, DayOfWeek, Course, Section, TimeSlot } from '@/types';
import { TIMETABLE_CONFIG, WEEKDAYS, WEEKDAY_SHORT } from '@/lib/constants';
import { timeToMinutes, formatTime, hasAvailableSeats } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { X, AlertCircle, RefreshCw, GripVertical, Lock, MapPin } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter } from '@dnd-kit/core';

interface TimetableGridProps {
  selectedCourses: SelectedCourse[];
  onCourseClick?: (course: SelectedCourse) => void;
  onRemoveCourse?: (course: SelectedCourse) => void;
  onLocationClick?: (location: string) => void;
  conflictingCourses?: string[]; // Array of course codes that have conflicts
  onSwapLectures?: (courseCode: string, fromLectureId: string, toLectureId: string) => void;
  onSwapTutorials?: (courseCode: string, fromTutorialId: string, toTutorialId: string) => void;
  enableDragDrop?: boolean; // Enable drag & drop functionality
  availableCourses?: Course[]; // All available courses for showing alternatives
  onSwapWarning?: (message: string, type: 'full' | 'conflict') => void; // Callback for swap warnings
  appearance?: 'frosted' | 'modern';
}

const DEFAULT_COURSE_COLOR = '#8B5CF6';
// Old glass texture - commented out for cleaner modern look
// const PIXEL_GLASS_TEXTURE =
//   "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='%23FFFFFF28'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%23FFFFFF70'/%3E%3Crect x='4' y='4' width='2' height='2' fill='%23FFFFFF50'/%3E%3Crect x='2' y='6' width='1' height='1' fill='%23FFFFFF40'/%3E%3Crect x='6' y='2' width='1' height='1' fill='%23FFFFFF40'/%3E%3C/svg%3E";

type CourseStyle = CSSProperties & {
  '--course-glow'?: string;
};

const hexToRgb = (hexColor: string) => {
  const normalized = hexColor.replace('#', '');

  if (![3, 6].includes(normalized.length)) {
    return null;
  }

  const fullHex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const numeric = Number.parseInt(fullHex, 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
};

const INSTRUCTOR_TITLE_PREFIXES = ['Dr.', 'Prof.', 'Professor', 'Mr.', 'Ms.', 'Mrs.', 'Miss'];

const formatInstructorDisplayName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return name;
  }

  const prefixIndex = parts.findIndex((part) => INSTRUCTOR_TITLE_PREFIXES.includes(part));
  const prefix = prefixIndex === -1 ? undefined : parts[prefixIndex];
  const surnameCandidateIndex = prefixIndex !== -1 && prefixIndex + 1 < parts.length ? prefixIndex + 1 : 0;
  const surname = parts[surnameCandidateIndex]?.replace(/[^A-Za-z'\-]/g, '') ?? parts[parts.length - 1];

  if (prefix) {
    return `${prefix} ${surname.toUpperCase()}`;
  }

  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }

  return parts[0];
};

const buildGlassPalette = (hexColor?: string) => {
  const base = hexColor ?? DEFAULT_COURSE_COLOR;
  const rgb = hexToRgb(base);

  if (!rgb) {
    return {
      surfaceSubtle: 'rgba(139, 92, 246, 0.16)',
      surface: 'rgba(139, 92, 246, 0.26)',
      surfaceActive: 'rgba(139, 92, 246, 0.38)',
      border: 'rgba(139, 92, 246, 0.5)',
      borderSoft: 'rgba(139, 92, 246, 0.32)',
      glow: 'rgba(139, 92, 246, 0.42)',
  text: 'rgba(255, 255, 255, 0.97)',
  textShadow: '0 1px 2px rgba(15, 23, 42, 0.25)',
      luminance: 0.3,
    };
  }

  const { r, g, b } = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const prefersDarkText = luminance > 0.55;

  // Enhanced opacity for better visibility and frosted glass effect
  const surfaceSubtle = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.35 : 0.32})`;
  const surface = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.55 : 0.48})`;
  const surfaceActive = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.7 : 0.62})`;
  const border = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.85 : 0.78})`;
  const borderSoft = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.58 : 0.5})`;
  const glow = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.6 : 0.54})`;
  const text = 'rgba(255, 255, 255, 0.97)';
  const textShadow = '0 1px 2px rgba(15, 23, 42, 0.25)';

  return {
    surfaceSubtle,
    surface,
    surfaceActive,
    border,
    borderSoft,
    glow,
    text,
    textShadow,
    luminance,
  };
};

// Format course code: split letters and digits (e.g., ACCT2111 -> ACCT 2111)
const formatCourseCode = (code: string): string => {
  const match = code.match(/^([A-Za-z]+)(\d.*)$/);
  if (!match) return code;
  return `${match[1].toUpperCase()} ${match[2]}`;
};

// Gap between overlapping blocks; smaller on mobile so all columns fit
const DEFAULT_OVERLAP_GAP = 8;

type SlotLayoutInput = {
  key: string;
  selectedCourse: SelectedCourse;
  slot: TimeSlot;
  start: number;
  end: number;
};

type SlotLayoutOutput = SlotLayoutInput & {
  lane: number;
  overlapCount: number;
};

// Smart text sizing based on rendered dimensions (mobile only)
type SmartTextConfig = {
  primary: number;
  secondary: number;
  tertiary: number;
  layout: 'compact' | 'comfortable' | 'spacious';
  abbreviate: boolean;
  badgeSize: 'tiny' | 'small' | 'normal';
};

const calculateSmartTextSizes = (
  width: number,
  height: number,
  overlapCount: number,
  isSmallScreen: boolean
): SmartTextConfig | null => {
  if (!isSmallScreen) return null;
  const paddingX = 12;
  const paddingY = 8;
  const iconSpace = overlapCount >= 2 ? 28 : 18;

  const availableWidth = Math.max(40, width - paddingX * 2 - iconSpace);
  const availableHeight = Math.max(26, height - paddingY * 2);

  let layout: SmartTextConfig['layout'] = 'spacious';
  if (availableHeight < 42) layout = 'compact';
  else if (availableHeight < 70) layout = 'comfortable';

  const widthFactor = Math.min(availableWidth / 120, 1.25);
  const heightFactor = Math.min(availableHeight / 60, 1.2);
  const sizeFactor = Math.max(0.5, Math.min(1.2, Math.min(widthFactor, heightFactor)));

  const basePrimary = layout === 'compact' ? 8.6 : layout === 'comfortable' ? 10.2 : 11.8;
  const baseSecondary = layout === 'compact' ? 7.6 : layout === 'comfortable' ? 9.0 : 10.2;
  const baseTertiary = layout === 'compact' ? 6.8 : layout === 'comfortable' ? 8.1 : 9.5;

  const primary = Math.max(7.1, Math.min(12.5, basePrimary * sizeFactor));
  const secondary = Math.max(6.4, Math.min(11.2, baseSecondary * sizeFactor));
  const tertiary = Math.max(5.9, Math.min(10, baseTertiary * sizeFactor));

  const abbreviate = availableWidth < 95;
  const badgeSize: SmartTextConfig['badgeSize'] =
    layout === 'compact' ? 'tiny' : layout === 'comfortable' ? 'small' : 'normal';

  return { primary, secondary, tertiary, layout, abbreviate, badgeSize };
};

const layoutDaySlots = (blocks: SlotLayoutInput[]): SlotLayoutOutput[] => {
  const sorted = [...blocks].sort((a, b) => {
    if (a.start === b.start) {
      return a.end - b.end;
    }
    return a.start - b.start;
  });

  const active: SlotLayoutOutput[] = [];
  const result: SlotLayoutOutput[] = [];

  for (const block of sorted) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].end <= block.start) {
        active.splice(i, 1);
      }
    }

    const usedLanes = new Set(active.map((entry) => entry.lane));
    let lane = 0;
    while (usedLanes.has(lane)) {
      lane += 1;
    }

    const layoutBlock: SlotLayoutOutput = {
      ...block,
      lane,
      overlapCount: Math.max(1, active.length + 1),
    };

    active.push(layoutBlock);
    result.push(layoutBlock);

    const currentOverlap = active.length;
    active.forEach((entry) => {
      entry.overlapCount = Math.max(entry.overlapCount, currentOverlap);
    });
  }

  return result;
};

export function TimetableGrid({ 
  selectedCourses, 
  /* onCourseClick, */
  onRemoveCourse, 
  /* onLocationClick, */
  conflictingCourses = [],
  onSwapLectures,
  onSwapTutorials,
  enableDragDrop = false,
  availableCourses = [],
  onSwapWarning,
  appearance = 'modern',
}: TimetableGridProps) {
  const [draggedCourse, setDraggedCourse] = useState<SelectedCourse | null>(null);
  const [, startTransition] = useTransition();
  const { startHour, endHour } = TIMETABLE_CONFIG;
  // Compact mobile sizing: adjust per-hour height and time-column width
  const isSmallScreen = typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false;
  const baseSlotHeight = TIMETABLE_CONFIG.slotHeight;
  const slotHeight = isSmallScreen ? baseSlotHeight * 1.35 : baseSlotHeight;
  const OVERLAP_GAP = isSmallScreen ? 6 : DEFAULT_OVERLAP_GAP;
  const isDragging = Boolean(draggedCourse);
  const blockSizeCacheRef = useRef<Map<string, { width: number; height: number }>>(new Map());
  const prevBodyStyleRef = useRef<{ overflow?: string; touchAction?: string; overscrollBehavior?: string } | null>(null);
  // Sensors must be created unconditionally to keep hook order stable
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );
  
  // Generate hours array (8 AM to 9 PM)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  
  // Use only weekdays for now (Mon-Fri)
  const displayDays = WEEKDAYS.slice(0, 5) as DayOfWeek[];

  const isFrosted = appearance === 'frosted';
  const containerClassName = cn(
    'relative w-full rounded-2xl border transition-all duration-300',
    isFrosted
      ? 'border-gray-200/40 bg-white/55 shadow-[0_36px_90px_-42px_rgba(99,102,241,0.35)] backdrop-blur-[36px] dark:border-white/12 dark:bg-white/[0.07] dark:shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]'
      : 'border-gray-200/20 bg-white/[0.03] shadow-[0_32px_72px_-50px_rgba(15,23,42,0.55)] backdrop-blur-none dark:border-white/[0.07] dark:bg-transparent dark:shadow-[0_40px_80px_-52px_rgba(0,0,0,0.85)]'
  );

  // Day header styles: reduce letter-spacing on small screens and allow truncation
  const dayHeaderClassName = cn(
    'flex h-full items-center justify-center rounded-2xl px-1 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.06em] sm:tracking-[0.22em] transition-all duration-300 truncate',
    isFrosted
      ? 'border border-white/60 bg-white/75 shadow-[0_22px_42px_-28px_rgba(59,130,246,0.35)] backdrop-blur-[28px] text-slate-600/90 dark:border-white/18 dark:bg-white/[0.08] dark:text-slate-100'
      : 'border border-transparent bg-transparent text-slate-500/90 dark:text-slate-100/85'
  );

  const dayColumnClassName = cn(
    // allow floating controls to render beyond the card edge without clipping
    'relative rounded-xl border overflow-visible transition-all duration-200',
    isFrosted
      ? 'backdrop-blur-sm border-gray-200/50 bg-gray-50/30 hover:border-gray-300/60 hover:bg-gray-50/40 dark:border-gray-700/40 dark:bg-white/[0.05] dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
      : 'border-white/[0.05] bg-transparent hover:border-white/[0.12] dark:border-white/[0.05] dark:bg-transparent dark:hover:border-white/[0.18]'
  );

  const gridLineClassName = isFrosted
    ? 'border-gray-200/60 dark:border-gray-600/40'
    : 'border-gray-200/35 dark:border-white/[0.08]';

  const courseBlockBaseClass = cn(
    'absolute rounded-[7px] cursor-pointer group flex flex-col border bg-clip-padding',
    'transition-transform duration-200 ease-out shadow-none hover:shadow-none',
    // Use tighter padding on narrow/overlapping pills so text fits better
    'px-[5px] py-[3px] sm:px-2 sm:py-[5px]'
  );

  const ghostBlockBaseClass = cn(
    'absolute left-1 right-1 rounded-[7px] border pointer-events-auto cursor-pointer flex flex-col items-center justify-center px-1.5 py-1.5 transition-[transform,box-shadow,opacity] duration-200 ease-out',
    isFrosted ? 'backdrop-blur-2xl' : 'backdrop-blur-none'
  );

  // Calculate position and height for a course block
  const getCourseStyle = (startTime: string, endTime: string, color?: string): CourseStyle => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const startOfDay = startHour * 60;
    
    const top = ((startMinutes - startOfDay) / 60) * slotHeight;
    const durationMinutes = endMinutes - startMinutes;
    const calculatedHeight = (durationMinutes / 60) * slotHeight;
    
    // Use consistent gap for visual separation - blocks size naturally to content
    const blockGap = 4;
    // Let blocks be their natural size - no forced minimum to avoid overlaps
    const finalHeight = calculatedHeight - blockGap;
    const adjustedTop = top + blockGap / 2;

    const palette = buildGlassPalette(color);

    const style: CourseStyle = {
      top: `${adjustedTop}px`,
      height: `${finalHeight}px`,
      backgroundColor: isFrosted ? palette.surface : palette.surfaceActive,
      borderColor: palette.border,
      borderRadius: '7px',
      // No drop shadow
      boxShadow: 'none',
      backdropFilter: isFrosted ? 'blur(22px)' : 'none',
      WebkitBackdropFilter: isFrosted ? 'blur(22px)' : 'none',
      color: palette.text,
      textShadow: isFrosted ? palette.textShadow : 'none',
    };

    style['--course-glow'] = palette.glow;
    style.left = style.left ?? `${OVERLAP_GAP / 2}px`;
    style.width = style.width ?? `calc(100% - ${OVERLAP_GAP}px)`;

    return style;
  };

  // Drag & drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const course = event.active.data.current?.course as SelectedCourse;
    setDraggedCourse(course);
    // Lock body scroll while dragging so the page doesn't move
    if (typeof document !== 'undefined') {
      const body = document.body as HTMLBodyElement;
      prevBodyStyleRef.current = {
        overflow: body.style.overflow,
        touchAction: (body.style as any).touchAction,
        overscrollBehavior: (body.style as any).overscrollBehavior,
      };
      body.style.overflow = 'hidden';
      (body.style as any).touchAction = 'none';
      (body.style as any).overscrollBehavior = 'contain';
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.data.current || !over.data.current) {
      setDraggedCourse(null);
      return;
    }

    const draggedCourse = active.data.current.course as SelectedCourse;
    const targetCourse = over.data.current.course as SelectedCourse;

    // Don't swap with itself
    if (draggedCourse === targetCourse) {
      setDraggedCourse(null);
      return;
    }

    const isSameCourse = draggedCourse.course.courseCode === targetCourse.course.courseCode;
    const draggedSection = draggedCourse.selectedSection;
    const targetSection = targetCourse.selectedSection;

    // Check if target section is full
    const isTargetFull = !hasAvailableSeats(targetSection);
    
    // Check if swapping would cause conflicts
    const wouldCauseConflict = selectedCourses.some(selected => {
      if (selected === draggedCourse || selected === targetCourse) return false;
      if (selected.course.courseCode === draggedCourse.course.courseCode) return false;
      
      return selected.selectedSection.timeSlots.some(slot1 =>
        targetSection.timeSlots.some(slot2 =>
          slot1.day === slot2.day &&
          timeToMinutes(slot1.startTime) < timeToMinutes(slot2.endTime) &&
          timeToMinutes(slot2.startTime) < timeToMinutes(slot1.endTime)
        )
      );
    });

    // Clear dragged course immediately so next drag can start right away
    setDraggedCourse(null);
    // Restore body scroll
    if (typeof document !== 'undefined' && prevBodyStyleRef.current) {
      const body = document.body as HTMLBodyElement;
      body.style.overflow = prevBodyStyleRef.current.overflow ?? '';
      (body.style as any).touchAction = prevBodyStyleRef.current.touchAction ?? '';
      (body.style as any).overscrollBehavior = prevBodyStyleRef.current.overscrollBehavior ?? '';
      prevBodyStyleRef.current = null;
    }

    // Proceed with swap in a non-blocking transition
    startTransition(() => {
      // Lecture swap
      if (draggedSection.sectionType === 'Lecture' && targetSection.sectionType === 'Lecture') {
        if (onSwapLectures) {
          onSwapLectures(
            draggedCourse.course.courseCode,
            draggedSection.sectionId,
            targetSection.sectionId
          );
        }
      }
      // Non-lecture same-type swaps (Tutorial, Lab, etc.)
      else if (draggedSection.sectionType !== 'Lecture' && targetSection.sectionType === draggedSection.sectionType) {
        if (isSameCourse) {
          const dParent = draggedSection.parentLecture;
          const tParent = targetSection.parentLecture;
          if ((dParent == null && tParent == null) || dParent === tParent) {
            if (onSwapTutorials) {
              onSwapTutorials(
                draggedCourse.course.courseCode,
                draggedSection.sectionId,
                targetSection.sectionId
              );
            }
          }
        }
      }

      // Show warnings after swap (non-blocking)
      setTimeout(() => {
        if (isTargetFull && onSwapWarning) {
          onSwapWarning(
            `${targetCourse.course.courseCode} - ${targetSection.sectionType} ${targetSection.sectionId} has no available seats.`,
            'full'
          );
        }
        
        if (wouldCauseConflict && onSwapWarning) {
          onSwapWarning(
            `Swapping to ${targetCourse.course.courseCode} - ${targetSection.sectionType} ${targetSection.sectionId} would cause a schedule conflict.`,
            'conflict'
          );
        }
      }, 100);
    });
  };

  const handleDragCancel = () => {
    setDraggedCourse(null);
    // Restore body scroll
    if (typeof document !== 'undefined' && prevBodyStyleRef.current) {
      const body = document.body as HTMLBodyElement;
      body.style.overflow = prevBodyStyleRef.current.overflow ?? '';
      (body.style as any).touchAction = prevBodyStyleRef.current.touchAction ?? '';
      (body.style as any).overscrollBehavior = prevBodyStyleRef.current.overscrollBehavior ?? '';
      prevBodyStyleRef.current = null;
    }
  };

  // Ghost Section Block Component (appears when dragging a lecture or tutorial)
  interface GhostSectionBlockProps {
    section: Section;
    slot: TimeSlot;
    course: Course;
    color: string;
    getCourseStyle: (startTime: string, endTime: string, color?: string) => CourseStyle;
    styleOverride?: Partial<CourseStyle>;
    overlapCount?: number;
  }

  const GhostSectionBlock = memo(function GhostSectionBlock({
    section,
    slot,
    course,
    color,
    getCourseStyle,
    styleOverride,
    overlapCount = 1,
  }: GhostSectionBlockProps) {
    const ghostCourse: SelectedCourse = {
      course,
      selectedSection: section,
      color,
    };

    const ghostId = `ghost-${course.courseCode}-${section.sectionId}-${slot.day}-${slot.startTime}`;

    const { setNodeRef, isOver } = useDroppable({
      id: ghostId,
      data: {
        course: ghostCourse,
      },
    });

    const style = getCourseStyle(slot.startTime, slot.endTime, color);
    const palette = buildGlassPalette(color);

    const ghostStyle: CourseStyle = {
      ...style,
      ...(styleOverride ?? {}),
      borderStyle: 'dashed',
      borderColor: palette.borderSoft,
      backgroundColor: isOver ? palette.surfaceActive : palette.surfaceSubtle,
      boxShadow: 'none',
      opacity: isOver ? 1 : 0.94,
      transition: isOver
        ? 'all 0.25s ease-out'
        : 'transform 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s ease-out',
      color: palette.text,
      // Ensure ghost targets sit above real blocks so they remain droppable
      zIndex: 300,
    };

    ghostStyle['--course-glow'] = palette.glow;

    return (
      <div
        ref={setNodeRef}
        className={cn(
          ghostBlockBaseClass,
          'border-dashed',
          isOver && 'scale-[1.05]',
          !isOver && 'hover:scale-[1.02]',
        )}
        style={ghostStyle}
      >
        <div className="text-xs font-bold text-center">
          {section.sectionType === 'Lecture' ? 'LEC' : section.sectionType.toUpperCase()} {section.sectionId}
        </div>
        {section.instructor && (
          <div className="text-[9px] text-center truncate max-w-full opacity-90">
            {formatInstructorDisplayName(section.instructor.name)}
          </div>
        )}
        {isOver && (
          <div className="text-[10px] font-semibold mt-0.5 text-yellow-100/90">
            ↓ Drop here
          </div>
        )}
      </div>
    );
  });

  // Draggable Course Block Component
  interface DraggableCourseBlockProps {
    selectedCourse: SelectedCourse;
    blockId: string;
    style: CourseStyle;
    slot: TimeSlot;
    onLocationClick?: (location: string) => void;
    isCompactWidth?: boolean; // kept for backward compatibility
    overlapCount?: number; // how many blocks share the time lane
  }

  const DraggableCourseBlock = memo(function DraggableCourseBlock({
    selectedCourse,
    blockId,
    style,
    slot,
    // onLocationClick,
    isCompactWidth: _isCompactWidth = false,
    overlapCount = 1,
  }: DraggableCourseBlockProps) {
    const [isLocalHovered, setIsLocalHovered] = useState(false);
    const blockRef = useRef<HTMLDivElement | null>(null);
    const uniqueId = `${selectedCourse.course.courseCode}-${selectedCourse.selectedSection.sectionId}-${blockId}`;
    const cachedDims = blockSizeCacheRef.current.get(uniqueId);
    const [blockDimensions, setBlockDimensions] = useState<{ width: number; height: number }>(() =>
      cachedDims ?? { width: 0, height: 0 }
    );

    // Calculate duration
    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);
    const durationMinutes = endMinutes - startMinutes;
    const blockHeightPx = (durationMinutes / 60) * slotHeight;
    const styleWidth = (() => {
      if (typeof style.width === 'number') return style.width;
      if (typeof style.width === 'string') {
        const trimmed = style.width.trim();
        if (trimmed.startsWith('calc(') || trimmed.includes('%') || /[a-z]/i.test(trimmed.replace(/px|rem|em|vh|vw/g, ''))) {
          return undefined;
        }
        const parsed = Number.parseFloat(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    })();
    const fallbackWidth = isSmallScreen ? 90 : 170;
    const estimatedBlockWidth =
      blockDimensions.width > 0 ? blockDimensions.width : Math.max(styleWidth ?? 0, fallbackWidth);
    const estimatedBlockHeight = blockDimensions.height > 0 ? blockDimensions.height : blockHeightPx;

    // Check if there are alternatives to swap to (needed for drag handles)
    const courseData = availableCourses.find((c) => c.courseCode === selectedCourse.course.courseCode);
    let hasAlternatives = false;

    if (courseData && enableDragDrop) {
      if (selectedCourse.selectedSection.sectionType === 'Lecture') {
        const lectureCount = courseData.sections.filter((section) => section.sectionType === 'Lecture').length;
        hasAlternatives = lectureCount > 1;
      } else if (selectedCourse.selectedSection.sectionType === 'Tutorial') {
        const tutorialCount = courseData.sections.filter(
          (section) =>
            section.sectionType === 'Tutorial' &&
            (section.parentLecture === selectedCourse.selectedSection.parentLecture ||
              (section.parentLecture === undefined && selectedCourse.selectedSection.parentLecture === undefined))
        ).length;
        hasAlternatives = tutorialCount > 1;
      } else if (selectedCourse.selectedSection.sectionType === 'Lab') {
        const labCount = courseData.sections.filter(
          (section) =>
            section.sectionType === 'Lab' &&
            (section.parentLecture === selectedCourse.selectedSection.parentLecture ||
              (section.parentLecture === undefined && selectedCourse.selectedSection.parentLecture === undefined))
        ).length;
        hasAlternatives = labCount > 1;
      }
    }

    const isDraggable = enableDragDrop && hasAlternatives && !selectedCourse.locked;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: uniqueId,
      data: { course: selectedCourse },
      disabled: !isDraggable,
    });

    // Measure actual dimensions (mobile only). Skip while dragging to avoid layout thrash.
    useEffect(() => {
      if (!isSmallScreen) return;
      const node = blockRef.current;
      if (!node) return;

      const update = () => {
        if (!blockRef.current || isDragging) return;
        const rect = blockRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const nextDims = { width: rect.width, height: rect.height };
          setBlockDimensions(nextDims);
          blockSizeCacheRef.current.set(uniqueId, nextDims);
        }
      };

      const observer = new ResizeObserver(update);
      observer.observe(node);
      // Run one measurement after mount
      update();

      return () => {
        observer.disconnect();
      };
    }, [isSmallScreen, isDragging]);

    // Calculate smart text sizes
    const smartText = useMemo(() => {
      if (!isSmallScreen) return null;
      return calculateSmartTextSizes(estimatedBlockWidth, estimatedBlockHeight, overlapCount, isSmallScreen);
    }, [estimatedBlockWidth, estimatedBlockHeight, overlapCount, isSmallScreen]);

    // Determine display mode and font sizes
    type DisplayMode = 'compact' | 'tight' | 'full';
    let displayMode: DisplayMode;
    let firstFs: number;
    let secondFs: number;
    const isNarrowDesktopBlock = !isSmallScreen && overlapCount >= 2;
    const isUltraTightMobile = isSmallScreen && estimatedBlockWidth < 80;

    if (isSmallScreen && smartText) {
      displayMode = smartText.layout === 'compact' ? 'compact' : smartText.layout === 'comfortable' ? 'tight' : 'full';
      const mobilePrimaryMin = smartText.layout === 'compact' ? 7.4 : 8.6;
      const mobileSecondaryMin = smartText.layout === 'compact' ? 6.4 : 7.4;
      const widthPenalty =
        smartText.layout === 'compact'
          ? isUltraTightMobile
            ? estimatedBlockWidth < 65
              ? 0.75
              : 0.85
            : 1
          : isUltraTightMobile
            ? 0.9
            : 1;
      firstFs = Math.max(mobilePrimaryMin, Math.min(11.5, smartText.primary * widthPenalty));
      secondFs = Math.max(mobileSecondaryMin, Math.min(10.5, smartText.secondary * widthPenalty));
    } else {
      displayMode = blockHeightPx < 50 ? 'compact' : blockHeightPx < 80 ? 'tight' : 'full';
      firstFs = displayMode === 'full' ? 11 : displayMode === 'tight' ? 10.5 : 9.5;
      secondFs = displayMode === 'full' ? 9 : displayMode === 'tight' ? 8.5 : 8;
    }

    if (isNarrowDesktopBlock) {
      const compression = Math.max(0.75, 1 - 0.12 * (overlapCount - 1));
      firstFs = Number((firstFs * compression).toFixed(2));
      secondFs = Number((secondFs * compression).toFixed(2));
    }

    const baseBlockPaddingY =
      displayMode === 'compact'
        ? isSmallScreen
          ? 1.5
          : 3
        : displayMode === 'tight'
          ? isSmallScreen
            ? 3
            : 4
          : isSmallScreen
            ? 4
            : 6;
    const blockPaddingY =
      isNarrowDesktopBlock && baseBlockPaddingY > 2 ? baseBlockPaddingY - 1 : baseBlockPaddingY;
    const baseLineHeights = {
      primary: displayMode === 'compact' ? 1.06 : displayMode === 'tight' ? 1.14 : 1.22,
      secondary: displayMode === 'compact' ? 1.05 : displayMode === 'tight' ? 1.1 : 1.18,
    };
    const mobileLineHeightScale = isSmallScreen ? (displayMode === 'compact' ? 0.9 : 0.95) : 1;
    const lineHeights = {
      primary: Number((baseLineHeights.primary * mobileLineHeightScale).toFixed(3)),
      secondary: Number((baseLineHeights.secondary * mobileLineHeightScale).toFixed(3)),
    };
    if (isNarrowDesktopBlock) {
      lineHeights.primary = Number((lineHeights.primary * 0.95).toFixed(3));
      lineHeights.secondary = Number((lineHeights.secondary * 0.95).toFixed(3));
    }

    const abbr =
      selectedCourse.selectedSection.sectionType === 'Lecture'
        ? 'LEC'
        : selectedCourse.selectedSection.sectionType === 'Tutorial'
          ? 'TUT'
          : selectedCourse.selectedSection.sectionType;
    const sectionId = selectedCourse.selectedSection.sectionId;
    const classNumber = selectedCourse.selectedSection.classNumber;

    const isDesktop = !isSmallScreen;
    const blockPaddingXClass = isSmallScreen ? 'pl-1 pr-1.5' : isNarrowDesktopBlock ? 'pl-1 pr-2' : 'pl-1.5 pr-3';
    const blockGapClass =
      displayMode === 'compact'
        ? isSmallScreen
          ? 'justify-center gap-px'
          : 'justify-center gap-0.5'
        : 'justify-center gap-1';

    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `drop-${uniqueId}`,
      data: { course: selectedCourse },
      disabled: !isDraggable || selectedCourse.locked === true,
    });

    const palette = buildGlassPalette(selectedCourse.color);
    const textColor = palette.text;
    const isFull = !hasAvailableSeats(selectedCourse.selectedSection);
    const hasConflict = conflictingCourses.includes(selectedCourse.course.courseCode);
    const locationLabel = slot.location ?? selectedCourse.selectedSection.timeSlots.find((timeSlot) => timeSlot.location)?.location ?? null;
    const locationDisplay = locationLabel ?? 'TBA';
    const statusHighlightColor = selectedCourse.locked
      ? 'rgba(255,255,255,0.95)'
      : isFull
        ? 'rgba(225, 29, 72, 0.94)'
        : hasConflict
          ? 'rgba(234, 179, 8, 0.95)'
          : null;
    const statusBorderColor = statusHighlightColor ?? palette.border;
    const desktopLine1 = `${selectedCourse.course.courseCode.toUpperCase()} | ${abbr} ${sectionId}`;
    const desktopLocationLabel = locationDisplay;
    const desktopLine2Title = `${classNumber ? `#${classNumber}` : ''}${classNumber ? ' • ' : ''}${desktopLocationLabel}`;
    const hideMobileLocation = isSmallScreen && (displayMode === 'compact' || estimatedBlockHeight < 60);
    const mobileLocationParts = (() => {
      if (!isSmallScreen) return null;
      const match = locationDisplay.match(/^([A-Za-z]+)[\s_-]*([\w]+.*)$/);
      if (match && match[1] && match[2]) {
        return {
          head: match[1],
          tail: match[2],
        };
      }
      return null;
    })();

    // Prepare text content
    const measuredWidth = blockDimensions.width > 0 ? blockDimensions.width : undefined;
    const estimatedWidth = estimatedBlockWidth;
    const formattedCode = formatCourseCode(selectedCourse.course.courseCode);
    const [codeLettersRaw, ...codeNumberParts] = formattedCode.split(' ');
    const codeNumbersRaw = codeNumberParts.join(' ').trim() || null;
    const mobileCodeLetters = (() => {
      const base = codeLettersRaw || formattedCode;
      return base;
    })();
    const mobileCodeNumbers = (() => {
      if (!codeNumbersRaw) return null;
      return codeNumbersRaw;
    })();

    // Check if this is a valid drop target
    const isValidDropTarget = isOver && draggedCourse && !selectedCourse.locked && (() => {
      if (draggedCourse === selectedCourse) {
        // Allow dropping back onto itself to end the drag gracefully.
        return true;
      }
      const draggedSection = draggedCourse.selectedSection;
      const targetSection = selectedCourse.selectedSection;

      if (draggedSection.sectionType === 'Lecture' && targetSection.sectionType === 'Lecture') {
        return true;
      }

      if (draggedSection.sectionType !== 'Lecture' && targetSection.sectionType === draggedSection.sectionType) {
        if (draggedCourse.course.courseCode !== selectedCourse.course.courseCode) {
          return false;
        }
        const dParent = draggedSection.parentLecture;
        const tParent = targetSection.parentLecture;
        if (dParent == null && tParent == null) return true;
        return dParent === tParent;
      }

      return false;
    })();

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          setDropRef(node);
          blockRef.current = node;
        }}
        {...listeners}
        {...attributes}
        className={cn(
          courseBlockBaseClass,
          'hover:scale-[1.02]',
          isFull && 'border-2 border-red-500/90 dark:border-red-400/90',
          hasConflict && !isFull && 'border-2 border-yellow-500/90 dark:border-yellow-400/90',
          isDragging && 'opacity-0 pointer-events-none',
          isValidDropTarget && 'scale-105 shadow-lg animate-pulse',
          isDraggable && 'cursor-grab active:cursor-grabbing',
          !isDraggable && enableDragDrop && 'cursor-default',
        )}
        style={{
          ...style,
          touchAction: 'none',
          paddingTop: `${blockPaddingY}px`,
          paddingBottom: `${blockPaddingY}px`,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          contain: 'layout paint',
          backgroundImage: hasConflict
            ? `repeating-linear-gradient(135deg, rgba(250, 204, 21, 0.28) 0px, rgba(250, 204, 21, 0.08) 12px, transparent 12px, transparent 24px)`
            : undefined,
          borderColor: statusBorderColor,
          borderWidth: '1px',
          boxShadow: statusHighlightColor ? `0 0 0 2px ${statusHighlightColor}` : undefined,
          zIndex:
            isLocalHovered && hasConflict
              ? 200
              : hasConflict
                ? Math.max(10, 100 - Math.floor(durationMinutes / 10))
                : 1,
          opacity: isDragging ? 0 : hasConflict ? (isLocalHovered ? 1 : 0.85) : 1,
          pointerEvents: isDragging ? 'none' : undefined,
          filter: selectedCourse.locked
            ? 'grayscale(0.2) saturate(0.65) brightness(0.98)'
            : hasConflict
              ? 'saturate(1.22) brightness(0.98)'
              : 'saturate(1.05)',
            transition: isDragging
              ? 'none'
              : 'transform 0.18s ease, box-shadow 0.18s ease, top 0.28s ease, height 0.28s ease, left 0.28s ease, opacity 0.2s ease',
          willChange: 'transform, box-shadow, top, height, left',
        }}
        onMouseEnter={() => setIsLocalHovered(true)}
        onMouseLeave={() => setIsLocalHovered(false)}
      >
        {isDragging && (
          <div
            className="absolute pointer-events-none rounded-[7px] border border-dashed"
            style={{
              ...style,
              borderColor: palette.borderSoft,
              backgroundColor: 'transparent',
              opacity: 0.35,
              transition: 'none',
              zIndex: 0,
            }}
          />
        )}
        {/* Drag handle */}
        {isDraggable && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none">
            <GripVertical className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Content */}
        <div className={cn('flex h-full flex-col', blockPaddingXClass, blockGapClass)}>
          {isDesktop ? (
            <div className="flex flex-col gap-0.5">
              <div
                className="font-semibold break-words"
                style={{ fontSize: `${firstFs}px`, color: textColor, lineHeight: lineHeights.primary }}
                title={desktopLine1}
              >
                {desktopLine1}
                {selectedCourse.locked && (
                  <Lock className="inline-block ml-1 w-2.5 h-2.5 opacity-80" />
                )}
              </div>
              <div
                className="opacity-90 break-words flex flex-wrap items-center gap-x-2 gap-y-0.5"
                style={{ fontSize: `${secondFs}px`, color: textColor, lineHeight: lineHeights.secondary }}
                title={desktopLine2Title.trim()}
              >
                {classNumber && (
                  <span className="font-medium">{`#${classNumber}`}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-white/90" />
                  <span>{desktopLocationLabel}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-col leading-[1.05]">
                <div
                  className="font-black uppercase tracking-[0.05em] truncate max-w-full"
                  style={{
                    fontSize: `${Math.min(firstFs + 0.5, firstFs + 1)}px`,
                    color: textColor,
                    lineHeight: lineHeights.primary,
                  }}
                  title={formattedCode}
                >
                  {mobileCodeLetters}
                  {selectedCourse.locked && (
                    <Lock className="inline-block ml-1 w-2 h-2 opacity-80" />
                  )}
                </div>
                {mobileCodeNumbers && (
                  <div
                    className="font-black tracking-[0.08em] truncate max-w-full"
                    style={{
                      fontSize: `${secondFs + 0.4}px`,
                      color: textColor,
                      lineHeight: lineHeights.secondary,
                    }}
                    title={mobileCodeNumbers}
                  >
                    {mobileCodeNumbers}
                  </div>
                )}
              </div>

              <div
                className="opacity-90 font-medium tracking-[0.08em] truncate max-w-full"
                style={{
                  fontSize: `${secondFs}px`,
                  color: textColor,
                  lineHeight: lineHeights.secondary,
                }}
                title={`${abbr} ${sectionId}`}
              >
                {abbr} {sectionId}
              </div>

              {!hideMobileLocation && (
                <div
                  className={cn(
                    'opacity-90 truncate max-w-full',
                    !isDesktop && 'mt-1.5'
                  )}
                  style={{
                    fontSize: `${secondFs}px`,
                    color: textColor,
                    lineHeight: lineHeights.secondary,
                  }}
                  title={locationDisplay}
                >
                  {mobileLocationParts ? (
                    <span className="inline-flex items-start gap-0.5">
                      <MapPin className="w-2 h-2 text-white/90 mt-[1px]" />
                      <span className="flex flex-col leading-tight text-left">
                        <span>{mobileLocationParts.head}</span>
                        <span>{mobileLocationParts.tail}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-white/90" />
                      <span>{locationDisplay}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Badges in top-right */}
        <div
          className={cn(
            'absolute top-1 right-1 flex flex-col items-end gap-0.5 pointer-events-none',
            isNarrowDesktopBlock && 'scale-90 origin-top-right',
          )}
        >
          {hasConflict && (
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-yellow-300/90 text-slate-900">
              <AlertCircle className="h-2 w-2" />
            </span>
          )}
          {isFull && (
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-rose-400/90 text-white">
              <AlertCircle className="h-2 w-2" />
            </span>
          )}
          {!hasConflict && !isFull && isDraggable && (
            <RefreshCw className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    );
  });

  const timeColWidth = isSmallScreen ? 48 : 70;
  const gridTemplateColumns = `${timeColWidth}px repeat(${displayDays.length}, minmax(0, 1fr))`;
  // Clean modern style without texture - just subtle shadows and borders
  const pixelGlassStyle: CSSProperties = {};

  const content = (
    <div
      className={cn(containerClassName, isDragging && 'select-none')}
      // Allow vertical scrolling; DnD has a short delay to distinguish from scroll.
      style={{ ...pixelGlassStyle, touchAction: isDragging ? 'none' : 'pan-y' }}
    >
      <div className="overflow-x-auto">
        <div className="min-w-0 sm:min-w-[900px] lg:min-w-0 px-2 py-2 sm:px-5 sm:py-5">
          <div className="grid items-center gap-1 sm:gap-2.5 mb-2.5 sm:mb-4" style={{ gridTemplateColumns }}>
            <div className="flex items-center justify-end pr-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600/85 dark:text-slate-200/70">
              Time
            </div>
            {displayDays.map((day) => (
              <div
                key={day}
                className={dayHeaderClassName}
                style={pixelGlassStyle}
              >
                {WEEKDAY_SHORT[day]}
              </div>
            ))}
          </div>

          <div className="relative grid gap-1 sm:gap-2.5" style={{ gridTemplateColumns }}>
            <div>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex items-center justify-end pr-1.5 sm:pr-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] sm:tracking-[0.22em] tabular-nums font-mono text-right text-slate-600/80 dark:text-slate-300/75"
                  style={{ height: `${slotHeight}px`, lineHeight: `${slotHeight}px` }}
                >
                  {formatTime(`${hour}:00`)}
                </div>
              ))}
            </div>

            {displayDays.map((day) => (
              <div
                key={day}
                className={dayColumnClassName}
                style={{
                  ...pixelGlassStyle,
                  height: `${slotHeight * hours.length}px`,
                }}
              >
                {/* Hour grid lines */}
                {hours.slice(1).map((hour, idx) => (
                  <div
                    key={hour}
                    className={cn('absolute w-full border-t', gridLineClassName)}
                    style={{ top: `${(idx + 1) * slotHeight}px` }}
                  />
                ))}

                {/* Course blocks */}
                {(() => {
                  const slotEntries: SlotLayoutInput[] = selectedCourses.flatMap((selectedCourse, courseIdx) =>
                    selectedCourse.selectedSection.timeSlots
                      .map((slot, slotIdx) => ({
                        key: `${courseIdx}-${slotIdx}-${day}`,
                        selectedCourse,
                        slot,
                        start: timeToMinutes(slot.startTime),
                        end: timeToMinutes(slot.endTime),
                      }))
                      .filter((entry) => entry.slot.day === day)
                  );

                  const laidOut = layoutDaySlots(slotEntries);

                  return laidOut.map((entry) => {
                    const style = getCourseStyle(entry.slot.startTime, entry.slot.endTime, entry.selectedCourse.color);
                    const widthPercent = 100 / entry.overlapCount;
                    style.width = `calc(${widthPercent}% - ${OVERLAP_GAP}px)`;
                    style.left = `calc(${widthPercent * entry.lane}% + ${OVERLAP_GAP / 2}px)`;

                      // Wrapper to host the course block and a sibling floating delete button overlay.
                      const innerStyle = { ...style, top: 0, left: 0, width: '100%' } as CourseStyle;
                      const wrapperStyle = {
                        top: (style as any).top,
                        left: (style as any).left,
                        height: (style as any).height,
                        width: (style as any).width,
                      } as CSSProperties;
                      return (
                        <div key={entry.key} className="absolute group" style={wrapperStyle}>
                          <DraggableCourseBlock
                            selectedCourse={entry.selectedCourse}
                            blockId={entry.key}
                            style={innerStyle}
                            slot={entry.slot}
                            isCompactWidth={entry.overlapCount >= 2}
                            overlapCount={entry.overlapCount}
                          />
                          {onRemoveCourse && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveCourse(entry.selectedCourse);
                              }}
                              className="hidden sm:flex absolute top-0 right-0 translate-x-[55%] -translate-y-[55%] w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white items-center justify-center shadow-[0_10px_14px_rgba(0,0,0,0.35)] z-[200000] opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-transform"
                              title="Remove course"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                  });
                })()}

                {/* Ghost blocks for alternative sections when dragging */}
                {draggedCourse && (() => {
                  const courseData = availableCourses.find((course) => course.courseCode === draggedCourse.course.courseCode);
                  if (!courseData) return null;

                  let alternativeSections: Section[] = [];

                  if (draggedCourse.selectedSection.sectionType === 'Lecture') {
                    // Show all lectures (including current) so user can drop back or swap
                    alternativeSections = courseData.sections.filter(
                      (section) => section.sectionType === 'Lecture'
                    );
                  } else if (draggedCourse.selectedSection.sectionType === 'Tutorial') {
                    // Show all tutorials with same parent lecture (including current)
                    alternativeSections = courseData.sections.filter(
                      (section) =>
                        section.sectionType === 'Tutorial' &&
                        section.parentLecture === draggedCourse.selectedSection.parentLecture
                    );
                  } else if (draggedCourse.selectedSection.sectionType === 'Lab') {
                    // Show all labs with same parent lecture (including current)
                    alternativeSections = courseData.sections.filter(
                      (section) =>
                        section.sectionType === 'Lab' &&
                        section.parentLecture === draggedCourse.selectedSection.parentLecture
                    );
                  }

                  // Lane layout for ghost alternatives (same-day only)
                  type GhostInput = {
                    key: string;
                    section: Section;
                    slot: TimeSlot;
                    start: number;
                    end: number;
                  };
                  const ghostEntries: GhostInput[] = [];
                  alternativeSections.forEach((section) => {
                    section.timeSlots
                      .filter((ghostSlot) => ghostSlot.day === day)
                      .forEach((ghostSlot, idx) => {
                        ghostEntries.push({
                          key: `ghost-${section.sectionId}-${idx}-${day}`,
                          section,
                          slot: ghostSlot,
                          start: timeToMinutes(ghostSlot.startTime),
                          end: timeToMinutes(ghostSlot.endTime),
                        });
                      });
                  });
                  if (ghostEntries.length === 0) return null;

                  const existingEntries = selectedCourses
                    .filter((sc) => sc !== draggedCourse)
                    .flatMap((sc) =>
                      sc.selectedSection.timeSlots
                        .filter((slot) => slot.day === day)
                        .map((slot) => ({
                          key: `existing-${sc.course.courseCode}-${sc.selectedSection.sectionId}-${slot.startTime}-${slot.endTime}`,
                          selectedCourse: sc,
                          slot,
                          start: timeToMinutes(slot.startTime),
                          end: timeToMinutes(slot.endTime),
                        }))
                    );

                  const laidOut = layoutDaySlots([
                    ...existingEntries,
                    ...ghostEntries.map((g) => ({
                      key: g.key,
                      selectedCourse: {
                        course: courseData,
                        selectedSection: g.section,
                        color: draggedCourse.color ?? DEFAULT_COURSE_COLOR,
                      } as SelectedCourse,
                      slot: g.slot,
                      start: g.start,
                      end: g.end,
                      isGhost: true,
                    })),
                  ]);

                  return laidOut.filter((entry: any) => entry.isGhost).map((entry) => {
                    const baseStyle = getCourseStyle(entry.slot.startTime, entry.slot.endTime, draggedCourse.color ?? DEFAULT_COURSE_COLOR);
                    const widthPercent = 100 / entry.overlapCount;
                    const styleOverride: Partial<CourseStyle> = {
                      width: `calc(${widthPercent}% - ${OVERLAP_GAP}px)`,
                      left: `calc(${widthPercent * entry.lane}% + ${OVERLAP_GAP / 2}px)`,
                    };
                    return (
                      <GhostSectionBlock
                        key={entry.key}
                        section={entry.selectedCourse.selectedSection}
                        slot={entry.slot}
                        course={courseData}
                        color={draggedCourse.color ?? DEFAULT_COURSE_COLOR}
                        getCourseStyle={getCourseStyle}
                        styleOverride={styleOverride}
                        overlapCount={entry.overlapCount}
                      />
                    );
                  });
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap with DndContext if drag & drop is enabled
  if (enableDragDrop) {
    // Prefer ghost droppable targets when overlapping with real blocks
    const preferGhosts: CollisionDetection = (args) => {
      const collisions = closestCenter(args);
      if (!collisions.length) return collisions;
      const ghostIdx = collisions.findIndex((c) => String(c.id).startsWith('ghost-'));
      if (ghostIdx > 0) {
        const [ghost] = collisions.splice(ghostIdx, 1);
        collisions.unshift(ghost);
      }
      return collisions;
    };
    return (
      <>
        <DndContext
          sensors={sensors}
          collisionDetection={preferGhosts}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {content}
          
          <DragOverlay 
            dropAnimation={{
              duration: 0,
              easing: 'ease',
            }}
          >
            {draggedCourse && (() => {
              const palette = buildGlassPalette(draggedCourse.color);
              return (
                <div
                  className={cn('p-3 rounded-xl border shadow-2xl', isFrosted ? 'backdrop-blur-2xl' : 'backdrop-blur-none')}
                  style={{
                    backgroundColor: isFrosted ? palette.surfaceActive : palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                    textShadow: isFrosted ? palette.textShadow : 'none',
                    transform: 'scale(1.05)',
                    boxShadow: isFrosted
                      ? `0 32px 48px -30px ${palette.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0 rgba(15, 23, 42, 0.15)`
                      : `0 28px 48px -34px ${palette.glow}`,
                    backdropFilter: isFrosted ? 'blur(24px)' : 'none',
                    WebkitBackdropFilter: isFrosted ? 'blur(24px)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GripVertical className="w-4 h-4 opacity-70" />
                    <div className="font-bold text-sm">{draggedCourse.course.courseCode}</div>
                  </div>
                  <div className="text-xs opacity-90 ml-6">
                    {draggedCourse.selectedSection.sectionType} {draggedCourse.selectedSection.sectionId}
                  </div>
                  <div className="text-[10px] opacity-75 mt-1 ml-6">
                    {draggedCourse.selectedSection.timeSlots[0]?.startTime} - {draggedCourse.selectedSection.timeSlots[0]?.endTime}
                  </div>
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      </>
    );
  }

  return content;
}

// Memoize TimetableGrid to prevent re-renders when parent state changes (e.g., search query)
export default memo(TimetableGrid);
