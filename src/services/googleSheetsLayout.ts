import type { SessionData } from '../lib/sessionStorage';
import { ARCHETYPES, calculateArchetype } from '../lib/gamificationUtils';

export const SUMMARY_TAB = 'Overzicht';
export const SESSIONS_TAB = 'Sessies';
export const GUIDE_TAB = 'Uitleg';

const SUMMARY_SHEET_ID = 1001;
const GUIDE_SHEET_ID = 1002;

const EMPTY = '–';
const STATUS_DONE = 'Afgerond';
const STATUS_NOT_DONE = 'Niet afgerond';
const REVIEW_NONE = 'Geen feedback';
const REVIEW_OK = 'In orde';
const REVIEW_CENSORED = 'Gecensureerd';

const AGE_GROUPS = ['12-13', '14-15', '16-18'];

// Labels as visitors see them in GenreSelectionScreen; the ids don't always match ('romance' is shown as 'Mindfuck').
const GENRE_LABELS: Record<string, string> = {
  comedy: 'Komedie',
  sport: 'Sport',
  thriller: 'Thriller',
  adventure: 'Avontuur',
  romance: 'Mindfuck',
  scifi: 'Sci-Fi',
};

// Same order and wording as QUESTIONS in QuestionFlowScreen.
const STATEMENTS = [
  { id: 'duration', short: 'Liever een lange film', text: 'Ik kijk liever een lange film dan een korte film.' },
  { id: 'immersion', short: 'Pauze is prettig', text: 'Een pauze tijdens een film vind ik prettig.' },
  { id: 'social', short: 'Extra activiteiten zijn leuk', text: 'Ik vind een filmavond leuker als er extra activiteiten zijn.' },
  { id: 'breaks', short: 'Bekend verhaal is belangrijk', text: 'Ik vind het belangrijk dat een film gebaseerd is op een bekend verhaal of franchise.' },
];

const SESSION_COLUMNS = [
  { header: 'Datum en tijd', width: 130, meaning: 'Wanneer de bezoeker voor het laatst iets heeft ingevuld.', values: 'Bijvoorbeeld 01-11-2026 14:30' },
  { header: 'Leeftijd', width: 80, meaning: 'De leeftijdsgroep die de bezoeker heeft gekozen.', values: AGE_GROUPS.join(', ') },
  { header: 'Genre', width: 100, meaning: 'Het filmgenre dat de bezoeker heeft gekozen.', values: Object.values(GENRE_LABELS).join(', ') },
  { header: 'Filmprofiel', width: 150, meaning: 'Het type filmkijker dat uit de antwoorden volgt.', values: ARCHETYPES.map((a) => a.title).join(', ') },
  ...STATEMENTS.map((statement) => ({
    header: statement.short,
    width: 105,
    meaning: `Stelling: "${statement.text}"`,
    values: '0 (helemaal niet mee eens) tot 100 (helemaal mee eens)',
  })),
  { header: 'Status', width: 110, meaning: 'Of de bezoeker de hele ervaring heeft doorlopen.', values: `${STATUS_DONE} of ${STATUS_NOT_DONE}` },
  { header: 'Feedback', width: 340, meaning: 'De feedback van de bezoeker, netjes herschreven en gefilterd door AI.', values: 'Vrije tekst' },
  { header: 'Originele feedback', width: 340, meaning: 'Precies wat de bezoeker zei of typte. Dit is niet gefilterd en kan ongepaste taal bevatten.', values: 'Vrije tekst' },
  { header: 'Taal', width: 100, meaning: 'De taal van de feedback.', values: 'Bijvoorbeeld Nederlands' },
  { header: 'Controle feedback', width: 120, meaning: 'De uitkomst van de automatische controle op ongepaste taal.', values: `${REVIEW_NONE}, ${REVIEW_OK} of ${REVIEW_CENSORED}` },
  { header: 'Sessie-ID', width: 170, meaning: 'Technische code van deze sessie. Niet te herleiden tot een persoon.', values: 'Bijvoorbeeld session_ab12cd34e' },
];

// Column positions in the Sessies tab.
const COL_DATE = 0;
const COL_FIRST_SCORE = 4;
const COL_STATUS = 8;
const COL_FEEDBACK = 9;
const COL_ORIGINAL = 10;
const COL_REVIEW = 12;

const NAVY = { red: 0.11, green: 0.16, blue: 0.27 };
const WHITE = { red: 1, green: 1, blue: 1 };
const GREY_TEXT = { red: 0.45, green: 0.45, blue: 0.45 };
const LIGHT_BLUE = { red: 0.91, green: 0.94, blue: 0.98 };
const LINE = { red: 0.87, green: 0.87, blue: 0.87 };
const GREEN = { red: 0.2, green: 0.6, blue: 0.4 };
const GREEN_BG = { red: 0.85, green: 0.94, blue: 0.87 };
const AMBER_BG = { red: 1, green: 0.95, blue: 0.8 };
const RED_BG = { red: 0.98, green: 0.84, blue: 0.84 };

