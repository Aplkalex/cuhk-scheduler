'use client';

import { Course, Section, SelectedCourse } from '@/types';
import { hasAvailableSeats, getActiveLectureId } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronDown, ChevronRight, Info, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { useState, useMemo } from 'react';

interface CourseListItemProps {
  course: Course;
  onAddSection: (course: Course, section: Section) => void;
  onRemoveSection: (course: Course, section: Section) => void;
  selectedCourses: SelectedCourse[];
  mode?: 'manual' | 'auto-generate';
  isSelected?: boolean;
  onToggleSelection?: (courseCode: string) => void;
}

function SectionButton({ section, /* course, isSectionSelected, onAddSection, onRemoveSection */ }: {
  section: Section;
  course: Course;
  isSectionSelected: boolean;
  onAddSection: (course: Course, section: Section) => void;
  onRemoveSection: (course: Course, section: Section) => void;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="font-semibold text-gray-900 dark:text-white text-xs">
          {section.sectionType} {section.sectionId}
        </span>
        {section.instructor && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            • {section.instructor.name}
          </span>
        )}
      </div>

      {/* Language and Consent badges */}
      {(section.language || section.addConsent || section.dropConsent) && (
        <div className="flex flex-wrap gap-1 mb-1">
          {section.language && (
            <span className="text-[9px] bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
              {section.language}
            </span>
          )}
          {section.addConsent && (
            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
              Add Consent
            </span>
          )}
          {section.dropConsent && (
            <span className="text-[9px] bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-medium">
              Drop Consent
            </span>
          )}
        </div>
      )}
      
      <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0">
        {section.timeSlots.slice(0, 2).map((slot, idx) => (
          <div key={idx} className="truncate">
            {slot.day.slice(0, 3)} {slot.startTime}-{slot.endTime}
            {slot.location && ` @ ${slot.location}`}
          </div>
        ))}
        {section.timeSlots.length > 2 && (
          <div className="text-gray-400 dark:text-gray-500">+{section.timeSlots.length - 2} more</div>
        )}
      </div>

      <div className="mt-1 text-[10px]">
        {hasAvailableSeats(section) ? (
          <span className="text-green-600 dark:text-green-400 font-medium">
            {section.seatsRemaining}/{section.quota} seats
          </span>
        ) : (
          <span className="text-red-600 dark:text-red-400 font-medium">
            Full ({section.enrolled}/{section.quota})
          </span>
        )}
      </div>
    </div>
  );
}

