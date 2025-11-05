import { generateSchedules, calculateScheduleMetrics, ScheduleGenerationOptions, ScheduleMetrics } from '@/lib/schedule-generator';
import { SelectedCourse } from '@/types';
import { testCourses } from '@/data/test-courses';

type PreferenceKey = NonNullable<ScheduleGenerationOptions['preference']>;

type SectionRef = {
  courseCode: string;
  sectionId: string;
};

const heavyCourseSet = testCourses.filter(course =>
  ['ECON 102', 'STAT 305', 'CPSC 221'].includes(course.courseCode)
);

const competitorSelections: Record<PreferenceKey, SectionRef[]> = {
  shortBreaks: [
    { courseCode: 'ECON 102', sectionId: '010' },
    { courseCode: 'ECON 102', sectionId: 'L18' },
    { courseCode: 'STAT 305', sectionId: '202' },
    { courseCode: 'STAT 305', sectionId: 'L2B' },
    { courseCode: 'CPSC 221', sectionId: '203' },
    { courseCode: 'CPSC 221', sectionId: 'L2S' },
  ],
  daysOff: [
    { courseCode: 'ECON 102', sectionId: '004' },
    { courseCode: 'ECON 102', sectionId: 'L4G' },
    { courseCode: 'STAT 305', sectionId: '202' },
    { courseCode: 'STAT 305', sectionId: 'L2E' },
    { courseCode: 'CPSC 221', sectionId: '203' },
    { courseCode: 'CPSC 221', sectionId: 'L2K' },
  ],
  longBreaks: [
    { courseCode: 'ECON 102', sectionId: '004' },
    { courseCode: 'ECON 102', sectionId: 'L4G' },
    { courseCode: 'STAT 305', sectionId: '202' },
    { courseCode: 'STAT 305', sectionId: 'L2A' },
    { courseCode: 'CPSC 221', sectionId: '203' },
    { courseCode: 'CPSC 221', sectionId: 'L2K' },
  ],
  consistentStart: [
    { courseCode: 'ECON 102', sectionId: '004' },
    { courseCode: 'ECON 102', sectionId: 'L4G' },
    { courseCode: 'STAT 305', sectionId: '202' },
    { courseCode: 'STAT 305', sectionId: 'L2A' },
    { courseCode: 'CPSC 221', sectionId: '203' },
    { courseCode: 'CPSC 221', sectionId: 'L2K' },
  ],
  startLate: [
    { courseCode: 'ECON 102', sectionId: '004' },
    { courseCode: 'ECON 102', sectionId: 'L4B' },
    { courseCode: 'STAT 305', sectionId: '202' },
    { courseCode: 'STAT 305', sectionId: 'L2A' },
    { courseCode: 'CPSC 221', sectionId: '201' },
    { courseCode: 'CPSC 221', sectionId: 'L2K' },
  ],
  endEarly: [
    { courseCode: 'ECON 102', sectionId: '010' },
    { courseCode: 'ECON 102', sectionId: 'L4C' },
    { courseCode: 'STAT 305', sectionId: '202' },
    { courseCode: 'STAT 305', sectionId: 'L2E' },
    { courseCode: 'CPSC 221', sectionId: '201' },
    { courseCode: 'CPSC 221', sectionId: 'L2C' },
  ],
};

function buildSchedule(sectionRefs: SectionRef[]): SelectedCourse[] {
  return sectionRefs.map(ref => {
    const course = heavyCourseSet.find(c => c.courseCode === ref.courseCode);
    if (!course) {
      throw new Error(`Course ${ref.courseCode} not found in heavyCourseSet`);
    }

    const section = course.sections.find(s => s.sectionId === ref.sectionId);
    if (!section) {
      throw new Error(`Section ${ref.courseCode} ${ref.sectionId} not found`);
    }

    return {
      course,
      selectedSection: section,
    };
  });
}

const comparisons: Array<{
  preference: PreferenceKey;
  ours: MetricsSnapshot;
  competitor: MetricsSnapshot;
  ourSections: string[];
  competitorSections: string[];
}> = [];

function formatMetrics(metrics: ScheduleMetrics) {
  return {
    freeDays: metrics.freeDays,
    daysUsed: metrics.daysUsed,
    earliestStart: metrics.earliestStart,
    latestEnd: metrics.latestEnd,
    avgStart: Number(metrics.avgStartTime.toFixed(1)),
    avgEnd: Number(metrics.avgEndTime.toFixed(1)),
    maxGap: metrics.maxGapMinutes,
    totalGap: metrics.totalGapMinutes,
    longBreakCount: metrics.longBreakCount,
    longBreakMinutes: metrics.totalLongBreakMinutes,
  };
}

type MetricsSnapshot = ReturnType<typeof formatMetrics>;

function listSections(schedule: SelectedCourse[]): string[] {
  return schedule.map(sel => `${sel.course.courseCode}-${sel.selectedSection.sectionId}`);
}

describe('Competitor parity diagnostics', () => {
  const preferences = Object.keys(competitorSelections) as PreferenceKey[];

  it.each(preferences)(
    '%s metrics snapshot',
    (preference) => {
      const competitorSchedule = buildSchedule(competitorSelections[preference]);
      const competitorMetrics = calculateScheduleMetrics(competitorSchedule);

      const ours = generateSchedules(heavyCourseSet, { preference, maxResults: 1 });
      expect(ours.length).toBeGreaterThan(0);
      const ourTop = ours[0];
      const ourMetrics = calculateScheduleMetrics(ourTop.sections);

      const ourSectionList = listSections(ourTop.sections);
      const competitorSectionList = listSections(competitorSchedule);

      console.log(`\n📊 ${preference} comparison`);
      console.log('   • ours       ', ourSectionList);
      console.log('   • competitor', competitorSectionList);
      console.table({ ours: formatMetrics(ourMetrics), competitor: formatMetrics(competitorMetrics) });

      comparisons.push({
        preference,
        ours: formatMetrics(ourMetrics),
        competitor: formatMetrics(competitorMetrics),
        ourSections: ourSectionList,
        competitorSections: competitorSectionList,
      });

      // Diagnostic assertion: verify metric objects were computed
      expect(competitorMetrics.daysUsed).toBeGreaterThan(0);
    }
  );

  afterAll(() => {
    console.log('\n================ METRIC SNAPSHOT SUMMARY ================');
    console.table(
      comparisons.map(entry => ({
        preference: entry.preference,
        freeDays_ours: entry.ours.freeDays,
        freeDays_comp: entry.competitor.freeDays,
        latestEnd_ours: entry.ours.latestEnd,
        latestEnd_comp: entry.competitor.latestEnd,
        maxGap_ours: entry.ours.maxGap,
        maxGap_comp: entry.competitor.maxGap,
        avgStart_ours: entry.ours.avgStart,
        avgStart_comp: entry.competitor.avgStart,
      }))
    );
    comparisons.forEach(entry => {
      console.log(`• ${entry.preference} sections`);
      console.log('    ours       ', entry.ourSections.join(', '));
      console.log('    competitor', entry.competitorSections.join(', '));
    });
  });
});
