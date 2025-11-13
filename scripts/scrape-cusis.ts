/**
 * CUHK CUSIS timetable scraper (Playwright + manual DUO).
 *
 * Usage:
 *   1. Install deps: npm install
 *   2. Install Playwright browser: npx playwright install chromium
 *   3. Run: npm run scrape:cusis
 *
 * The script will prompt for:
 *   - CUHK username/password (not stored)
 *   - Term id (e.g. 2025-26-T1)
 *   - Term label (display name)
 *   - Course subjects (comma separated, e.g. CSCI,MATH)
 *
 * It launches Chromium (non-headless) so you can approve DUO.
 * After scraping, it writes data/cusis-export-<term>-<timestamp>.json
 *
 * NOTE: Selectors for inputs/table may need adjustments because
 * the CUSIS markup can change. Update the SELECTORS constant below
 * if the script fails to find elements.
 */

import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, Page } from 'playwright';
import promptSync from 'prompt-sync';
import type { Course, Section, TimeSlot, TermType } from '@/types';

const prompt = promptSync({ sigint: true, autocomplete: undefined });

const CUSIS_LOGIN_URL =
  process.env.CUSIS_LOGIN_URL ??
  'https://cusis.cuhk.edu.hk/psp/CSPRD_4/EMPLOYEE/HRMS/?cmd=login';

const CUSIS_TIMETABLE_URL =
  process.env.CUSIS_TIMETABLE_URL ??
  'https://cusis.cuhk.edu.hk/psc/CSPRD_4/EMPLOYEE/HRMS/c/CU_SCR_MENU.CU_TMSR801.GBL?Page=CU_TMSR801_ENTRY&Action=U';

const SELECTORS = {
  username: 'input#userid',
  password: 'input#pwd',
  loginButton: 'button[type="submit"],input[name="Submit"]',
  subjectInput: 'input[id$="SUBJECT"]',
  subjectLookupButton: 'a[id$="SUBJECT$prompt"]',
  subjectLookupRows: 'table[id*="RESULT"] tr',
  subjectLookupNext: 'a[id*="next"]',
  searchButton: 'input[id$="SEARCH"]',
  resultsRows: 'table[id$="resultsTable"] tr',
};

const COMPONENT_MAP: Record<string, Section['sectionType']> = {
  LEC: 'Lecture',
  TUT: 'Tutorial',
  LAB: 'Lab',
  SEM: 'Seminar',
};

const LANGUAGE_MAP: Record<string, Section['language']> = {
  ENGLISH: 'English',
  CANTONESE: 'Cantonese',
  MANDARIN: 'Mandarin',
  BILINGUAL: 'Bilingual',
};

type RawRow = {
  classCode: string;
  classNbr: string;
  title: string;
  units: string;
  staff: string;
  quota: string;
  vacancy: string;
  component: string;
  sectionCode: string;
  language: string;
  period: string;
  room: string;
  meetingDates: string;
  addConsent: string;
  dropConsent: string;
  department: string;
};

const dayMap: Record<string, TimeSlot['day']> = {
  Mo: 'Monday',
  Tu: 'Tuesday',
  We: 'Wednesday',
  Th: 'Thursday',
  Fr: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

const to24Hour = (input: string) => {
  const match = input.trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
  if (!match) return null;
  let [hours, minutes, suffix] = [Number(match[1]), match[2] ?? '00', match[3].toUpperCase()];
  if (suffix === 'PM' && hours < 12) hours += 12;
  if (suffix === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const parsePeriod = (period: string, room: string): TimeSlot[] => {
  if (!period) return [];
  const slots = period
    .split(/\n|<br>|,/) // handle possible multi-line content
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/^([A-Za-z]{2})\s+([0-9:AMPamp]+)\s*-\s*([0-9:AMPamp]+)/);
      if (!match) return null;
      const [_, dayAbbr, start, end] = match;
      const day = dayMap[dayAbbr] ?? dayAbbr;
      const startTime = to24Hour(start);
      const endTime = to24Hour(end);
      if (!startTime || !endTime) return null;
      return {
        day,
        startTime,
        endTime,
        ...(room ? { location: room } : {}),
      } as TimeSlot;
    })
    .filter((slot): slot is TimeSlot => Boolean(slot));

  return slots;
};

