// Hebrew UI strings + screen-reader announcements. RTL is enforced at the
// container level (dir="rtl") so every string here is authored naturally.

export const HE = {
  // Trigger + panel chrome
  triggerLabel: "תפריט נגישות",
  panelTitle: "התאמות נגישות",
  close: "סגירה",
  reset: "איפוס הגדרות",
  skipToContent: "דלג לתוכן המרכזי",

  // Groups
  groupContrast: "ניגודיות וצבעים",
  groupTypography: "טקסט וקריאוּת",
  groupNavigation: "ניווט והדגשה",
  groupContent: "תוכן והסחות דעת",
  groupPointer: "סמן ועזרי קריאה",

  // Controls
  contrastInvert: "היפוך צבעים",
  contrastHigh: "ניגודיות גבוהה",
  contrastLow: "ניגודיות נמוכה",
  contrastMono: "גווני אפור",
  fontIncrease: "הגדלת טקסט",
  fontDecrease: "הקטנת טקסט",
  lineSpacing: "ריווח שורות",
  readableFont: "גופן קריא",
  highlightLinks: "הדגשת קישורים",
  highlightHeaders: "הדגשת כותרות",
  stopAnimations: "עצירת אנימציות",
  curtain: "מסך קריאה (הסתרת הסחות)",
  bigCursor: "סמן עכבר גדול",
  readingGuide: "קו עזר לקריאה",

  // SR announcements (aria-live)
  on: "מופעל",
  off: "כבוי",
  resetDone: "כל ההגדרות אופסו",
  fontNow: (pct: number) => `גודל הטקסט: ${pct} אחוז`,
} as const;

export type Strings = typeof HE;
