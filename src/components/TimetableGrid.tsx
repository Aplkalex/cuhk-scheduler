'use client';

import { useState, memo, useTransition } from 'react';
import type { CSSProperties, /* MouseEvent */ } from 'react';
import { SelectedCourse, DayOfWeek, Course, Section, TimeSlot } from '@/types';
import { TIMETABLE_CONFIG, WEEKDAYS } from '@/lib/constants';
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
}

const DEFAULT_COURSE_COLOR = '#8B5CF6';
const PIXEL_GLASS_TEXTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Crect width='6' height='6' fill='%23FFFFFF1F'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23FFFFFF5A'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23FFFFFF36'/%3E%3C/svg%3E";

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
      text: 'rgba(36, 40, 52, 0.92)',
      textShadow: '0 1px 3px rgba(255, 255, 255, 0.4)',
      luminance: 0.3,
    };
  }

  const { r, g, b } = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const prefersDarkText = luminance > 0.55;

  const surfaceSubtle = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.12 : 0.2})`;
  const surface = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.2 : 0.32})`;
  const surfaceActive = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.3 : 0.45})`;
  const border = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.38 : 0.55})`;
  const borderSoft = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.24 : 0.38})`;
  const glow = `rgba(${r}, ${g}, ${b}, ${prefersDarkText ? 0.28 : 0.46})`;
  const text = prefersDarkText ? 'rgba(36, 40, 52, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const textShadow = prefersDarkText
    ? '0 1px 2px rgba(255, 255, 255, 0.52)'
    : '0 2px 6px rgba(15, 23, 42, 0.55)';

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
}: TimetableGridProps) {
  const [draggedCourse, setDraggedCourse] = useState<SelectedCourse | null>(null);
  const [, startTransition] = useTransition();
  const { startHour, endHour, slotHeight } = TIMETABLE_CONFIG;
  
  // Generate hours array (8 AM to 9 PM)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  
  // Use only weekdays for now (Mon-Fri)
  const displayDays = WEEKDAYS.slice(0, 5) as DayOfWeek[];

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
      backgroundColor: palette.surface,
      borderColor: palette.border,
      boxShadow: `0 26px 40px -30px ${palette.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.48), inset 0 -1px 0 rgba(15, 23, 42, 0.12)`,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      color: palette.text,
      textShadow: palette.textShadow,
    };

    style['--course-glow'] = palette.glow;

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
      backgroundImage: `url(${PIXEL_GLASS_TEXTURE})`,
      backgroundSize: '6px 6px',
      backgroundBlendMode: 'soft-light',
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
          'absolute left-1 right-1 rounded-xl border border-dashed pointer-events-auto cursor-pointer',
          'flex flex-col items-center justify-center px-1.5 py-1.5 backdrop-blur-2xl',
          'transition-[transform,box-shadow,opacity] duration-200 ease-out',
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
            {section.instructor.name.split(' ').slice(-2).join(' ')}
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
          setNodeRef(node);
          setDropRef(node);
        }}
        {...attributes}
        {...(isDraggable ? listeners : {})}
        className={cn(
          'absolute left-1 right-1 rounded-xl cursor-pointer group',
          'flex flex-col px-1.5 py-1.5 overflow-visible border backdrop-blur-2xl',
          'transition-[transform,box-shadow,opacity] duration-200 ease-out',
          'hover:scale-[1.03] hover:shadow-[0_28px_45px_-30px_var(--course-glow)]',
          'shadow-[0_22px_38px_-32px_var(--course-glow)]',
          isFull && 'border-2 border-red-500/80 dark:border-red-400/80 shadow-[0_0_0_1px_rgba(239,68,68,0.55)] backdrop-blur-3xl',
          hasConflict && 'border-2 border-yellow-500/80 dark:border-yellow-400/80 ring-2 ring-yellow-500/40',
          isDragging && 'opacity-0',
          isValidDropTarget && 'ring-4 ring-yellow-400/70 scale-105 shadow-2xl animate-pulse',
          isDraggable && 'cursor-grab active:cursor-grabbing',
          !isDraggable && enableDragDrop && 'cursor-default',
        )}
        style={{
          ...style,
          backgroundImage: hasConflict
            ? `repeating-linear-gradient(135deg, rgba(250, 204, 21, 0.34) 0px, rgba(250, 204, 21, 0.14) 12px, transparent 12px, transparent 24px), url(${PIXEL_GLASS_TEXTURE})`
            : `url(${PIXEL_GLASS_TEXTURE})`,
          backgroundSize: hasConflict ? 'auto, 6px 6px' : '6px 6px',
          backgroundBlendMode: hasConflict ? 'normal, soft-light' : 'soft-light',
          borderColor: isFull
            ? 'rgba(244, 63, 94, 0.88)'
            : hasConflict
              ? 'rgba(250, 204, 21, 0.88)'
              : palette.border,
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
            : 'top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.35s ease, transform 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s ease-out',
          willChange: 'top, height, left',
        }}
        onMouseEnter={() => setIsLocalHovered(true)}
        onMouseLeave={() => setIsLocalHovered(false)}
      >
        {/* Drag handle - only show if draggable */}
        {isDraggable && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Delete button */}
        {onRemoveCourse && (
          <button
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
        <div className="flex h-full flex-col justify-center gap-1">
          {/* First row: Course code + section + icons */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wide drop-shadow-sm leading-none">
                {selectedCourse.course.courseCode}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-90 leading-none">
                {selectedCourse.selectedSection.sectionType === 'Lecture' ? 'LEC' : 
                 selectedCourse.selectedSection.sectionType === 'Tutorial' ? 'TUT' : 
                 selectedCourse.selectedSection.sectionType} {selectedCourse.selectedSection.sectionId}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isDraggable && (
                <RefreshCw
                  className="h-3 w-3 opacity-70 transition-transform group-hover:scale-110 group-hover:opacity-100"
                  aria-hidden
                  focusable={false}
                />
              )}
              {hasConflict && (
                <span
                  title="Schedule conflict"
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300/90 text-slate-900 shadow-lg ring-1 ring-white/50 backdrop-blur"
                >
                  <AlertCircle className="h-2.5 w-2.5" />
                </span>
              )}
              {isFull && (
                <span
                  title="Section is full"
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-400/90 text-white shadow-lg ring-1 ring-white/40 backdrop-blur"
                >
                  <AlertCircle className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Second row: Location */}
          <div className="text-[9px] font-semibold uppercase tracking-wider opacity-85 leading-none">
            <span className="truncate block" title={locationLabel ?? undefined}>
              {locationDisplay}
            </span>
          </div>
        </div>
      </div>
    );
  });

  const gridTemplateColumns = `70px repeat(${displayDays.length}, minmax(0, 1fr))`;
  const pixelGlassStyle: CSSProperties = {
    backgroundImage: `url(${PIXEL_GLASS_TEXTURE})`,
    backgroundSize: '8px 8px',
    backgroundBlendMode: 'soft-light',
  };

  const content = (
    <div
      className="relative w-full rounded-3xl border border-white/50 bg-white/70 shadow-[0_45px_85px_-58px_rgba(59,130,246,0.35)] backdrop-blur-[28px] dark:border-white/12 dark:bg-slate-950/55 dark:shadow-[0_45px_90px_-58px_rgba(15,23,42,0.7)]"
      style={pixelGlassStyle}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[360px] sm:min-w-[700px] lg:min-w-0 px-3 py-3 sm:px-5 sm:py-5">
          <div className="grid items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4" style={{ gridTemplateColumns }}>
            <div className="flex items-center justify-end pr-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600/85 dark:text-slate-200/70">
              Time
            </div>
            {displayDays.map((day) => (
              <div
                key={day}
                className="flex h-full items-center justify-center rounded-2xl border border-white/65 bg-white/75 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600/90 shadow-[0_22px_42px_-30px_rgba(59,130,246,0.4)] backdrop-blur-2xl dark:border-white/18 dark:bg-slate-900/55 dark:text-slate-200"
                style={pixelGlassStyle}
              >
                {day}
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
                className="relative rounded-2xl border overflow-hidden transition-all duration-300 backdrop-blur-2xl border-white/45 bg-white/55 hover:border-white/70 hover:shadow-[0_32px_58px_-35px_rgba(59,130,246,0.35)] dark:border-white/12 dark:bg-slate-950/55 dark:hover:border-white/20 dark:hover:shadow-[0_32px_58px_-35px_rgba(15,23,42,0.65)]"
                style={{
                  ...pixelGlassStyle,
                  height: `${slotHeight * hours.length}px`,
                }}
              >
                {/* Hour grid lines */}
                {hours.slice(1).map((hour, idx) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-gray-100/50 dark:border-gray-800/50"
                    style={{ top: `${(idx + 1) * slotHeight}px` }}
                  />
                ))}

                {/* Course blocks */}
                {selectedCourses.map((selectedCourse, courseIdx) =>
                  selectedCourse.selectedSection.timeSlots
                    .filter((slot) => slot.day === day)
                    .map((slot, slotIdx) => {
                      const style = getCourseStyle(slot.startTime, slot.endTime, selectedCourse.color);
                      const blockId = `${courseIdx}-${slotIdx}-${day}`;

                      return (
                        <DraggableCourseBlock
                          key={blockId}
                          selectedCourse={selectedCourse}
                          blockId={blockId}
                          style={style}
                          slot={slot}
                        />
                      );
                    })
                )}

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
                  className="p-3 rounded-xl border shadow-2xl backdrop-blur-2xl"
                  style={{
                    backgroundColor: palette.surfaceActive,
                    backgroundImage: `url(${PIXEL_GLASS_TEXTURE})`,
                    backgroundSize: '8px 8px',
                    backgroundBlendMode: 'soft-light',
                    borderColor: palette.border,
                    color: palette.text,
                    textShadow: palette.textShadow,
                    transform: 'scale(1.05)',
                    boxShadow: `0 32px 48px -30px ${palette.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0 rgba(15, 23, 42, 0.15)`,
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
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