const normalizeRows = (
  rows: RawRow[],
  subject: string,
  termId: TermType,
  termLabel: string
): Course[] => {
  const byCourse = new Map<string, Course>();

  rows.forEach((row) => {
    const courseCode = row.classCode || row.title.split(' ')[0];
    if (!courseCode) {
      return;
    }

    if (!byCourse.has(courseCode)) {
      byCourse.set(courseCode, {
        courseCode,
        courseName: row.title?.trim() || courseCode,
        department: row.department || subject,
        credits: Number(row.units) || 0,
        description: `Imported from CUSIS (${termLabel})`,
        enrollmentRequirements: undefined,
        prerequisites: [],
        sections: [],
        term: termId,
        career: 'Undergraduate',
        lastUpdated: new Date(),
      });
    }

    const course = byCourse.get(courseCode)!;
    const sectionType =
      COMPONENT_MAP[row.component?.trim()?.toUpperCase() ?? ''] ?? 'Lecture';
    const sectionId = row.sectionCode || sectionType;
    const quota = Number(row.quota) || 0;
    const enrolled = quota - (Number(row.vacancy) || 0);
    const timeSlots = parsePeriod(row.period, row.room);

    const instructorName = row.staff?.split(/\s*-\s*/).pop()?.trim();
    const normalizedLanguage =
      LANGUAGE_MAP[row.language?.trim().toUpperCase() ?? ''] ?? undefined;

    const section: Section = {
      sectionId,
      sectionType,
      instructor: instructorName ? { name: instructorName } : undefined,
      timeSlots,
      quota,
      enrolled,
      seatsRemaining: Number(row.vacancy) || 0,
      waitlist: undefined,
      language: normalizedLanguage,
      addConsent: row.addConsent?.toLowerCase().includes('yes') ?? undefined,
      dropConsent: row.dropConsent?.toLowerCase().includes('yes') ?? undefined,
      parentLecture: sectionType === 'Tutorial' || sectionType === 'Lab' ? undefined : undefined,
      classNumber: Number(row.classNbr) || undefined,
    };

    course.sections.push(section);
  });

  return Array.from(byCourse.values());
};

const scrapeRows = async (page: Page): Promise<RawRow[]> => {
  const rows = await page.$$eval(SELECTORS.resultsRows, (rowNodes) => {
    const data: RawRow[] = [];
    rowNodes.forEach((row, idx) => {
      if (idx === 0) return; // skip header
      const cells = Array.from(row.querySelectorAll('td')).map((cell) =>
        (cell.textContent ?? '').trim()
      );
      if (cells.length < 15) return;
      data.push({
        classCode: cells[0] ?? '',
        classNbr: cells[1] ?? '',
        title: cells[2] ?? '',
        units: cells[3] ?? '',
        staff: cells[4] ?? '',
        quota: cells[5] ?? '',
        vacancy: cells[6] ?? '',
        component: cells[7] ?? '',
        sectionCode: cells[8] ?? '',
        language: cells[9] ?? '',
        period: cells[10] ?? '',
        room: cells[11] ?? '',
        meetingDates: cells[12] ?? '',
        addConsent: cells[13] ?? '',
        dropConsent: cells[14] ?? '',
        department: cells[15] ?? '',
      });
    });
    return data;
  });

  return rows;
};

const autoDiscoverSubjects = async (page: Page): Promise<string[]> => {
  try {
    const lookupButton = page.locator(SELECTORS.subjectLookupButton);
    if ((await lookupButton.count()) === 0) {
      throw new Error('Lookup button not found');
    }

    const popupPromise = page.context().waitForEvent('page').catch(() => null);
    await lookupButton.first().click();
    const popup = await popupPromise;
    if (!popup) {
      throw new Error('Lookup popup not detected');
    }
    await popup.waitForLoadState('domcontentloaded');

    const subjects = new Set<string>();
    while (true) {
      const pageCodes = await popup.$$eval(
        SELECTORS.subjectLookupRows,
        (rows) => {
          const codes: string[] = [];
          rows.forEach((row, idx) => {
            if (idx === 0) return;
            const firstCell = row.querySelector('td');
            const code = firstCell?.textContent?.trim();
            if (code) codes.push(code.split(' ')[0]);
          });
          return codes;
        }
      );
      pageCodes.forEach((code) => subjects.add(code));

      const nextButton = popup.locator(SELECTORS.subjectLookupNext);
      if ((await nextButton.count()) === 0 || !(await nextButton.first().isEnabled())) {
        break;
      }

      await Promise.all([
        popup.waitForLoadState('load'),
        nextButton.first().click(),
      ]);
    }

    await popup.close();
    return Array.from(subjects).sort();
  } catch (error) {
    console.warn('⚠️ Failed to auto-discover subjects:', error);
    return [];
  }
};

