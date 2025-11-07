'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { SelectedCourse, DayOfWeek, TimeSlot, Section } from '@/types';
import { TIMETABLE_CONFIG, WEEKDAYS } from '@/lib/constants';
import { timeToMinutes, formatTime, hasAvailableSeats } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { X, AlertCircle, GripVertical } from 'lucide-react';

interface TimetableGridDraggableProps {
  selectedCourses: SelectedCourse[];
  onCourseClick?: (course: SelectedCourse) => void;
  onRemoveCourse?: (course: SelectedCourse) => void;
  onLocationClick?: (location: string) => void;
  conflictingCourses?: string[];
  onDragEnd: (courseCode: string, sectionId: string, newDay: DayOfWeek) => void;
}

const DEFAULT_COURSE_COLOR = '#8B5CF6';

type SectionType = Section['sectionType'];

interface DraggedSectionData {
  courseCode: string;
  sectionId: string;
  sectionType: SectionType;
  timeSlots: TimeSlot[];
  color?: string;
}

// Draggable Course Block Component
interface DraggableCourseBlockProps {
  selectedCourse: SelectedCourse;
  blockId: string;
  style: CSSProperties;
  onRemove?: (course: SelectedCourse) => void;
  onClick?: (course: SelectedCourse) => void;
  conflictingCourses?: string[];
  isDraggedSection: boolean;
}

function DraggableCourseBlock({
  selectedCourse,
  blockId,
  style,
  onRemove,
  onClick,
  conflictingCourses = [],
  isDraggedSection,
}: DraggableCourseBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: blockId,
    data: {
      courseCode: selectedCourse.course.courseCode,
      sectionId: selectedCourse.selectedSection.sectionId,
      sectionType: selectedCourse.selectedSection.sectionType,
      timeSlots: selectedCourse.selectedSection.timeSlots,
      color: selectedCourse.color,
    } satisfies DraggedSectionData,
  });

  const isFull = !hasAvailableSeats(selectedCourse.selectedSection);
  const hasConflict = conflictingCourses.includes(selectedCourse.course.courseCode);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute left-1 right-1 rounded-lg cursor-grab active:cursor-grabbing group',
        'timetable-block-enter',
        'hover:shadow-xl hover:scale-[1.02]',
        'text-white flex flex-col',
        'px-1.5 py-1',
        'overflow-visible',
        isFull && 'border-2 border-red-500 dark:border-red-400 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]',
        hasConflict && 'conflict-pattern border-2 border-red-500',
        (isDragging || isDraggedSection) && 'opacity-30 scale-95'
      )}
      style={{
        ...style,
        transition: isDragging ? 'none' : 'all 0.3s ease',
      }}
      {...attributes}
      {...listeners}
    >
      {/* Delete button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(selectedCourse);
          }}
          className={cn(
            'absolute -top-2 -right-2 w-6 h-6 rounded-lg',
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

      {/* Drag handle indicator */}
      <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Content */}
      <div 
        className="overflow-hidden flex flex-col justify-center h-full"
        onClick={() => onClick?.(selectedCourse)}
      >
        <div className="flex items-center gap-1">
          <div className="font-semibold text-xs leading-tight truncate flex-1">
            {selectedCourse.course.courseCode}
          </div>
          {isFull && (
            <div title="Section is full" className="flex-shrink-0">
              <AlertCircle className="w-3 h-3 text-red-200" />
            </div>
          )}
        </div>
        <div className="text-[10px] leading-tight opacity-90 truncate">
          {selectedCourse.selectedSection.sectionType === 'Lecture' ? 'LEC' : 'TUT'} {selectedCourse.selectedSection.sectionId}
        </div>
      </div>
    </div>
  );
}

// Drop Shadow Preview Component
interface DropShadowPreviewProps {
  timeSlots: TimeSlot[];
  color: string;
  getCourseStyle: (startTime: string, endTime: string, color?: string) => CSSProperties;
}

function DropShadowPreview({ timeSlots, color, getCourseStyle }: DropShadowPreviewProps) {
  return (
    <>
      {timeSlots.map((slot: TimeSlot, idx: number) => {
        const style = getCourseStyle(slot.startTime, slot.endTime, color);
        return (
          <div
            key={idx}
            className="absolute left-1 right-1 rounded-lg border-2 border-dashed pointer-events-none animate-pulse"
            style={{
              ...style,
              backgroundColor: `${color}30`,
              borderColor: `${color}`,
              opacity: 0.6,
            }}
          />
        );
      })}
    </>
  );
}

// Droppable Day Column Component
interface DroppableDayColumnProps {
  day: DayOfWeek;
  hours: number[];
  slotHeight: number;
  selectedCourses: SelectedCourse[];
  onRemoveCourse?: (course: SelectedCourse) => void;
  onCourseClick?: (course: SelectedCourse) => void;
  conflictingCourses?: string[];
  getCourseStyle: (startTime: string, endTime: string, color?: string) => CSSProperties;
  draggedData: DraggedSectionData | null;
  draggedCourseCode?: string;
  draggedSectionId?: string;
}