const toSheetDate = (timestamp: number): number => {
  const offsetMs = new Date(timestamp).getTimezoneOffset() * 60_000;
  return (timestamp - offsetMs) / 86_400_000 + 25_569;
};

const genreLabels = (session: SessionData): string =>
  session.genres?.map((id) => GENRE_LABELS[id] ?? id).join(', ') || EMPTY;

const hasAnswers = (session: SessionData): boolean => Object.keys(session.answers ?? {}).length > 0;

// The profile is only saved on the final screen, so it is recalculated for visitors who stopped earlier.
const profileTitle = (session: SessionData): string => {
  if (session.archetypeTitle) return session.archetypeTitle;
  if (!hasAnswers(session)) return EMPTY;
  return calculateArchetype(session.genres ?? [], session.answers ?? {}).title;
};

const statusOf = (session: SessionData): string => (session.thanked ? STATUS_DONE : STATUS_NOT_DONE);

const reviewOf = (session: SessionData): string => {
  if (!session.voice_feedback && !session.voice_feedback_original) return REVIEW_NONE;
  return session.voice_feedback_moderation_toxic ? REVIEW_CENSORED : REVIEW_OK;
};

export const buildSessionRows = (sessions: SessionData[]): (string | number)[][] =>
  sessions.map((session) => [
    session.timestamp ? toSheetDate(session.timestamp) : EMPTY,
    session.ageGroup || EMPTY,
    genreLabels(session),
    profileTitle(session),
    ...STATEMENTS.map((statement) => session.answers?.[statement.id] ?? EMPTY),
    statusOf(session),
    session.voice_feedback || EMPTY,
    session.voice_feedback_original || EMPTY,
    session.voice_feedback_language || EMPTY,
    reviewOf(session),
    session.sessionId || EMPTY,
  ]);

const bar = (share: number): string => '█'.repeat(Math.round(share * 20));

export const buildSummaryRows = (sessions: SessionData[], updatedAt: string): (string | number)[][] => {
  const total = sessions.length;
  const countRow = (label: string, count: number) => {
    const share = total > 0 ? count / total : 0;
    return [label, count, share, bar(share)];
  };
  const countWhere = (test: (session: SessionData) => boolean) => sessions.filter(test).length;

  return [
    ['Filmvibe: overzicht', '', '', ''],
    [`Laatst bijgewerkt: ${updatedAt}. Alle cijfers worden automatisch berekend.`, '', '', ''],
    ['', '', '', ''],
    ['In het kort', 'Aantal', 'Aandeel', 'Verdeling'],
    ['Bezoekers', total, '', ''],
    countRow('Hele ervaring afgerond', countWhere((s) => s.thanked === true)),
    countRow('Feedback gegeven', countWhere((s) => reviewOf(s) !== REVIEW_NONE)),
    countRow('Feedback gecensureerd', countWhere((s) => reviewOf(s) === REVIEW_CENSORED)),
    ['', '', '', ''],
    ['Leeftijd', 'Aantal', 'Aandeel', 'Verdeling'],
    ...AGE_GROUPS.map((age) => countRow(`${age} jaar`, countWhere((s) => s.ageGroup === age))),
    ['', '', '', ''],
    ['Genre', 'Aantal', 'Aandeel', 'Verdeling'],
    ...Object.entries(GENRE_LABELS).map(([id, label]) => countRow(label, countWhere((s) => s.genres?.includes(id) === true))),
    ['', '', '', ''],
    ['Filmprofiel', 'Aantal', 'Aandeel', 'Verdeling'],
    ...ARCHETYPES.map((archetype) => countRow(archetype.title, countWhere((s) => profileTitle(s) === archetype.title))),
    ['', '', '', ''],
    ['Stelling (0 = oneens, 100 = eens)', 'Gemiddelde', '', 'Verdeling'],
    ...STATEMENTS.map((statement) => {
      const scores = sessions.map((s) => s.answers?.[statement.id]).filter((score): score is number => score !== undefined);
      if (scores.length === 0) return [statement.short, EMPTY, '', ''];
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return [statement.short, Math.round(average), '', bar(average / 100)];
    }),
  ];
};

const textCell = (text: string, format?: object) => ({
  userEnteredValue: { stringValue: text },
  ...(format ? { userEnteredFormat: format } : {}),
});

