'use client';

import { useState } from 'react';
import { Course, Section, SelectedCourse } from '@/types';
import { mockCourses } from '@/data/mock-courses';
import { TimetableGrid } from '@/components/TimetableGrid';
import { CourseList } from '@/components/CourseList';
import { SearchBar, FilterBar, FilterButton } from '@/components/SearchBar';
import { BuildingReference } from '@/components/BuildingReference';
import { BuildingModal } from '@/components/BuildingModal';
import { CourseDetailsModal } from '@/components/CourseDetailsModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateCourseColor, calculateTotalCredits, detectConflicts, hasAvailableSeats, detectNewCourseConflicts } from '@/lib/schedule-utils';
import { DISCLAIMER } from '@/lib/constants';
import { Calendar, Book, AlertCircle, Trash2, X } from 'lucide-react';
import ConflictToast from '@/components/ConflictToast';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [fullSectionWarning, setFullSectionWarning] = useState<{ course: Course; section: Section } | null>(null);
  const [isWarningExiting, setIsWarningExiting] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<SelectedCourse | null>(null);
  const [conflictToast, setConflictToast] = useState<Array<{ course1: string; course2: string }>>([]);
  const [conflictingCourses, setConflictingCourses] = useState<string[]>([]);

  // Filter courses based on search and filters
  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = 
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.sections.some(s => 
        s.instructor?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesDepartment = !selectedDepartment || course.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Get unique departments
  const departments = Array.from(new Set(mockCourses.map(c => c.department)));

  // Add a course section to schedule
  const handleAddSection = (course: Course, section: Section) => {
    // Show warning if section is full
    if (!hasAvailableSeats(section)) {
      setFullSectionWarning({ course, section });
      setIsWarningExiting(false);
      // Auto-proceed after showing warning
      setTimeout(() => {
        setIsWarningExiting(true);
        setTimeout(() => setFullSectionWarning(null), 300);
      }, 6000);
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

      if (existingLectureIndex !== -1) {
        // Replace the existing lecture with the new one
        const updatedCourses = [...selectedCourses];
        updatedCourses[existingLectureIndex] = {
          course,
          selectedSection: section,
          color: updatedCourses[existingLectureIndex].color, // Keep the same color
        };

        // Also remove any tutorials associated with the old lecture
        const oldLectureId = selectedCourses[existingLectureIndex].selectedSection.sectionId;
        const filteredCourses = updatedCourses.filter(
          (sc) => !(sc.course.courseCode === course.courseCode && 
                    sc.selectedSection.sectionType === 'Tutorial' && 
                    sc.selectedSection.parentLecture === oldLectureId)
        );

        setSelectedCourses(filteredCourses);
        return;
      }
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
  const handleRemoveCourse = (index: number) => {
    const updatedCourses = selectedCourses.filter((_, i) => i !== index);
    setSelectedCourses(updatedCourses);
    
    // Recalculate conflicts after removal
    const allConflicts = detectConflicts(updatedCourses);
    const conflictingCodes = new Set<string>();
    allConflicts.forEach(conflict => {
      conflictingCodes.add(conflict.course1.course.courseCode);
      conflictingCodes.add(conflict.course2.course.courseCode);
    });
    setConflictingCourses(Array.from(conflictingCodes));
  };

  // Remove section from course list
  const handleRemoveSection = (course: Course, section: Section) => {
    const updatedCourses = selectedCourses.filter(
      (sc) => !(sc.course.courseCode === course.courseCode && sc.selectedSection.sectionId === section.sectionId)
    );
    setSelectedCourses(updatedCourses);
    
    // Recalculate conflicts after removal
    const allConflicts = detectConflicts(updatedCourses);
    const conflictingCodes = new Set<string>();
    allConflicts.forEach(conflict => {
      conflictingCodes.add(conflict.course1.course.courseCode);
      conflictingCodes.add(conflict.course2.course.courseCode);
    });
    setConflictingCourses(Array.from(conflictingCodes));
  };

  // Handle closing warning with animation
  const handleCloseWarning = () => {
    setIsWarningExiting(true);
    setTimeout(() => {
      setFullSectionWarning(null);
      setIsWarningExiting(false);
    }, 300);
  };

  // Clear all courses
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const handleClearSchedule = () => {
    setShowClearConfirm(true);
  };

  const confirmClearSchedule = () => {
    setSelectedCourses([]);
    setShowClearConfirm(false);
  };

  // Calculate stats
  const totalCredits = calculateTotalCredits(selectedCourses);
  const conflicts = detectConflicts(selectedCourses);

  return (
    <div className="h-screen flex flex-col relative">
      {/* Dark mode background overlay - ensures solid black */}
      <div className="fixed inset-0 bg-[#1e1e1e] -z-10 dark:block hidden" />
      
      {/* Header - Ultra compact */}
      <header className="bg-white/80 dark:bg-[#252526]/70 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-700/30 sticky top-0 z-50 flex-shrink-0">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-2">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <div className="flex items-center gap-2">
              <div className="bg-purple-600 dark:bg-purple-500 text-white p-1.5 rounded-lg shadow-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                  CUHK Course Scheduler
                </h1>
              </div>
            </div>

            {/* Stats and Theme Toggle - Compact */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <ThemeToggle />
              <div className="text-center">
                <div className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 dark:text-purple-400">{selectedCourses.length}</div>
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

      <main className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-2 lg:py-3 bg-transparent overflow-hidden flex flex-col">
        {/* Warnings container - only takes space when needed */}
        <div className="max-w-[1600px] w-full mx-auto space-y-2 mb-2 flex-shrink-0">
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
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 max-w-[1700px] w-full mx-auto flex-1 min-h-0 lg:ml-0 lg:mr-auto lg:pl-6">
          {/* Left sidebar - Course search - Flexible width */}
          <div className="w-full lg:w-[320px] lg:min-w-[300px] lg:max-w-[340px] flex flex-col gap-3 min-h-0 flex-shrink-0">
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
                    {departments.map((dept) => (
                      <FilterButton
                        key={dept}
                        active={selectedDepartment === dept}
                        onClick={() => setSelectedDepartment(dept)}
                      >
                        {dept.split(' ')[0]}
                      </FilterButton>
                    ))}
                  </div>
                </div>
              </FilterBar>
            </div>

            {/* Course list - Scrollable - Takes remaining space */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent min-h-0">
              <CourseList
                courses={filteredCourses}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                selectedCourses={selectedCourses}
              />
            </div>
          </div>

          {/* Right side - Timetable - Takes remaining space */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
            {/* My Schedule header with inline course badges */}
            <div className="bg-white/70 dark:bg-[#252526]/70 backdrop-blur-xl rounded-xl shadow-lg px-4 py-3 border border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">My Schedule</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">2025-26 Term 1</p>
                </div>
                {selectedCourses.length > 0 && (
                  <button
                    onClick={handleClearSchedule}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Selected Courses - Inline compact badges */}
              {selectedCourses.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Selected ({selectedCourses.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCourses.map((sc, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-xs"
                        style={{ 
                          backgroundColor: `${sc.color}15`,
                          borderColor: `${sc.color}40`
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: sc.color }}
                        />
                        <span className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {sc.course.courseCode}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:inline">
                          {sc.selectedSection.sectionType} {sc.selectedSection.sectionId}
                        </span>
                        <button
                          onClick={() => handleRemoveCourse(idx)}
                          className="ml-1 p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-60 group-hover:opacity-100"
                          title="Remove course"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timetable - Scrollable area */}
            <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent min-h-0">
              {selectedCourses.length > 0 ? (
                <TimetableGrid
                  selectedCourses={selectedCourses}
                  onCourseClick={(course) => setSelectedCourseDetails(course)}
                  onRemoveCourse={(course) => {
                    const index = selectedCourses.indexOf(course);
                    handleRemoveCourse(index);
                  }}
                  onLocationClick={(location) => setSelectedLocation(location)}
                  conflictingCourses={conflictingCourses}
                />
              ) : (
                <div className="bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-xl rounded-xl shadow-lg p-8 lg:p-12 text-center border border-gray-200/30 dark:border-gray-700/30">
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

      {/* Building Reference floating button */}
      <BuildingReference onBuildingClick={setSelectedLocation} />

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

      {/* Full Section Warning Toast */}
      {fullSectionWarning && (
        <div className={`fixed top-20 right-4 z-50 ${isWarningExiting ? 'animate-slideOutToTop' : 'animate-slideInFromTop'}`}>
          <div className="bg-amber-50/95 dark:bg-amber-900/95 backdrop-blur-xl border-2 border-amber-400 dark:border-amber-600 rounded-xl shadow-2xl overflow-hidden max-w-md">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-500 dark:bg-amber-600 text-white p-2 rounded-full flex-shrink-0 shadow-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1 text-base">
                    Section Full - Added to Schedule
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    <span className="font-semibold">{fullSectionWarning.course.courseCode}</span> - {fullSectionWarning.section.sectionType} {fullSectionWarning.section.sectionId} has no available seats.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    ⚠️ You may need to join a waitlist or obtain instructor consent to enroll.
                  </p>
                </div>
                <button
                  onClick={handleCloseWarning}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 rounded p-1 transition-all flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-amber-200/50 dark:bg-amber-950/50">
              <div 
                className="h-full bg-amber-500 dark:bg-amber-400 animate-shrink"
                style={{ animationDuration: '6000ms' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Building Location Modal - Single instance for entire page */}
      {selectedLocation && (
        <BuildingModal
          location={selectedLocation}
          isOpen={true}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {/* Course Details Modal */}
      <CourseDetailsModal
        selectedCourse={selectedCourseDetails}
        onClose={() => setSelectedCourseDetails(null)}
        onLocationClick={(location) => setSelectedLocation(location)}
      />

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