function DroppableDayColumn({
  day,
  hours,
  slotHeight,
  selectedCourses,
  onRemoveCourse,
  onCourseClick,
  conflictingCourses,
  getCourseStyle,
  draggedData,
  draggedCourseCode,
  draggedSectionId,
}: DroppableDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
    data: {
      day: day,
    },
  });

  // Show drop shadow if dragging and this is a valid drop zone
  const showDropShadow = isOver && draggedData !== null;
  
  // Check if the dragged section has multiple time slots
  const hasMultipleSlots = draggedData?.timeSlots && draggedData.timeSlots.length > 1;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative bg-white/40 dark:bg-[#1e1e1e]/40 backdrop-blur-sm rounded-lg border transition-all duration-300',
        isOver && hasMultipleSlots
          ? 'border-4 shadow-2xl ring-2 ring-offset-2' 
          : 'border border-gray-200/40 dark:border-gray-700/40',
        'overflow-hidden'
      )}
      style={{ 
  height: `${slotHeight * hours.length}px`,
  borderColor: isOver && hasMultipleSlots && draggedData ? draggedData.color : undefined,
  backgroundColor: isOver && hasMultipleSlots && draggedData ? `${draggedData.color ?? DEFAULT_COURSE_COLOR}15` : undefined,
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

      {/* Drop shadow preview when dragging over */}
      {showDropShadow && hasMultipleSlots && draggedData && (
        <DropShadowPreview
          timeSlots={draggedData.timeSlots}
          color={draggedData.color ?? DEFAULT_COURSE_COLOR}
          getCourseStyle={getCourseStyle}
        />
      )}

      {/* Course blocks */}
      {selectedCourses.map((selectedCourse) => {
        const isDraggedSection = 
          draggedCourseCode === selectedCourse.course.courseCode &&
          draggedSectionId === selectedCourse.selectedSection.sectionId;

        return selectedCourse.selectedSection.timeSlots
          .filter((slot) => slot.day === day)
          .map((slot, slotIdx) => {
            const style = getCourseStyle(slot.startTime, slot.endTime, selectedCourse.color);
            const blockId = `${selectedCourse.course.courseCode}-${selectedCourse.selectedSection.sectionId}-${day}-${slotIdx}`;
            
            return (
              <DraggableCourseBlock
                key={blockId}
                selectedCourse={selectedCourse}
                blockId={blockId}
                style={style}
                onRemove={onRemoveCourse}
                onClick={onCourseClick}
                conflictingCourses={conflictingCourses}
                isDraggedSection={isDraggedSection}
              />
            );
          });
      })}
    </div>
  );
}

export function TimetableGridDraggable(props: TimetableGridDraggableProps) {
  const {
    selectedCourses,
    onCourseClick,
    onRemoveCourse,
    conflictingCourses = [],
    onDragEnd,
  } = props;
  const { startHour, endHour, slotHeight } = TIMETABLE_CONFIG;
  const [draggedData, setDraggedData] = useState<DraggedSectionData | null>(null);
  
  // Generate hours array (8 AM to 9 PM)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  
  // Use only weekdays for now (Mon-Fri)
  const displayDays = WEEKDAYS.slice(0, 5) as DayOfWeek[];

  // Calculate position and height for a course block
  const getCourseStyle = (startTime: string, endTime: string, color?: string): CSSProperties => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const startOfDay = startHour * 60;
    
    const top = ((startMinutes - startOfDay) / 60) * slotHeight;
    const durationMinutes = endMinutes - startMinutes;
    const calculatedHeight = (durationMinutes / 60) * slotHeight;
    
    const blockGap = 4;
    const finalHeight = calculatedHeight - blockGap;
    const adjustedTop = top + blockGap / 2;
    
    return {
      top: `${adjustedTop}px`,
      height: `${finalHeight}px`,
      backgroundColor: color ?? DEFAULT_COURSE_COLOR,
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DraggedSectionData | undefined;
    if (data) {
      setDraggedData(data);
    }
  };

  const handleDragEndInternal = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedData) {
      setDraggedData(null);
      return;
    }

    const dropData = over.data.current as { day?: DayOfWeek } | undefined;

    if (dropData?.day) {
      const newDay = dropData.day;
      
      // Only proceed if the section has multiple time slots (draggable)
      if (draggedData.timeSlots && draggedData.timeSlots.length > 1) {
        onDragEnd(draggedData.courseCode, draggedData.sectionId, newDay);
      }
    }

    setDraggedData(null);
  };

  return (
    <DndContext 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndInternal}
    >
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
                <DroppableDayColumn
                  key={day}
                  day={day}
                  hours={hours}
                  slotHeight={slotHeight}
                  selectedCourses={selectedCourses}
                  onRemoveCourse={onRemoveCourse}
                  onCourseClick={onCourseClick}
                  conflictingCourses={conflictingCourses}
                  getCourseStyle={getCourseStyle}
                  draggedData={draggedData}
                  draggedCourseCode={draggedData?.courseCode}
                  draggedSectionId={draggedData?.sectionId}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay>
        {draggedData && (
          <div
            className="rounded-lg text-white flex flex-col px-2 py-1.5 shadow-2xl opacity-90 border-2 border-white"
            style={{
              backgroundColor: draggedData.color ?? DEFAULT_COURSE_COLOR,
              width: '140px',
              minHeight: '60px',
            }}
          >
            <div className="font-semibold text-xs leading-tight">
              {draggedData.courseCode}
            </div>
            <div className="text-[10px] leading-tight opacity-90">
              {draggedData.sectionType === 'Lecture' ? 'LEC' : 'TUT'} {draggedData.sectionId}
            </div>
            <div className="text-[9px] leading-tight opacity-75 mt-0.5">
              {draggedData.timeSlots?.length || 0} session{draggedData.timeSlots?.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
