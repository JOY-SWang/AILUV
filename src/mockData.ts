export type MockStage = {
  number: 1 | 2 | 3 | 4 | 5;
  key:
    | "HUM_AND_TAP"
    | "UNISON"
    | "UNISON_FADE"
    | "PATIENT_REPETITION"
    | "QUESTION_ELICITATION";
  title: string;
  demoInstruction: string;
  practiceInstruction: string;
  cue: "humming" | "sentence" | "question" | "none";
  countdownSeconds: 0 | 3;
  pauseResumeAllowed: boolean;
  patientStopAllowed: boolean;
  tappingInputEnabled: boolean;
  autoStopMs: number;
};

export const MOCK_SESSION_CODE = "0730";

export const MOCK_SESSION = {
  patientName: "M1.3 Checkpoint Patient",
  planDate: "2026-07-30",
  planDateLabel: "July 30, 2026",
  protocolVersion: "mit-v1",
  estimatedMinutes: 6,
  task: {
    ordinal: 1,
    name: "Checkpoint 2026-07-30",
    targetSentence: "I want water",
    questionText: "What do you want?",
    syllables: [
      { ordinal: 1, word: "I", syllable: "I", stressed: false },
      { ordinal: 2, word: "want", syllable: "want", stressed: true },
      { ordinal: 3, word: "water", syllable: "wa", stressed: false },
      { ordinal: 4, word: "water", syllable: "ter", stressed: true },
    ],
  },
} as const;

export const MOCK_STAGES: readonly MockStage[] = [
  {
    number: 1,
    key: "HUM_AND_TAP",
    title: "Hum and Tap",
    demoInstruction: "Listen first",
    practiceInstruction: "Hum with me",
    cue: "humming",
    countdownSeconds: 0,
    pauseResumeAllowed: true,
    patientStopAllowed: false,
    tappingInputEnabled: true,
    autoStopMs: 4_000,
  },
  {
    number: 2,
    key: "UNISON",
    title: "Together",
    demoInstruction: "Listen first",
    practiceInstruction: "Sing with me",
    cue: "sentence",
    countdownSeconds: 0,
    pauseResumeAllowed: true,
    patientStopAllowed: false,
    tappingInputEnabled: false,
    autoStopMs: 4_000,
  },
  {
    number: 3,
    key: "UNISON_FADE",
    title: "Fade Out",
    demoInstruction: "Listen first",
    practiceInstruction: "Sing with me",
    cue: "sentence",
    countdownSeconds: 0,
    pauseResumeAllowed: true,
    patientStopAllowed: false,
    tappingInputEnabled: false,
    autoStopMs: 4_000,
  },
  {
    number: 4,
    key: "PATIENT_REPETITION",
    title: "Your Turn Alone",
    demoInstruction: "Listen first",
    practiceInstruction: "Your Turn Alone",
    cue: "none",
    countdownSeconds: 3,
    pauseResumeAllowed: false,
    patientStopAllowed: true,
    tappingInputEnabled: false,
    autoStopMs: 10_000,
  },
  {
    number: 5,
    key: "QUESTION_ELICITATION",
    title: "Answer the Question",
    demoInstruction: "Answer the Question",
    practiceInstruction: "Answer",
    cue: "question",
    countdownSeconds: 3,
    pauseResumeAllowed: false,
    patientStopAllowed: true,
    tappingInputEnabled: false,
    autoStopMs: 10_000,
  },
] as const;

export function mockStage(stageNo: number): MockStage {
  const fallback = MOCK_STAGES[0];
  if (!fallback) {
    throw new Error("The mock protocol has no stages.");
  }
  return MOCK_STAGES.find((stage) => stage.number === stageNo) ?? fallback;
}
