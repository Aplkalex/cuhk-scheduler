'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Course, Section, SelectedCourse, TermType, SchedulePreferences, DayOfWeek } from '@/types';
import { mockCourses } from '@/data/mock-courses';
import { testCourses } from '@/data/test-courses';
import TimetableGrid from '@/components/TimetableGrid';
import { CourseList } from '@/components/CourseList';
import { SearchBar, FilterBar, FilterButton } from '@/components/SearchBar';
import { BuildingReference } from '@/components/BuildingReference';
import BuildingModal from '@/components/BuildingModal';
import { CourseDetailsModal } from '@/components/CourseDetailsModal';
import { SectionSwapModal } from '@/components/SectionSwapModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateCourseColor, calculateTotalCredits, detectConflicts, hasAvailableSeats, detectNewCourseConflicts } from '@/lib/schedule-utils';
import { generateSchedules, type GeneratedSchedule } from '@/lib/schedule-generator';
import { DISCLAIMER } from '@/lib/constants';
import { Calendar, Book, AlertCircle, Trash2, X, Hand, Sparkles, ChevronDown, ChevronUp, ChevronRight, Clock, Coffee, Check, FlaskConical } from 'lucide-react';
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
  const [swapModalCourse, setSwapModalCourse] = useState<SelectedCourse | null>(null);
  const [conflictToast, setConflictToast] = useState<Array<{ course1: string; course2: string }>>([]);
  const [conflictingCourses, setConflictingCourses] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<TermType>('2025-26-T1');
  const [swapWarning, setSwapWarning] = useState<string | null>(null);
  const [isSwapWarningExiting, setIsSwapWarningExiting] = useState(false);
  
  // Schedule mode: 'manual' or 'auto-generate'
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'auto-generate'>('auto-generate');
  
  // Collapsible My Schedule state
  const [isScheduleCollapsed, setIsScheduleCollapsed] = useState(false);
  const [expandedScheduleCourse, setExpandedScheduleCourse] = useState<number | null>(null);

  // For auto-generate mode: just track which courses (not sections) are selected
  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>([]);

  // Schedule generation preferences (for auto-generate mode)
  const [preferences, setPreferences] = useState<SchedulePreferences>({
    earliestStartTime: '08:00',
    latestEndTime: '18:00',
    preferredFreeDays: [],
    minGapMinutes: 0,
    maxGapMinutes: 120,
  });
  
  // Simple preference - only one can be selected at a time
  const [selectedPreference, setSelectedPreference] = useState<'shortBreaks' | 'longBreaks' | 'consistentStart' | 'startLate' | 'endEarly' | 'daysOff' | null>(null);
  const [preferredDaysOff, setPreferredDaysOff] = useState<DayOfWeek[]>([]);
  const [excludeFullSections, setExcludeFullSections] = useState(false);

  // Generated schedules state
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<number>(0);

  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false);

  // Sync selectedCourseCodes with selectedCourses (for manual mode)
  // This keeps the preferences bar in sync when switching modes
  useEffect(() => {
    const courseCodes = Array.from(new Set(
      selectedCourses.map(sc => sc.course.courseCode)
    ));
    setSelectedCourseCodes(courseCodes);
  }, [selectedCourses]);

  // Term display names
  const termNames: Record<TermType, string> = {
    '2025-26-T1': '2025-26 Term 1',
    '2025-26-T2': '2025-26 Term 2',
    '2025-26-Summer': '2025-26 Summer'
  };

  // Choose courses based on test mode
  const activeCourses = isTestMode ? testCourses : mockCourses;

  // Filter courses based on search, department, and selected term
  const filteredCourses = activeCourses.filter((course) => {
    const matchesSearch = 
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.sections.some(s => 
        s.instructor?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesDepartment = !selectedDepartment || course.department === selectedDepartment;
    
    const matchesTerm = course.term === selectedTerm;

    return matchesSearch && matchesDepartment && matchesTerm;
  });

  // Get unique departments
  const departments = Array.from(new Set(activeCourses.map(c => c.department)));

  // Memoize available courses for TimetableGrid to prevent re-renders
  const availableCourses = useMemo(() => 
    mockCourses.filter(c => c.term === selectedTerm), 
    [selectedTerm]
  );

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
  const handleRemoveCourse = useCallback((index: number) => {
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
  }, [selectedCourses]);

  // Swap lecture section and automatically assign tutorial
  const handleSwapLectureSection = useCallback((courseCode: string, currentLectureId: string, newLectureId: string) => {
    // Find the course data
    const courseData = mockCourses.find(c => c.courseCode === courseCode && c.term === selectedTerm);
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

      // Recalculate conflicts after swap
      const allConflicts = detectConflicts(updated);
      const conflictingCodes = new Set<string>();
      allConflicts.forEach(conflict => {
        conflictingCodes.add(conflict.course1.course.courseCode);
        conflictingCodes.add(conflict.course2.course.courseCode);
      });
      setConflictingCourses(Array.from(conflictingCodes));

      return updated;
    });
  }, [selectedTerm]);

  // Swap tutorial sections (only within same lecture)
  const handleSwapTutorialSection = useCallback((courseCode: string, fromTutorialId: string, toTutorialId: string) => {
    // Find the course data
    const courseData = mockCourses.find(c => c.courseCode === courseCode && c.term === selectedTerm);
    if (!courseData) return;

    // Find the target tutorial section
    const newTutorial = courseData.sections.find(s => s.sectionId === toTutorialId && s.sectionType === 'Tutorial');
    if (!newTutorial) return;

    // Update selected courses
    setSelectedCourses(prev => {
      const updated = prev.map(selectedCourse => {
        if (selectedCourse.course.courseCode === courseCode &&
            selectedCourse.selectedSection.sectionType === 'Tutorial' &&
            selectedCourse.selectedSection.sectionId === fromTutorialId) {
          return {
            ...selectedCourse,
            selectedSection: newTutorial,
          };
        }
        return selectedCourse;
      });

      // Recalculate conflicts after swap
      const allConflicts = detectConflicts(updated);
      const conflictingCodes = new Set<string>();
      allConflicts.forEach(conflict => {
        conflictingCodes.add(conflict.course1.course.courseCode);
        conflictingCodes.add(conflict.course2.course.courseCode);
      });
      setConflictingCourses(Array.from(conflictingCodes));

      return updated;
    });
  }, [selectedTerm]);

  // Remove section from course list
  const handleRemoveSection = useCallback((course: Course, section: Section) => {
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
  }, [selectedCourses]);

  // Handle closing warning with animation
  const handleCloseWarning = useCallback(() => {
    setIsWarningExiting(true);
    setTimeout(() => {
      setFullSectionWarning(null);
      setIsWarningExiting(false);
    }, 300);
  }, []);

  // Handle swap warnings
  const handleSwapWarning = useCallback((message: string, type: 'full' | 'conflict') => {
    setSwapWarning(message);
    setIsSwapWarningExiting(false);
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setIsSwapWarningExiting(true);
      setTimeout(() => setSwapWarning(null), 300);
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
      setConflictingCourses([]);
      setSelectedTerm(pendingTerm);
      setShowTermChangeConfirm(false);
      setPendingTerm(null);
    }
  };

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
  const assignColorsToSchedule = (sections: SelectedCourse[]): SelectedCourse[] => {
    const colorMap = new Map<string, string>();
    const usedColors: string[] = [];
    
    return sections.map(sc => {
      const courseCode = sc.course.courseCode;
      
      // Get or generate color for this course
      if (!colorMap.has(courseCode)) {
        const color = generateCourseColor(courseCode, usedColors);
        colorMap.set(courseCode, color);
        usedColors.push(color);
      }
      
      return {
        ...sc,
        color: colorMap.get(courseCode)!
      };
    });
  };

  const handleGenerateSchedules = async () => {
    // In auto-generate mode, use selectedCourseCodes
    // In manual mode, use selectedCourses
    const coursesToGenerate = scheduleMode === 'auto-generate'
      ? activeCourses.filter(c => selectedCourseCodes.includes(c.courseCode) && c.term === selectedTerm)
      : Array.from(
          new Map(selectedCourses.map(sc => [sc.course.courseCode, sc.course])).values()
        );

    if (coursesToGenerate.length === 0) return;

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
        const schedulesWithColors = assignColorsToSchedule(schedules[0].sections);
        setSelectedCourses(schedulesWithColors);
      } else {
        alert('No valid schedules found! Try selecting different courses or changing your preference.');
      }

      console.log(`✨ Generated ${schedules.length} valid schedules`);
    } catch (error) {
      console.error('Error generating schedules:', error);
      alert('Error generating schedules. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle drag and drop - move a course section to a new day
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
              
              {/* Test Mode Toggle */}
              <button
                onClick={() => {
                  const newTestMode = !isTestMode;
                  setIsTestMode(newTestMode);
                  // Switch to T2 when entering test mode (test courses are in T2)
                  if (newTestMode) {
                    setSelectedTerm('2025-26-T2');
                  } else {
                    setSelectedTerm('2025-26-T1');
                  }
                  // Clear selections when switching modes
                  setSelectedCourses([]);
                  setSelectedCourseCodes([]);
                  setGeneratedSchedules([]);
                  setSelectedScheduleIndex(0);
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
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
          {/* Test Mode Banner */}
          {isTestMode && (
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
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 w-full flex-1 min-h-0">
          {/* Left sidebar - Fixed width with Course search and My Schedule */}
          <div className="w-full lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px] flex flex-col min-h-0 flex-shrink-0">
            {/* Scrollable sidebar content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1 scrollbar-thin scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent min-h-0">
              {/* Mode Toggle */}
              <div className="bg-white/70 dark:bg-[#252526]/70 backdrop-blur-xl rounded-xl shadow-lg p-2 border border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1e1e1e]/50 rounded-lg">
                <button
                  onClick={() => {
                    setScheduleMode('auto-generate');
                    setGeneratedSchedules([]);
                    // Sync selectedCourseCodes from selectedCourses when switching to auto-generate
                    const courseCodes = Array.from(new Set(
                      selectedCourses.map(sc => sc.course.courseCode)
                    ));
                    setSelectedCourseCodes(courseCodes);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    scheduleMode === 'auto-generate'
                      ? 'bg-white dark:bg-[#2d2d30] text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Auto-Generate
                </button>
                <button
                  onClick={() => {
                    setScheduleMode('manual');
                    setGeneratedSchedules([]);
                    setSelectedCourseCodes([]);
                  }}
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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">My Schedule</h2>
                    {/* Term Selector Dropdown */}
                    <select
                      value={selectedTerm}
                      onChange={(e) => handleTermChange(e.target.value as TermType)}
                      className="text-xs px-2 py-1 pr-6 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2d2d30] text-gray-700 dark:text-gray-200 hover:border-purple-400 dark:hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.25rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1em 1em'
                      }}
                    >
                      <option value="2025-26-T1">T1</option>
                      <option value="2025-26-T2">T2</option>
                      <option value="2025-26-Summer">Summer</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
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
                    {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} • {calculateTotalCredits(selectedCourses)} credits
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
                              onClick={() => handleRemoveCourse(idx)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all opacity-60 group-hover:opacity-100"
                              title="Remove course"
                            >
                              <X className="w-3.5 h-3.5" />
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
                                        <span className="text-purple-600 dark:text-purple-400 ml-1">
                                          📍 {slot.location}
                                        </span>
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
            <div className="space-y-3">
              <CourseList
                courses={filteredCourses}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                selectedCourses={selectedCourses}
                mode={scheduleMode}
                selectedCourseCodes={selectedCourseCodes}
                onToggleCourseSelection={handleToggleCourseSelection}
              />
            </div>
            </div>
          </div>

          {/* Right side - Preferences + Timetable */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 gap-3">
            {/* Compact Preferences Bar - Only in Auto-Generate mode when courses selected */}
            {scheduleMode === 'auto-generate' && selectedCourseCodes.length > 0 && (
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
                    {[
                      { id: 'shortBreaks', icon: '⚡', label: 'Short Breaks' },
                      { id: 'longBreaks', icon: '☕', label: 'Long Breaks' },
                      { id: 'consistentStart', icon: '🎯', label: 'Consistent' },
                      { id: 'startLate', icon: '🌅', label: 'Start Late' },
                      { id: 'endEarly', icon: '🌆', label: 'End Early' },
                      { id: 'daysOff', icon: '🗓️', label: 'Days Off' },
                    ].map(pref => (
                      <button
                        key={pref.id}
                        onClick={() => setSelectedPreference(selectedPreference === pref.id ? null : pref.id as any)}
                        className={`group relative px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                          selectedPreference === pref.id
                            ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-[#2d2d30] border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <span className="text-sm">{pref.icon}</span>
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
                    disabled={selectedCourseCodes.length === 0 || isGenerating}
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
            )}

            {/* Timetable - Scrollable area */}
            <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent min-h-0">
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

      {/* Term Change Confirmation Modal */}
      {showTermChangeConfirm && pendingTerm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all border border-gray-200/40 dark:border-gray-700/40 animate-slideIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 p-3 rounded-full">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Switch Term?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {termNames[selectedTerm]} → {termNames[pendingTerm]}
                </p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Switching terms will clear your current schedule with <span className="font-semibold text-gray-900 dark:text-white">{selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''}</span>.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You can switch back to {termNames[selectedTerm]} later to create a new schedule.
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

      {/* Swap Warning Toast */}
      {swapWarning && (
        <div className={`fixed top-36 right-4 z-50 ${isSwapWarningExiting ? 'animate-slideOutToTop' : 'animate-slideInFromTop'}`}>
          <div className="bg-amber-50/95 dark:bg-amber-900/95 backdrop-blur-xl border-2 border-amber-400 dark:border-amber-600 rounded-xl shadow-2xl overflow-hidden max-w-md">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-500 dark:bg-amber-600 text-white p-2 rounded-full flex-shrink-0 shadow-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1 text-base">
                    Section Swapped with Warning
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {swapWarning}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSwapWarningExiting(true);
                    setTimeout(() => setSwapWarning(null), 300);
                  }}
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
                style={{ animationDuration: '5000ms' }}
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