const gridRange = (sheetId: number, startRow: number, endRow: number | undefined, startCol: number, endCol: number) => ({
  sheetId,
  startRowIndex: startRow,
  ...(endRow === undefined ? {} : { endRowIndex: endRow }),
  startColumnIndex: startCol,
  endColumnIndex: endCol,
});

const repeatFormat = (range: object, format: object, fields: string) => ({
  repeatCell: { range, cell: { userEnteredFormat: format }, fields: `userEnteredFormat(${fields})` },
});

const columnWidth = (sheetId: number, column: number, pixelSize: number) => ({
  updateDimensionProperties: {
    range: { sheetId, dimension: 'COLUMNS', startIndex: column, endIndex: column + 1 },
    properties: { pixelSize },
    fields: 'pixelSize',
  },
});

const textHighlight = (sheetId: number, column: number, text: string, backgroundColor: object) => ({
  addConditionalFormatRule: {
    index: 0,
    rule: {
      ranges: [gridRange(sheetId, 1, undefined, column, column + 1)],
      booleanRule: {
        condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: text }] },
        format: { backgroundColor },
      },
    },
  },
});

const sessionsTabRequests = (sheetId: number): object[] => {
  const columnCount = SESSION_COLUMNS.length;
  const headerFormat = {
    backgroundColor: NAVY,
    textFormat: { foregroundColor: WHITE, bold: true },
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE',
    wrapStrategy: 'WRAP',
  };

  return [
    {
      updateSheetProperties: {
        properties: { sheetId, title: SESSIONS_TAB, gridProperties: { frozenRowCount: 1 } },
        fields: 'title,gridProperties.frozenRowCount',
      },
    },
    {
      updateCells: {
        range: gridRange(sheetId, 0, 1, 0, columnCount),
        rows: [{
          values: SESSION_COLUMNS.map((column) => ({
            ...textCell(column.header, headerFormat),
            note: `${column.meaning}\nMogelijke waarden: ${column.values}`,
          })),
        }],
        fields: 'userEnteredValue,userEnteredFormat,note',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 62 },
        fields: 'pixelSize',
      },
    },
    ...SESSION_COLUMNS.map((column, index) => columnWidth(sheetId, index, column.width)),
    repeatFormat(gridRange(sheetId, 1, undefined, 0, columnCount), { verticalAlignment: 'TOP' }, 'verticalAlignment'),
    repeatFormat(
      gridRange(sheetId, 1, undefined, COL_DATE, COL_DATE + 1),
      { numberFormat: { type: 'DATE_TIME', pattern: 'dd-mm-yyyy hh:mm' }, horizontalAlignment: 'LEFT' },
      'numberFormat,horizontalAlignment'
    ),
    repeatFormat(
      gridRange(sheetId, 1, undefined, COL_FIRST_SCORE, COL_FIRST_SCORE + STATEMENTS.length),
      { horizontalAlignment: 'CENTER' },
      'horizontalAlignment'
    ),
    repeatFormat(gridRange(sheetId, 1, undefined, COL_FEEDBACK, COL_ORIGINAL + 1), { wrapStrategy: 'WRAP' }, 'wrapStrategy'),
    {
      updateBorders: {
        range: gridRange(sheetId, 1, undefined, 0, columnCount),
        innerHorizontal: { style: 'SOLID', color: LINE },
      },
    },
    { setBasicFilter: { filter: { range: gridRange(sheetId, 0, undefined, 0, columnCount) } } },
    {
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [gridRange(sheetId, 1, undefined, COL_FIRST_SCORE, COL_FIRST_SCORE + STATEMENTS.length)],
          gradientRule: {
            minpoint: { type: 'NUMBER', value: '0', color: WHITE },
            maxpoint: { type: 'NUMBER', value: '100', color: GREEN },
          },
        },
      },
    },
    textHighlight(sheetId, COL_STATUS, STATUS_DONE, GREEN_BG),
    textHighlight(sheetId, COL_STATUS, STATUS_NOT_DONE, AMBER_BG),
    textHighlight(sheetId, COL_REVIEW, REVIEW_OK, GREEN_BG),
    textHighlight(sheetId, COL_REVIEW, REVIEW_CENSORED, RED_BG),
  ];
};

