'use client';

import { useState, memo, useTransition } from 'react';
import type { CSSProperties, /* MouseEvent */ } from 'react';
import { SelectedCourse, DayOfWeek, Course, Section, TimeSlot } from '@/types';
import { TIMETABLE_CONFIG, WEEKDAYS, WEEKDAY_SHORT } from '@/lib/constants';
import { timeToMinutes, formatTime, hasAvailableSeats } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { X, AlertCircle, RefreshCw, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';

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

const OVERLAP_GAP_PX = 8;

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
  const { startHour, endHour, slotHeight } = TIMETABLE_CONFIG;
  const isDragging = Boolean(draggedCourse);
  
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
    'flex h-full items-center justify-center rounded-2xl px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.08em] sm:tracking-[0.22em] transition-all duration-300 truncate',
    isFrosted
      ? 'border border-white/60 bg-white/75 shadow-[0_22px_42px_-28px_rgba(59,130,246,0.35)] backdrop-blur-[28px] text-slate-600/90 dark:border-white/18 dark:bg-white/[0.08] dark:text-slate-100'
      : 'border border-transparent bg-transparent text-slate-500/90 dark:text-slate-100/85'
  );

  const dayColumnClassName = cn(
    'relative rounded-xl border overflow-hidden transition-all duration-200',
    isFrosted
      ? 'backdrop-blur-sm border-gray-200/50 bg-gray-50/30 hover:border-gray-300/60 hover:bg-gray-50/40 dark:border-gray-700/40 dark:bg-white/[0.05] dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
      : 'border-white/[0.05] bg-transparent hover:border-white/[0.12] dark:border-white/[0.05] dark:bg-transparent dark:hover:border-white/[0.18]'
  );

  const gridLineClassName = isFrosted
    ? 'border-gray-200/60 dark:border-gray-600/40'
    : 'border-gray-200/35 dark:border-white/[0.08]';

  const courseBlockBaseClass = cn(
    'absolute rounded-lg cursor-pointer group flex flex-col px-2 py-1.5 overflow-visible border transition-transform duration-200 ease-out',
    isFrosted
      ? 'backdrop-blur-xl shadow-sm hover:shadow-md'
      : 'backdrop-blur-none shadow-[0_20px_36px_-28px_rgba(15,23,42,0.62)] hover:shadow-[0_24px_40px_-28px_rgba(15,23,42,0.72)]'
  );

  const ghostBlockBaseClass = cn(
    'absolute left-1 right-1 rounded-xl border pointer-events-auto cursor-pointer flex flex-col items-center justify-center px-1.5 py-1.5 transition-[transform,box-shadow,opacity] duration-200 ease-out',
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
      boxShadow: isFrosted
        ? `0 32px 56px -36px ${palette.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(15, 23, 42, 0.12)`
        : `0 26px 48px -36px ${palette.glow}`,
      backdropFilter: isFrosted ? 'blur(22px)' : 'none',
      WebkitBackdropFilter: isFrosted ? 'blur(22px)' : 'none',
      color: palette.text,
      textShadow: isFrosted ? palette.textShadow : 'none',
    };

    style['--course-glow'] = palette.glow;
    style.left = style.left ?? `${OVERLAP_GAP_PX / 2}px`;
    style.width = style.width ?? `calc(100% - ${OVERLAP_GAP_PX}px)`;

    return style;
  };

  // Drag & drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const course = event.active.data.current?.course as SelectedCourse;
    setDraggedCourse(course);
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
      // Tutorial swap (only if same parent lecture)
      else if (draggedSection.sectionType === 'Tutorial' && targetSection.sectionType === 'Tutorial') {
        if (isSameCourse && draggedSection.parentLecture === targetSection.parentLecture) {
          if (onSwapTutorials) {
            onSwapTutorials(
              draggedCourse.course.courseCode,
              draggedSection.sectionId,
              targetSection.sectionId
            );
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
  };

  // Ghost Section Block Component (appears when dragging a lecture or tutorial)
  interface GhostSectionBlockProps {
    section: Section;
    slot: TimeSlot;
    course: Course;
    color: string;
    getCourseStyle: (startTime: string, endTime: string, color?: string) => CourseStyle;
  }

  const GhostSectionBlock = memo(function GhostSectionBlock({
    section,
    slot,
    course,
    color,
    getCourseStyle,
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
      borderStyle: 'dashed',
      borderColor: palette.borderSoft,
      backgroundColor: isOver ? palette.surfaceActive : palette.surfaceSubtle,
      boxShadow: isOver
        ? `0 28px 48px -30px ${palette.glow}`
        : `0 18px 36px -32px ${palette.glow}`,
      opacity: isOver ? 1 : 0.94,
      transition: isOver
        ? 'all 0.25s ease-out'
        : 'transform 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s ease-out',
      color: palette.text,
    };

    ghostStyle['--course-glow'] = palette.glow;

    return (
      <div
        ref={setNodeRef}
        className={cn(
          ghostBlockBaseClass,
          'border-dashed',
          isOver && 'scale-[1.05] shadow-2xl ring-4 ring-yellow-400/50',
          !isOver && 'hover:scale-[1.02] hover:shadow-lg',
        )}
        style={ghostStyle}
      >
        <div className="text-xs font-bold text-center drop-shadow-sm">
          {section.sectionType === 'Lecture' ? 'LEC' : section.sectionType.toUpperCase()} {section.sectionId}
        </div>
        {section.instructor && (
          <div className="text-[9px] text-center truncate max-w-full opacity-90">
            {formatInstructorDisplayName(section.instructor.name)}
          </div>
        )}
        {isOver && (
          <div className="text-[10px] font-semibold mt-0.5 text-yellow-100/90 drop-shadow-md">
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
  }

  const DraggableCourseBlock = memo(function DraggableCourseBlock({
    selectedCourse,
    blockId,
    style,
    slot,
    // onLocationClick,
  }: DraggableCourseBlockProps) {
    const [isLocalHovered, setIsLocalHovered] = useState(false);
    const uniqueId = `${selectedCourse.course.courseCode}-${selectedCourse.selectedSection.sectionId}-${blockId}`;

    // Calculate duration of this time slot (shorter courses should appear on top)
    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);
    const durationMinutes = endMinutes - startMinutes;

    // Check if there are alternatives to swap to
    const courseData = availableCourses.find((c) => c.courseCode === selectedCourse.course.courseCode);
    let hasAlternatives = false;

    if (courseData && enableDragDrop) {
      if (selectedCourse.selectedSection.sectionType === 'Lecture') {
        // Count lectures - need at least 2 to enable drag
        const lectureCount = courseData.sections.filter((section) => section.sectionType === 'Lecture').length;
        hasAlternatives = lectureCount > 1;
      } else if (selectedCourse.selectedSection.sectionType === 'Tutorial') {
        // Count tutorials with same parentLecture OR no parentLecture (universal) - need at least 2 to enable drag
        const tutorialCount = courseData.sections.filter(
          (section) =>
            section.sectionType === 'Tutorial' &&
            (section.parentLecture === selectedCourse.selectedSection.parentLecture ||
              (section.parentLecture === undefined && selectedCourse.selectedSection.parentLecture === undefined))
        ).length;
        hasAlternatives = tutorialCount > 1;
      } else if (selectedCourse.selectedSection.sectionType === 'Lab') {
        // Count labs with same parentLecture OR no parentLecture (universal) - need at least 2 to enable drag
        const labCount = courseData.sections.filter(
          (section) =>
            section.sectionType === 'Lab' &&
            (section.parentLecture === selectedCourse.selectedSection.parentLecture ||
              (section.parentLecture === undefined && selectedCourse.selectedSection.parentLecture === undefined))
        ).length;
        hasAlternatives = labCount > 1;
      }
    }

    const isDraggable = enableDragDrop && hasAlternatives;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: uniqueId,
      data: { course: selectedCourse },
      disabled: !isDraggable,
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `drop-${uniqueId}`,
      data: { course: selectedCourse },
      disabled: !isDraggable,
    });

  const palette = buildGlassPalette(selectedCourse.color);
  const isFull = !hasAvailableSeats(selectedCourse.selectedSection);
  const hasConflict = conflictingCourses.includes(selectedCourse.course.courseCode);
  const locationLabel = slot.location ?? selectedCourse.selectedSection.timeSlots.find((timeSlot) => timeSlot.location)?.location ?? null;
  const locationDisplay = locationLabel ?? 'Location TBA';
  // const canClickLocation = Boolean(locationLabel && onLocationClick);

    const isCompactBlock = durationMinutes <= 60;
    const showVerticalIconStack = !isCompactBlock;

    const conflictBadge = hasConflict ? (
      <span
        title="Schedule conflict"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300/90 text-slate-900 shadow-lg ring-1 ring-white/50 backdrop-blur"
      >
        <AlertCircle className="h-2.5 w-2.5" />
      </span>
    ) : null;

    const fullBadge = isFull ? (
      <span
        title="Section is full"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-400/90 text-white shadow-lg ring-1 ring-white/40 backdrop-blur"
      >
        <AlertCircle className="h-2.5 w-2.5" />
      </span>
    ) : null;

    const baseBoxShadow = typeof style.boxShadow === 'string' ? style.boxShadow : undefined;
    const emphasizedBoxShadow = (() => {
      if (!baseBoxShadow) return undefined;
      if (isFull) {
        return `${baseBoxShadow}, 0 0 0 2px rgba(244, 63, 94, 0.45)`;
      }
      if (hasConflict) {
        return `${baseBoxShadow}, 0 0 0 1.5px rgba(250, 204, 21, 0.4)`;
      }
      return baseBoxShadow;
    })();

    const horizontalIconCount = showVerticalIconStack
      ? 0
      : [Boolean(conflictBadge), Boolean(fullBadge), Boolean(isDraggable)].filter(Boolean).length;

    const contentPaddingClass = showVerticalIconStack
      ? 'pr-7'
      : horizontalIconCount >= 2
        ? 'pr-12'
        : horizontalIconCount === 1
          ? 'pr-10'
          : 'pr-6';

    // const handleLocationClick = (event: MouseEvent<HTMLButtonElement>) => {
    //   event.stopPropagation();
    //   if (canClickLocation && locationLabel && onLocationClick) {
    //     onLocationClick(locationLabel);
    //   }
    // };

    // Check if this is a valid drop target
    const isValidDropTarget = isOver && draggedCourse && draggedCourse !== selectedCourse && (() => {
      const draggedSection = draggedCourse.selectedSection;
      const targetSection = selectedCourse.selectedSection;

      // Allow lecture to lecture swap
      if (draggedSection.sectionType === 'Lecture' && targetSection.sectionType === 'Lecture') {
        return true;
      }

      // Allow tutorial to tutorial swap only if same parent lecture
      if (draggedSection.sectionType === 'Tutorial' && targetSection.sectionType === 'Tutorial') {
        return (
          draggedCourse.course.courseCode === selectedCourse.course.courseCode &&
          draggedSection.parentLecture === targetSection.parentLecture
        );
      }

      return false;
    })();

    return (
      <div
        ref={(node) => {
          setDropRef(node);
        }}
        {...attributes}
        className={cn(
          courseBlockBaseClass,
          'hover:scale-[1.02]',
          isFull && 'border-2 border-red-500/90 dark:border-red-400/90 ring-2 ring-red-300/70',
          hasConflict && !isFull && 'border-2 border-yellow-500/90 dark:border-yellow-400/90 ring-2 ring-yellow-200/70',
          isDragging && 'opacity-0',
          isValidDropTarget && 'ring-2 ring-yellow-400/80 scale-105 shadow-lg animate-pulse',
          isDraggable && 'cursor-grab active:cursor-grabbing',
          !isDraggable && enableDragDrop && 'cursor-default',
        )}
        style={{
          ...style,
          backgroundImage: hasConflict
            ? `repeating-linear-gradient(135deg, rgba(250, 204, 21, 0.28) 0px, rgba(250, 204, 21, 0.08) 12px, transparent 12px, transparent 24px)`
            : undefined,
          backgroundSize: hasConflict ? 'auto' : undefined,
          borderColor: isFull
            ? 'rgba(225, 29, 72, 0.94)'
            : hasConflict
              ? 'rgba(234, 179, 8, 0.95)'
              : palette.border,
          boxShadow: emphasizedBoxShadow,
          // Z-index logic: shorter courses appear on top when conflicting
          // Base z-index: 1 (normal), 10+ (conflicts)
          // For conflicts: z-index = 100 - duration (so 50min class = z50, 180min class = z20)
          // This ensures shorter courses are always visible on top
          // When hovered, bring to the very top (z-index 200)
          zIndex:
            isLocalHovered && hasConflict
              ? 200
              : hasConflict
                ? Math.max(10, 100 - Math.floor(durationMinutes / 10))
                : 1,
          // More transparency for conflicts so overlapping courses are clearly visible
          // Full opacity when hovered
          opacity: hasConflict ? (isLocalHovered ? 1 : 0.85) : 1,
          filter: hasConflict ? 'saturate(1.22) brightness(0.98)' : 'saturate(1.05)',
          // Always use smooth transitions for position changes
          transition: isDragging
            ? 'none'
            : 'transform 0.18s ease, box-shadow 0.18s ease, top 0.28s ease, height 0.28s ease, left 0.28s ease, opacity 0.2s ease',
          willChange: 'transform, box-shadow, top, height, left',
        }}
        onMouseEnter={() => setIsLocalHovered(true)}
        onMouseLeave={() => setIsLocalHovered(false)}
      >
        {/* Drag handle - only show if draggable */}
        {isDraggable && (
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 transition-opacity touch-none"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Delete button */}
        {onRemoveCourse && (
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveCourse(selectedCourse);
            }}
            className={cn(
              'absolute -top-2 -right-2 w-6 h-6 rounded-full',
              'bg-red-500 hover:bg-red-600 text-white',
              'flex items-center justify-center shadow-lg',
              'transition-all transform',
              'opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100',
              'z-[150]'
            )}
            title="Remove course"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Content */}
        <div className="flex h-full flex-col justify-center">
          {showVerticalIconStack ? (
            <>
              {(conflictBadge || fullBadge) && (
                <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1 pointer-events-none">
                  {conflictBadge}
                  {fullBadge}
                </div>
              )}

              {isDraggable && (
                <div className="absolute bottom-1.5 right-1.5 pointer-events-none">
                  <RefreshCw
                    className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:scale-110 group-hover:opacity-100"
                    aria-hidden
                    focusable={false}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              {conflictBadge}
              {fullBadge}
              {isDraggable && (
                <RefreshCw
                  className="h-3.5 w-3.5 opacity-80 transition-transform group-hover:scale-110 group-hover:opacity-100"
                  aria-hidden
                  focusable={false}
                />
              )}
            </div>
          )}

          <div className={cn('flex flex-col gap-0.5', contentPaddingClass)}>
            {/* First row: Course code + section */}
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide drop-shadow-sm leading-none whitespace-nowrap truncate">
                {selectedCourse.course.courseCode}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-90 leading-none whitespace-nowrap truncate">
                {selectedCourse.selectedSection.sectionType === 'Lecture' ? 'LEC' : 
                 selectedCourse.selectedSection.sectionType === 'Tutorial' ? 'TUT' : 
                 selectedCourse.selectedSection.sectionType} {selectedCourse.selectedSection.sectionId}
              </span>
            </div>

            {/* Second row: Location */}
            <div className="text-[9px] font-semibold uppercase tracking-wider opacity-85 leading-tight">
              <span className="truncate block" title={locationLabel ?? undefined}>
                {locationDisplay}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  });

  const gridTemplateColumns = `70px repeat(${displayDays.length}, minmax(0, 1fr))`;
  // Clean modern style without texture - just subtle shadows and borders
  const pixelGlassStyle: CSSProperties = {};

  const content = (
    <div
      className={cn(containerClassName, isDragging && 'select-none')}
      // Prevent page scroll while dragging; allow normal touch scrolling otherwise
      style={{ ...pixelGlassStyle, touchAction: isDragging ? 'none' : 'manipulation' }}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[520px] sm:min-w-[760px] lg:min-w-0 px-3 py-3 sm:px-5 sm:py-5">
          <div className="grid items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4" style={{ gridTemplateColumns }}>
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

          <div className="relative grid gap-2 sm:gap-2.5" style={{ gridTemplateColumns }}>
            <div className="space-y-0.5">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex items-center justify-end pr-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600/80 dark:text-slate-300/75"
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
                    style.width = `calc(${widthPercent}% - ${OVERLAP_GAP_PX}px)`;
                    style.left = `calc(${widthPercent * entry.lane}% + ${OVERLAP_GAP_PX / 2}px)`;

                    return (
                      <DraggableCourseBlock
                        key={entry.key}
                        selectedCourse={entry.selectedCourse}
                        blockId={entry.key}
                        style={style}
                        slot={entry.slot}
                      />
                    );
                  });
                })()}

                {/* Ghost blocks for alternative sections when dragging */}
                {draggedCourse && (() => {
                  const courseData = availableCourses.find((course) => course.courseCode === draggedCourse.course.courseCode);
                  if (!courseData) return null;

                  let alternativeSections: Section[] = [];

                  if (draggedCourse.selectedSection.sectionType === 'Lecture') {
                    // Show alternative lectures
                    alternativeSections = courseData.sections.filter(
                      (section) => section.sectionType === 'Lecture' && section.sectionId !== draggedCourse.selectedSection.sectionId
                    );
                  } else if (draggedCourse.selectedSection.sectionType === 'Tutorial') {
                    // Show alternative tutorials with same parent lecture
                    alternativeSections = courseData.sections.filter(
                      (section) =>
                        section.sectionType === 'Tutorial' &&
                        section.parentLecture === draggedCourse.selectedSection.parentLecture &&
                        section.sectionId !== draggedCourse.selectedSection.sectionId
                    );
                  } else if (draggedCourse.selectedSection.sectionType === 'Lab') {
                    // Show alternative labs with same parent lecture
                    alternativeSections = courseData.sections.filter(
                      (section) =>
                        section.sectionType === 'Lab' &&
                        section.parentLecture === draggedCourse.selectedSection.parentLecture &&
                        section.sectionId !== draggedCourse.selectedSection.sectionId
                    );
                  }

                  return alternativeSections.flatMap((section) =>
                    section.timeSlots
                      .filter((ghostSlot) => ghostSlot.day === day)
                      .map((ghostSlot, idx: number) => (
                        <GhostSectionBlock
                          key={`ghost-${section.sectionId}-${idx}-${day}`}
                          section={section}
                          slot={ghostSlot}
                          course={courseData}
                          color={draggedCourse.color ?? DEFAULT_COURSE_COLOR}
                          getCourseStyle={getCourseStyle}
                        />
                      ))
                  );
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
    return (
      <>
        <DndContext
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