function CourseListItem({ 
  course, 
  onAddSection, 
  onRemoveSection, 
  selectedCourses,
  mode = 'manual',
  isSelected = false,
  onToggleSelection
}: CourseListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedLectures, setExpandedLectures] = useState<Set<string>>(new Set());
  
  // Check if a section is already selected
  const isSectionSelected = (section: Section) => {
    return selectedCourses.some(
      (sc) => sc.course.courseCode === course.courseCode && sc.selectedSection.sectionId === section.sectionId
    );
  };

  // Find which lecture is currently selected for this course (if any)
  const activeLectureId = useMemo(() => {
    return getActiveLectureId(selectedCourses, course);
  }, [selectedCourses, course]);

  // Group sections by lecture (for courses with LEC+TUT structure)
  const sectionGroups = useMemo(() => {
    const lectures = course.sections.filter(s => s.sectionType === 'Lecture');
    const tutorials = course.sections.filter(s => s.sectionType === 'Tutorial');
    const labs = course.sections.filter(s => s.sectionType === 'Lab');

    // If there are lectures with associated tutorials or labs
    if (lectures.length > 0 && (tutorials.some(t => t.parentLecture) || labs.some(l => l.parentLecture))) {
      return lectures.map(lecture => ({
        lecture,
        tutorials: tutorials.filter(t => t.parentLecture === lecture.sectionId),
        labs: labs.filter(l => l.parentLecture === lecture.sectionId),
      }));
    }

    // Otherwise, return null (flat structure)
    return null;
  }, [course.sections]);

  const toggleLecture = (lectureId: string) => {
    const newExpanded = new Set(expandedLectures);
    if (newExpanded.has(lectureId)) {
      newExpanded.delete(lectureId);
    } else {
      newExpanded.add(lectureId);
    }
    setExpandedLectures(newExpanded);
  };

  const hasDetails = course.description || course.enrollmentRequirements;

  return (
    <div className="bg-white/60 dark:bg-[#252526]/60 backdrop-blur-lg rounded-xl p-3 shadow-md hover:shadow-xl transition-all border border-gray-200/40 dark:border-gray-700/40">
      {/* Course header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            {course.courseCode}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
            {course.courseName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
            {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
          </div>
          
          {/* Quick Add/Remove button in Auto-Generate mode */}
          {mode === 'auto-generate' && onToggleSelection && (
            <button
              onClick={() => onToggleSelection(course.courseCode)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1",
                isSelected
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              )}
            >
              {isSelected ? (
                <>
                  <Check className="w-3 h-3" />
                  Selected
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  Select
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Department */}
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
        {course.department}
      </div>

      {/* Course Details Toggle */}
      {hasDetails && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-2 font-medium transition-colors"
        >
          <Info className="w-3 h-3" />
          <span>Course Details</span>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      )}

      {/* Expandable Course Details */}
      {isExpanded && hasDetails && (
        <div className="mb-3 p-2 bg-gray-50/50 dark:bg-[#1e1e1e]/50 backdrop-blur-sm rounded-lg border border-gray-200/40 dark:border-gray-700/40 space-y-2">
          {course.enrollmentRequirements && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Enrollment Requirements</h4>
              <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {course.enrollmentRequirements}
              </p>
            </div>
          )}
          {course.description && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</h4>
              <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {course.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sections - Only show in Manual mode */}
      {mode === 'manual' && (
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {sectionGroups 
            ? (course.sections.some(s => s.sectionType === 'Lab') 
              ? 'Lecture, Tutorial & Lab Sections' 
              : 'Lecture & Tutorial Sections')
            : 'Sections'}
        </div>
        
        {sectionGroups ? (
          // Hierarchical view for courses with LEC+TUT/LAB structure
          <div className="space-y-2">
            {sectionGroups.map(({ lecture, tutorials, labs }) => {
              const isLectureExpanded = expandedLectures.has(lecture.sectionId);
              const isLectureSelected = isSectionSelected(lecture);
              const isOtherLectureSelected = !!activeLectureId && activeLectureId !== lecture.sectionId;
              const isDisabled = isOtherLectureSelected;
              const isFull = !hasAvailableSeats(lecture);

              return (
                <div key={lecture.sectionId} className={cn(
                  "border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all",
                  isDisabled && "opacity-50"
                )}>
                  {/* Lecture header */}
                  <div className={cn(
                    "flex items-center justify-between p-2 transition-colors",
                    isLectureSelected 
                      ? "bg-purple-50/80 dark:bg-purple-900/20" 
                      : isDisabled
                      ? "bg-gray-100/50 dark:bg-gray-800/50 cursor-not-allowed"
                      : "bg-gray-50/80 dark:bg-[#1e1e1e]/80 hover:bg-gray-100 dark:hover:bg-[#252526]"
                  )}>
                    <button
                      onClick={() => !isDisabled && toggleLecture(lecture.sectionId)}
                      disabled={isDisabled}
                      className="flex items-center gap-1.5 flex-1 text-left"
                    >
                      {isLectureExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <span className={cn(
                        "font-bold text-xs",
                        isDisabled ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"
                      )}>
                        Lecture {lecture.sectionId}
                      </span>
                      {lecture.language && (
                        <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                          {lecture.language}
                        </span>
                      )}
                      {isFull && !isLectureSelected && (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                          ⚠️ Full
                        </span>
                      )}
                      {hasAvailableSeats(lecture) ? (
                        <span className="text-[9px] text-green-600 dark:text-green-400 font-medium ml-auto">
                          {lecture.seatsRemaining} seats
                        </span>
                      ) : (
                        <span className="text-[9px] text-red-600 dark:text-red-400 font-medium ml-auto">
                          Full
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => isLectureSelected ? onRemoveSection(course, lecture) : onAddSection(course, lecture)}
                      disabled={isDisabled && !isLectureSelected}
                      className={cn(
                        'flex-shrink-0 p-1.5 ml-2 rounded-md transition-all',
                        isLectureSelected
                          ? 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white hover:scale-110'
                          : isDisabled
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white hover:scale-110'
                      )}
                      title={
                        isLectureSelected 
                          ? 'Remove from schedule' 
                          : isDisabled 
                          ? 'Another lecture already selected' 
                          : isFull
                          ? 'Add to schedule (Full - may require waitlist/consent)'
                          : 'Add to schedule'
                      }
                    >
                      {isLectureSelected ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  {/* Warning for full sections */}
                  {isFull && !isLectureSelected && !isDisabled && (
                    <div className="px-3 py-1.5 bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800/30">
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Section is full. You can still add it but may need to join waitlist or get instructor consent.</span>
                      </p>
                    </div>
                  )}

                  {/* Lecture details & tutorials */}
                  {isLectureExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      {/* Lecture time slots */}
                      <div className="px-3 py-2 bg-white/40 dark:bg-[#252526]/40 text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5">
                        {lecture.instructor && (
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            👤 {lecture.instructor.name}
                          </div>
                        )}
                        {lecture.timeSlots.map((slot, idx) => (
                          <div key={idx}>
                            📅 {slot.day} {slot.startTime}-{slot.endTime}
                            {slot.location && ` @ ${slot.location}`}
                          </div>
                        ))}
                      </div>

                      {/* Tutorials */}
                      {tutorials.length > 0 && (
                        <div className="px-3 py-2 bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            📝 Choose ONE Tutorial:
                          </div>
                          <div className="space-y-1.5">
                            {tutorials.map((tutorial) => {
                              const isTutSelected = isSectionSelected(tutorial);
                              const isTutFull = !hasAvailableSeats(tutorial);
                              return (
                                <div key={tutorial.sectionId} className="space-y-1">
                                  <div
                                    className={cn(
                                      'flex items-center justify-between p-2 rounded-md border transition-all',
                                      isTutSelected
                                        ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-700'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                                    )}
                                  >
                                    <div className="flex-1 min-w-0 mr-2">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="font-semibold text-gray-900 dark:text-white text-xs">
                                          Tutorial {tutorial.sectionId}
                                        </span>
                                        {isTutSelected && tutorials.length > 1 && (
                                          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                            <RefreshCw className="w-2.5 h-2.5" />
                                            Swappable
                                          </span>
                                        )}
                                        {isTutFull && !isTutSelected && (
                                          <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                                            ⚠️ Full
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                        {tutorial.timeSlots.map((slot, idx) => (
                                          <div key={idx} className="truncate">
                                            {slot.day.slice(0, 3)} {slot.startTime}-{slot.endTime}
                                            {slot.location && ` @ ${slot.location}`}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-1 text-[10px]">
                                        {hasAvailableSeats(tutorial) ? (
                                          <span className="text-green-600 dark:text-green-400 font-medium">
                                            {tutorial.seatsRemaining}/{tutorial.quota} seats
                                          </span>
                                        ) : (
                                          <span className="text-red-600 dark:text-red-400 font-medium">
                                            Full ({tutorial.enrolled}/{tutorial.quota})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {isTutSelected ? (
                                      <button
                                        onClick={() => onRemoveSection(course, tutorial)}
                                        className="flex-shrink-0 p-1.5 rounded-md transition-all bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white hover:scale-110"
                                        title="Remove from schedule"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => onAddSection(course, tutorial)}
                                        className="flex-shrink-0 p-1.5 rounded-md transition-all bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white hover:scale-110"
                                        title={isTutFull ? 'Add to schedule (Full - may require waitlist/consent)' : 'Add to schedule'}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Warning for full tutorial */}
                                  {isTutFull && !isTutSelected && (
                                    <div className="px-2 py-1 bg-amber-50/50 dark:bg-amber-900/10 rounded text-[9px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                      <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                                      <span>Full section - may need waitlist/consent</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Labs */}
                      {labs.length > 0 && (
                        <div className="px-3 py-2 bg-gray-50/50 dark:bg-[#1e1e1e]/50 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            🧪 Choose ONE Lab:
                          </div>
                          <div className="space-y-1.5">
                            {labs.map((lab) => {
                              const isLabSelected = isSectionSelected(lab);
                              const isLabFull = !hasAvailableSeats(lab);
                              return (
                                <div key={lab.sectionId} className="space-y-1">
                                  <div
                                    className={cn(
                                      'flex items-center justify-between p-2 rounded-md border transition-all',
                                      isLabSelected
                                        ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-700'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                                    )}
                                  >
                                    <div className="flex-1 min-w-0 mr-2">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="font-semibold text-gray-900 dark:text-white text-xs">
                                          Lab {lab.sectionId}
                                        </span>
                                        {isLabSelected && labs.length > 1 && (
                                          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                            <RefreshCw className="w-2.5 h-2.5" />
                                            Swappable
                                          </span>
                                        )}
                                        {isLabFull && !isLabSelected && (
                                          <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                                            ⚠️ Full
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                        {lab.timeSlots.map((slot, idx) => (
                                          <div key={idx} className="truncate">
                                            {slot.day.slice(0, 3)} {slot.startTime}-{slot.endTime}
                                            {slot.location && ` @ ${slot.location}`}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-1 text-[10px]">
                                        {hasAvailableSeats(lab) ? (
                                          <span className="text-green-600 dark:text-green-400 font-medium">
                                            {lab.seatsRemaining}/{lab.quota} seats
                                          </span>
                                        ) : (
                                          <span className="text-red-600 dark:text-red-400 font-medium">
                                            Full ({lab.enrolled}/{lab.quota})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {isLabSelected ? (
                                      <button
                                        onClick={() => onRemoveSection(course, lab)}
                                        className="flex-shrink-0 p-1.5 rounded-md transition-all bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white hover:scale-110"
                                        title="Remove from schedule"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => onAddSection(course, lab)}
                                        className="flex-shrink-0 p-1.5 rounded-md transition-all bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white hover:scale-110"
                                        title={isLabFull ? 'Add to schedule (Full - may require waitlist/consent)' : 'Add to schedule'}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Warning for full lab */}
                                  {isLabFull && !isLabSelected && (
                                    <div className="px-2 py-1 bg-amber-50/50 dark:bg-amber-900/10 rounded text-[9px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                      <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                                      <span>Full section - may need waitlist/consent</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Flat view for simple courses
          <div className="space-y-1.5">
            {course.sections.map((section) => {
              const isSelected = isSectionSelected(section);
              
              // Check if this course has both lectures and tutorials (but no parentLecture links)
              const hasLectures = course.sections.some(s => s.sectionType === 'Lecture');
              const hasTutorials = course.sections.some(s => s.sectionType === 'Tutorial');
              const hasBothLecAndTut = hasLectures && hasTutorials;
              
              // For tutorials in courses with lectures, only allow one tutorial at a time
              let isDisabled = false;
              let selectedTutorialForThisCourse = null;
              
              if (section.sectionType === 'Tutorial' && hasBothLecAndTut) {
                selectedTutorialForThisCourse = selectedCourses.find(sc => 
                  sc.course.courseCode === course.courseCode && 
                  sc.selectedSection.sectionType === 'Tutorial'
                )?.selectedSection;
                isDisabled = !!(selectedTutorialForThisCourse && 
                               selectedTutorialForThisCourse.sectionId !== section.sectionId);
              }
              
              // For pure tutorial courses (no lectures), block other tutorials
              if (section.sectionType === 'Tutorial' && !hasLectures) {
                selectedTutorialForThisCourse = selectedCourses.find(sc => 
                  sc.course.courseCode === course.courseCode && 
                  sc.selectedSection.sectionType === 'Tutorial'
                )?.selectedSection;
                isDisabled = !!(selectedTutorialForThisCourse && 
                               selectedTutorialForThisCourse.sectionId !== section.sectionId);
              }
              const isFull = !hasAvailableSeats(section);
              
              return (
                <div key={section.sectionId} className="space-y-1">
                  <div
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md border transition-all',
                      isSelected
                        ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-200 dark:ring-purple-700'
                        : isDisabled
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed'
                        : hasAvailableSeats(section)
                        ? 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1e1e1e] opacity-60'
                    )}
                  >
                    <SectionButton
                      section={section}
                      course={course}
                      isSectionSelected={isSelected}
                      onAddSection={onAddSection}
                      onRemoveSection={onRemoveSection}
                    />

                    {isSelected ? (
                      <button
                        onClick={() => onRemoveSection(course, section)}
                        className="flex-shrink-0 p-1.5 rounded-md transition-all bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white hover:scale-110"
                        title="Remove from schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onAddSection(course, section)}
                        disabled={isDisabled}
                        className={cn(
                          'flex-shrink-0 p-1.5 rounded-md transition-all',
                          isDisabled
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white hover:scale-110'
                        )}
                        title={
                          isDisabled 
                            ? 'Another tutorial already selected' 
                            : isFull
                            ? 'Add to schedule (Full - may require waitlist/consent)'
                            : 'Add to schedule'
                        }
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Show info when disabled */}
                  {isDisabled && (
                    <div className="px-2 py-1 bg-gray-50/50 dark:bg-gray-800/50 rounded text-[9px] text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Info className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>Remove {selectedTutorialForThisCourse?.sectionId} first to select this tutorial</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

interface CourseListProps {
  courses: Course[];
  onAddSection: (course: Course, section: Section) => void;
  onRemoveSection: (course: Course, section: Section) => void;
  selectedCourses: SelectedCourse[];
  mode?: 'manual' | 'auto-generate';
  selectedCourseCodes?: string[];
  onToggleCourseSelection?: (courseCode: string) => void;
}

export function CourseList({ 
  courses, 
  onAddSection, 
  onRemoveSection, 
  selectedCourses,
  mode = 'manual',
  selectedCourseCodes = [],
  onToggleCourseSelection
}: CourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg mb-2">No courses found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <CourseListItem
          key={course.courseCode}
          course={course}
          onAddSection={onAddSection}
          onRemoveSection={onRemoveSection}
          selectedCourses={selectedCourses}
          mode={mode}
          isSelected={selectedCourseCodes.includes(course.courseCode)}
          onToggleSelection={onToggleCourseSelection}
        />
      ))}
    </div>
  );
}