const summaryTabRequests = (): object[] => {
  const sheetId = SUMMARY_SHEET_ID;
  const sectionRows = buildSummaryRows([], '')
    .map((row, index) => (row[3] === 'Verdeling' ? index : -1))
    .filter((index) => index >= 0);

  return [
    {
      addSheet: {
        properties: { sheetId, title: SUMMARY_TAB, index: 0, gridProperties: { hideGridlines: true } },
      },
    },
    columnWidth(sheetId, 0, 290),
    columnWidth(sheetId, 1, 95),
    columnWidth(sheetId, 2, 80),
    columnWidth(sheetId, 3, 210),
    repeatFormat(gridRange(sheetId, 0, 1, 0, 1), { textFormat: { bold: true, fontSize: 18, foregroundColor: NAVY } }, 'textFormat'),
    repeatFormat(gridRange(sheetId, 1, 2, 0, 1), { textFormat: { italic: true, foregroundColor: GREY_TEXT } }, 'textFormat'),
    repeatFormat(gridRange(sheetId, 3, undefined, 1, 2), { horizontalAlignment: 'CENTER' }, 'horizontalAlignment'),
    repeatFormat(
      gridRange(sheetId, 3, undefined, 2, 3),
      { numberFormat: { type: 'PERCENT', pattern: '0%' }, horizontalAlignment: 'CENTER' },
      'numberFormat,horizontalAlignment'
    ),
    repeatFormat(gridRange(sheetId, 3, undefined, 3, 4), { textFormat: { foregroundColor: GREEN } }, 'textFormat'),
    ...sectionRows.map((row) =>
      repeatFormat(
        gridRange(sheetId, row, row + 1, 0, 4),
        { backgroundColor: NAVY, textFormat: { bold: true, foregroundColor: WHITE } },
        'backgroundColor,textFormat'
      )
    ),
  ];
};

const guideTabRequests = (): object[] => {
  const sheetId = GUIDE_SHEET_ID;
  const title = { textFormat: { bold: true, fontSize: 18, foregroundColor: NAVY } };
  const heading = { backgroundColor: LIGHT_BLUE, textFormat: { bold: true, foregroundColor: NAVY } };
  const tableHeader = { backgroundColor: NAVY, textFormat: { bold: true, foregroundColor: WHITE } };
  const row = (cells: string[], format?: object) => ({
    values: [0, 1, 2].map((index) => textCell(cells[index] ?? '', format)),
  });

  const rows = [
    row(['Uitleg bij dit bestand'], title),
    row(['']),
    row(['Waar gaat dit over?'], heading),
    row(['Wat', 'Betekenis', ''], tableHeader),
    row(['Dit bestand', 'De antwoorden van jongeren van 12 t/m 18 jaar op de Filmvibe-ervaring.']),
    row(['Eén bezoeker', 'Elke regel op het tabblad Sessies is één bezoeker. De nieuwste bezoeker staat bovenaan.']),
    row(['']),
    row(['De tabbladen'], heading),
    row(['Tabblad', 'Waarvoor gebruik je het?', ''], tableHeader),
    row([SUMMARY_TAB, 'Begin hier: de belangrijkste cijfers in één oogopslag.']),
    row([SESSIONS_TAB, 'Alle antwoorden per bezoeker. Filter met de pijltjes in de kolomtitels.']),
    row([GUIDE_TAB, 'Deze pagina.']),
    row(['']),
    row(['Goed om te weten'], heading),
    row(['Onderwerp', 'Uitleg', ''], tableHeader),
    row([EMPTY, 'Een streepje betekent dat dit niet is ingevuld.']),
    row(['Scores', '0 betekent helemaal niet mee eens, 100 helemaal mee eens. Hoe groener de cel, hoe hoger de score.']),
    row(['Niets aanpassen', `De app overschrijft ${SUMMARY_TAB} en ${SESSIONS_TAB} bij elke update, dus eigen wijzigingen daar verdwijnen. Maak voor eigen berekeningen een nieuw tabblad.`]),
    row(['Originele feedback', 'Deze kolom is niet gefilterd en kan ongepaste taal bevatten. De bezoekers zijn minderjarig, dus deel deze kolom alleen met wie hem nodig heeft.']),
    row(['']),
    row([`De kolommen op het tabblad ${SESSIONS_TAB}`], heading),
    row(['Kolom', 'Betekenis', 'Mogelijke waarden'], tableHeader),
    ...SESSION_COLUMNS.map((column) => row([column.header, column.meaning, column.values])),
  ];

  return [
    {
      addSheet: {
        properties: { sheetId, title: GUIDE_TAB, index: 2, gridProperties: { hideGridlines: true } },
      },
    },
    {
      updateCells: {
        range: gridRange(sheetId, 0, rows.length, 0, 3),
        rows,
        fields: 'userEnteredValue,userEnteredFormat',
      },
    },
    columnWidth(sheetId, 0, 210),
    columnWidth(sheetId, 1, 520),
    columnWidth(sheetId, 2, 360),
    repeatFormat(gridRange(sheetId, 3, rows.length, 0, 3), { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' }, 'wrapStrategy,verticalAlignment'),
  ];
};

export const buildLayoutRequests = (dataSheetId: number): object[] => [
  ...summaryTabRequests(),
  ...sessionsTabRequests(dataSheetId),
  ...guideTabRequests(),
];
