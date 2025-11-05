'use client';

import { useState, memo, useTransition } from 'react';
import { SelectedCourse, DayOfWeek } from '@/types';
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
  availableCourses?: any[]; // All available courses for showing alternatives
  onSwapWarning?: (message: string, type: 'full' | 'conflict') => void; // Callback for swap warnings
}

export function TimetableGrid({ 
  selectedCourses, 
  onCourseClick, 
  onRemoveCourse, 
  onLocationClick, 
  conflictingCourses = [],
  onSwapLectures,
  onSwapTutorials,
  enableDragDrop = false,
  availableCourses = [],
  onSwapWarning,
}: TimetableGridProps) {
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const [draggedCourse, setDraggedCourse] = useState<SelectedCourse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSwapping, setIsSwapping] = useState(false); // Track if we're in the middle of a swap
  const [hasActuallyDragged, setHasActuallyDragged] = useState(false); // Track if user actually moved during drag
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null); // Track initial drag position
  const { startHour, endHour, slotHeight } = TIMETABLE_CONFIG;
  
  // Generate hours array (8 AM to 9 PM)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  
  // Use only weekdays for now (Mon-Fri)
  const displayDays = WEEKDAYS.slice(0, 5) as DayOfWeek[];

  // Calculate position and height for a course block
  const getCourseStyle = (startTime: string, endTime: string, color?: string) => {
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
    
    return {
      top: `${adjustedTop}px`,
      height: `${finalHeight}px`,
      backgroundColor: color || '#8B5CF6',
    };
  };

  // Drag & drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const course = event.active.data.current?.course as SelectedCourse;
    setDraggedCourse(course);
    setHasActuallyDragged(false); // Reset on drag start
    // Store initial position
    if (event.activatorEvent instanceof MouseEvent || event.activatorEvent instanceof TouchEvent) {
      const clientX = 'clientX' in event.activatorEvent ? event.activatorEvent.clientX : event.activatorEvent.touches[0].clientX;
      const clientY = 'clientY' in event.activatorEvent ? event.activatorEvent.clientY : event.activatorEvent.touches[0].clientY;
      setDragStartPos({ x: clientX, y: clientY });
    }
  };

  const handleDragMove = (event: any) => {
    // Only consider it a real drag if user moved more than 5 pixels
    if (!hasActuallyDragged && dragStartPos && event.delta) {
      const distance = Math.sqrt(Math.pow(event.delta.x, 2) + Math.pow(event.delta.y, 2));
      if (distance > 5) {
        setHasActuallyDragged(true);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.data.current || !over.data.current) {
      setDraggedCourse(null);
      setDragStartPos(null);
      return;
    }

    const draggedCourse = active.data.current.course as SelectedCourse;
    const targetCourse = over.data.current.course as SelectedCourse;

    // Don't swap with itself
    if (draggedCourse === targetCourse) {
      setDraggedCourse(null);
      setDragStartPos(null);
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

    // Show warnings if needed
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

    // Clear draggedCourse immediately to hide ghost blocks
    setDraggedCourse(null);
    setDragStartPos(null);

    // Set swapping flag to suppress animations
    setIsSwapping(true);

    // Proceed with swap regardless of warnings (user can decide)
    // Use startTransition for the swap to make it non-blocking
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

      // Clear swapping flag after a brief delay to allow the swap to complete
      setTimeout(() => setIsSwapping(false), 0);
    });
  };

  const handleDragCancel = () => {
    setDraggedCourse(null);
    setHasActuallyDragged(false);
    setDragStartPos(null);
  };

  // Ghost Section Block Component (appears when dragging a lecture or tutorial)
  const GhostSectionBlock = memo(({ 
    section, 
    slot, 
    day,
    courseCode,
    color,
    getCourseStyle,
  }: { 
    section: any; 
    slot: any; 
    day: string;
    courseCode: string;
    color: string;
    getCourseStyle: (startTime: string, endTime: string, color?: string) => any;
  }) => {
    const ghostId = `ghost-${courseCode}-${section.sectionId}-${slot.day}-${slot.startTime}`;
    
    const { setNodeRef, isOver } = useDroppable({
      id: ghostId,
      data: { 
        course: { 
          course: { courseCode }, 
          selectedSection: section,
          color,
        } 
      },
    });

    const style = getCourseStyle(slot.startTime, slot.endTime, color);
    
    // Extract RGB values from the color for the border/background
    const colorWithOpacity = color || '#8B5CF6';

    return (
      <div
        ref={setNodeRef}
        className={cn(
          'absolute left-1 right-1 rounded-lg border-2 border-dashed',
          'pointer-events-auto cursor-pointer',
          'flex flex-col items-center justify-center',
          'px-1.5 py-1',
          isOver && 'border-yellow-400 bg-yellow-400/40 scale-[1.03] shadow-xl ring-2 ring-yellow-400/50 transition-all duration-200',
        )}
        style={{
          ...style,
          ...((!isOver) && {
            borderColor: `${colorWithOpacity}99`,
            backgroundColor: `${colorWithOpacity}1A`,
          }),
        }}
      >
        <div className="text-xs font-bold text-gray-900 dark:text-white text-center">
          {section.sectionType === 'Lecture' ? 'LEC' : section.sectionType.toUpperCase()} {section.sectionId}
        </div>
        {section.instructor && (
          <div className="text-[9px] text-gray-700 dark:text-gray-300 text-center truncate max-w-full">
            {section.instructor.name.split(' ').slice(-2).join(' ')}
          </div>
        )}
        {isOver && (
          <div className="text-[10px] text-yellow-900 dark:text-yellow-100 font-semibold mt-0.5">
            ↓ Drop here
          </div>
        )}
      </div>
    );
  });

  // Draggable Course Block Component
  const DraggableCourseBlock = memo(({ 
    selectedCourse, 
    blockId, 
    style, 
    day, 
    slot,
    isDraggedCourse,
    isSwapping: isSwappingProp,
    hasActuallyDragged: hasActuallyDraggedProp,
  }: { 
    selectedCourse: SelectedCourse; 
    blockId: string; 
    style: any; 
    day: DayOfWeek; 
    slot: any;
    isDraggedCourse: boolean;
    isSwapping: boolean;
    hasActuallyDragged: boolean;
  }) => {
    const [isLocalHovered, setIsLocalHovered] = useState(false);
    const uniqueId = `${selectedCourse.course.courseCode}-${selectedCourse.selectedSection.sectionId}-${blockId}`;
    
    // Calculate duration of this time slot (shorter courses should appear on top)
    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    // Check if there are alternatives to swap to
    const courseData = availableCourses.find(c => c.courseCode === selectedCourse.course.courseCode);
    let hasAlternatives = false;
    
    if (courseData && enableDragDrop) {
      if (selectedCourse.selectedSection.sectionType === 'Lecture') {
        // Count lectures - need at least 2 to enable drag
        const lectureCount = courseData.sections.filter((s: any) => s.sectionType === 'Lecture').length;
        hasAlternatives = lectureCount > 1;
      } else if (selectedCourse.selectedSection.sectionType === 'Tutorial') {
        // Count tutorials with same parentLecture - need at least 2 to enable drag
        const tutorialCount = courseData.sections.filter(
          (s: any) => s.sectionType === 'Tutorial' && s.parentLecture === selectedCourse.selectedSection.parentLecture
        ).length;
        hasAlternatives = tutorialCount > 1;
      } else if (selectedCourse.selectedSection.sectionType === 'Lab') {
        // Count labs with same parentLecture - need at least 2 to enable drag
        const labCount = courseData.sections.filter(
          (s: any) => s.sectionType === 'Lab' && s.parentLecture === selectedCourse.selectedSection.parentLecture
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

    const isFull = !hasAvailableSeats(selectedCourse.selectedSection);
    const hasConflict = conflictingCourses.includes(selectedCourse.course.courseCode);

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
        return draggedCourse.course.courseCode === selectedCourse.course.courseCode &&
               draggedSection.parentLecture === targetSection.parentLecture;
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
        {...listeners}
        className={cn(
          'absolute left-1 right-1 rounded-lg cursor-pointer group',
          !isSwappingProp && 'timetable-block-enter',
          'hover:shadow-xl hover:scale-[1.02]',
          'text-white flex flex-col',
          'px-1.5 py-1',
          'overflow-visible',
          isFull && 'border-2 border-red-500 dark:border-red-400 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]',
          hasConflict && 'conflict-pattern border-2 border-yellow-500 dark:border-yellow-400 ring-2 ring-yellow-500/50',
          isDragging && 'opacity-30',
          isValidDropTarget && 'ring-4 ring-yellow-400 scale-105 shadow-2xl',
          isDraggable && 'cursor-grab active:cursor-grabbing',
          !isDraggable && enableDragDrop && 'cursor-default',
        )}
        style={{
          ...style,
          // Z-index logic: shorter courses appear on top when conflicting
          // Base z-index: 1 (normal), 10+ (conflicts)
          // For conflicts: z-index = 100 - duration (so 50min class = z50, 180min class = z20)
          // This ensures shorter courses are always visible on top
          // When hovered, bring to the very top (z-index 200)
          zIndex: isLocalHovered && hasConflict 
            ? 200 
            : hasConflict 
              ? Math.max(10, 100 - Math.floor(durationMinutes / 10)) 
              : 1,
          // More transparency for conflicts so overlapping courses are clearly visible
          // Full opacity when hovered
          opacity: hasConflict ? (isLocalHovered ? 1 : 0.85) : 1,
          transition: isSwappingProp ? 'none' : isDragging ? 'opacity 0.2s' : 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease, z-index 0.1s ease, opacity 0.2s ease',
        }}
        onMouseEnter={() => setIsLocalHovered(true)}
        onMouseLeave={() => setIsLocalHovered(false)}
      >
        {/* Drag handle - only show if draggable */}
        {isDraggable && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div 
          className="overflow-hidden flex flex-col justify-center h-full relative"
          onClick={(e) => {
            // Only trigger click if user didn't actually drag
            if (!hasActuallyDraggedProp) {
              onCourseClick?.(selectedCourse);
            }
          }}
        >
          <div className="flex items-center gap-1">
            <div className="font-semibold text-xs leading-tight truncate flex-1">
              {selectedCourse.course.courseCode}
            </div>
            {hasConflict && (
              <div title="Schedule conflict" className="flex-shrink-0">
                <AlertCircle className="w-3 h-3 text-yellow-200 dark:text-yellow-300 animate-pulse" />
              </div>
            )}
            {isFull && !hasConflict && (
              <div title="Section is full" className="flex-shrink-0">
                <AlertCircle className="w-3 h-3 text-red-200" />
              </div>
            )}
          </div>
          <div className="text-[10px] leading-tight opacity-90 truncate flex items-center gap-1">
            {selectedCourse.selectedSection.sectionType === 'Lecture' ? 'LEC' : 'TUT'} {selectedCourse.selectedSection.sectionId}
            {selectedCourse.selectedSection.sectionType === 'Lecture' && (
              <RefreshCw className="w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            )}
          </div>
        </div>
      </div>
    );
  });

  const content = (
    <div className="w-full bg-white/60 dark:bg-[#252526]/60 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-gray-200/40 dark:border-gray-700/40">
      <div className="overflow-x-auto">
        <div className="min-w-[320px] sm:min-w-[600px] lg:min-w-0 w-full px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-3">
          {/* Header with days */}
          <div className="grid gap-1 sm:gap-1.5 lg:gap-2 mb-2" style={{ gridTemplateColumns: '70px repeat(5, 1fr)' }}>
            <div /> {/* Empty corner */}
            {displayDays.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-gray-700 dark:text-gray-200 py-2 sm:py-2.5 lg:py-3 bg-white/50 dark:bg-[#2d2d30]/50 backdrop-blur-md rounded-lg shadow-sm border border-gray-200/40 dark:border-gray-700/40"
              >
                <div className="text-xs sm:text-sm lg:text-base">{day}</div>
              </div>
            ))}
          </div>

          {/* Timetable grid */}
          <div className="relative grid gap-1 sm:gap-1.5 lg:gap-2" style={{ gridTemplateColumns: '70px repeat(5, 1fr)' }}>
            {/* Time labels */}
            <div className="space-y-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-right pr-1.5 sm:pr-2 text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 font-medium"
                  style={{ height: `${slotHeight}px`, lineHeight: `${slotHeight}px` }}
                >
                  {formatTime(`${hour}:00`)}
                </div>
              ))}
            </div>

          {/* Day columns */}
          {displayDays.map((day) => (
            <div
              key={day}
              className="relative bg-white/40 dark:bg-[#1e1e1e]/40 backdrop-blur-sm rounded-lg border border-gray-200/40 dark:border-gray-700/40 overflow-hidden transition-all duration-300"
              style={{ height: `${slotHeight * hours.length}px` }}
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
                        day={day}
                        slot={slot}
                        isDraggedCourse={draggedCourse === selectedCourse}
                        isSwapping={isSwapping}
                        hasActuallyDragged={hasActuallyDragged}
                      />
                    );
                  })
              )}

              {/* Ghost blocks for alternative sections when dragging */}
              {draggedCourse && (() => {
                const courseData = availableCourses.find(c => c.courseCode === draggedCourse.course.courseCode);
                if (!courseData) return null;

                let alternativeSections: any[] = [];

                if (draggedCourse.selectedSection.sectionType === 'Lecture') {
                  // Show alternative lectures
                  alternativeSections = courseData.sections.filter(
                    (s: any) => s.sectionType === 'Lecture' && s.sectionId !== draggedCourse.selectedSection.sectionId
                  );
                } else if (draggedCourse.selectedSection.sectionType === 'Tutorial') {
                  // Show alternative tutorials with same parent lecture
                  alternativeSections = courseData.sections.filter(
                    (s: any) => 
                      s.sectionType === 'Tutorial' && 
                      s.parentLecture === draggedCourse.selectedSection.parentLecture &&
                      s.sectionId !== draggedCourse.selectedSection.sectionId
                  );
                } else if (draggedCourse.selectedSection.sectionType === 'Lab') {
                  // Show alternative labs with same parent lecture
                  alternativeSections = courseData.sections.filter(
                    (s: any) => 
                      s.sectionType === 'Lab' && 
                      s.parentLecture === draggedCourse.selectedSection.parentLecture &&
                      s.sectionId !== draggedCourse.selectedSection.sectionId
                  );
                }

                return alternativeSections.flatMap((section: any) =>
                  section.timeSlots
                    .filter((slot: any) => slot.day === day)
                    .map((slot: any, idx: number) => (
                      <GhostSectionBlock
                        key={`ghost-${section.sectionId}-${idx}-${day}`}
                        section={section}
                        slot={slot}
                        day={day}
                        courseCode={draggedCourse.course.courseCode}
                        color={draggedCourse.color || '#8B5CF6'}
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
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {content}
          
          <DragOverlay dropAnimation={null}>
            {draggedCourse && (
              <div 
                className="text-white p-2 rounded-lg shadow-xl opacity-90"
                style={{ 
                  backgroundColor: draggedCourse.color || '#8B5CF6',
                  transition: 'none',
                }}
              >
                <div className="font-bold">{draggedCourse.course.courseCode}</div>
                <div className="text-xs">
                  {draggedCourse.selectedSection.sectionType} {draggedCourse.selectedSection.sectionId}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </>
    );
  }

  return content;
}

// Memoize TimetableGrid to prevent re-renders when parent state changes (e.g., search query)
export default memo(TimetableGrid);