const gentlyPokeLookup = async (page: Page) => {
  const lookupButton = page.locator(SELECTORS.subjectLookupButton);
  if ((await lookupButton.count()) === 0) {
    return;
  }

  try {
    const popupPromise = page.context()
      .waitForEvent('page', { timeout: 15000 })
      .catch(() => null);

    await lookupButton.first().click({ timeout: 15000 }).catch(() => {});
    const popup = await popupPromise;
    if (popup) {
      await popup.close().catch(() => {});
      console.log('✅ Timetable form activated.');
    }
  } catch {
    console.warn('⚠️ Unable to activate timetable form automatically (lookup popup not available).');
  }
};

async function loginToCusis(page: Page, username: string, password: string) {
  await page.goto(CUSIS_LOGIN_URL, { waitUntil: 'networkidle' });
  await page.fill(SELECTORS.username, username);
  await page.fill(SELECTORS.password, password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(SELECTORS.loginButton),
  ]);

  console.log('Waiting for DUO approval... complete it in the browser.');
  prompt('Press Enter here once DUO approval is done and the page has loaded...');
}

const runSubjectSearch = async (page: Page, subject: string) => {
  await page.waitForSelector(SELECTORS.subjectInput, { timeout: 120_000 });
  await page.fill(SELECTORS.subjectInput, subject);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(SELECTORS.searchButton),
  ]);
};

const askYes = (question: string, defaultYes = true) => {
  const answer = (prompt(question) || '').trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer.startsWith('y');
};

async function manualLogin(page: Page) {
  await page.goto(CUSIS_LOGIN_URL, { waitUntil: 'networkidle' });
  console.log('\nPlease complete CUHK login + DUO approval in the browser window.');
  prompt('Press Enter here once you are logged in.');
  console.log('Navigate manually to Manage Classes → Teaching Timetable.');
  prompt('Press Enter again once the Teaching Timetable search form is visible...');
  await gentlyPokeLookup(page);
}

async function main() {
  const autoFillCreds = askYes('Auto-fill CUHK username/password? (Y/n): ', true);
  let username = '';
  let password = '';
  if (autoFillCreds) {
    username =
      process.env.CUSIS_USERNAME ||
      prompt('CUHK Username: ').trim();
    password =
      process.env.CUSIS_PASSWORD ||
      prompt.hide('CUHK Password: ');
    if (!username || !password) {
      console.error('Username and password are required for auto-fill mode.');
      process.exit(1);
    }
  }

  const termId = (prompt('Term ID (e.g., 2025-26-T1): ') || '2025-26-T1').trim() as TermType;
  const termLabel =
    prompt('Term label (display name) [optional]: ') ||
    termId.replace(/-/g, ' ');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    if (autoFillCreds) {
      await loginToCusis(page, username, password);
      console.log('Navigate manually to Manage Classes → Teaching Timetable.');
      prompt('Press Enter once the Teaching Timetable search form is visible...');
      await gentlyPokeLookup(page);
    } else {
      await manualLogin(page);
    }

    let subjects: string[] = [];
    const autoDiscover =
      (prompt('Auto-discover subjects from lookup? (y/N): ') || '')
        .trim()
        .toLowerCase()
        .startsWith('y');

    if (autoDiscover) {
      console.log('Discovering subjects via lookup popup...');
      subjects = await autoDiscoverSubjects(page);
      if (subjects.length === 0) {
        console.warn('Subject lookup failed; falling back to manual input.');
      } else {
        console.log(`Found ${subjects.length} subjects.`);
      }
    }

    if (subjects.length === 0) {
      const subjectInput =
        prompt('Course subjects (comma separated, e.g., CSCI,MATH): ') || 'CSCI';
      subjects = subjectInput
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    }

    if (!subjects.length) {
      console.error('At least one subject is required.');
      process.exit(1);
    }

    const allCourses: Course[] = [];
    for (const subject of subjects) {
      console.log(`Scraping subject ${subject}...`);
      await runSubjectSearch(page, subject);
      const rows = await scrapeRows(page);
      console.log(`  Found ${rows.length} rows for ${subject}`);
      allCourses.push(...normalizeRows(rows, subject, termId, termLabel));
    }

    await browser.close();

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');
    const outputDir = path.resolve(process.cwd(), 'data');
    await mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `cusis-export-${termId}-${timestamp}.json`);
    await writeFile(outputPath, JSON.stringify(allCourses, null, 2), 'utf-8');
    console.log(`✅ Saved ${allCourses.length} courses to ${outputPath}`);
    console.log('You can now import this file via prisma/seed or a custom importer.');
  } catch (error) {
    console.error('❌ Scraper failed:', error);
    await browser.close();
    process.exit(1);
  }
}

main();
