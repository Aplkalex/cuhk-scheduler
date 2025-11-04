import { SelectedCourse, TimeSlot } from '@/types';
import { formatTime } from '@/lib/schedule-utils';
import { formatLocation } from '@/lib/location-utils';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  selectedCourse: SelectedCourse;
  className?: string;
  onClick?: () => void;
  onRemove?: () => void;
}

export function CourseCard({ selectedCourse, className, onClick, onRemove }: CourseCardProps) {
  const { course, selectedSection, color } = selectedCourse;

  const formatTimeSlot = (slot: TimeSlot) => {
    return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
  };

  return (
    <div
      className={cn(
        'relative rounded-xl p-4 shadow-sm transition-all hover:shadow-md',
        'border-l-4 bg-white',
        className
      )}
      style={{ borderLeftColor: color || '#8B5CF6' }}
      onClick={onClick}
    >
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors"
        >
          ×
        </button>
      )}

      {/* Time */}
      <div className="text-sm font-semibold mb-2" style={{ color: color || '#8B5CF6' }}>
        {selectedSection.timeSlots.map((slot, idx) => (
          <div key={idx}>{formatTimeSlot(slot)}</div>
        ))}
      </div>

      {/* Course code and section */}
      <div className="font-bold text-gray-900 mb-1">
        {course.courseCode} - {selectedSection.sectionId} ({selectedSection.sectionType.slice(0, 3).toUpperCase()})
      </div>

      {/* Course name */}
      <div className="text-sm text-gray-700 mb-3">
        {course.courseName}
      </div>

      {/* Instructor and Venue */}
      <div className="text-xs space-y-1">
        {selectedSection.instructor && (
          <div className="text-blue-600">
            Instructor: {selectedSection.instructor.name}
          </div>
        )}
        {selectedSection.timeSlots[0]?.location && (
          <div className="text-blue-600" title={formatLocation(selectedSection.timeSlots[0].location)}>
            Venue: {selectedSection.timeSlots[0].location}
          </div>
        )}
      </div>

      {/* Seats info */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        {selectedSection.seatsRemaining > 0 ? (
          <span className="text-green-600">
            {selectedSection.seatsRemaining} seats remaining
          </span>
        ) : (
          <span className="text-red-600">
            Full {selectedSection.waitlist && `(${selectedSection.waitlist} on waitlist)`}
          </span>
        )}
      </div>
    </div>
  );
}
