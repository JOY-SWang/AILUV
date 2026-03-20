export type AppRoute = "home" | "full-dialogue" | "phrase-drill" | "library" | "settings";
export type Mode = "patient" | "caregiver";

export type DialogueItem = {
  question: string;
  answer: string;
};

export type StepConfig = {
  name: string;
  task: string;
  volume: number;
  needsSpeech: boolean;
};

export type FullDialogueStepConfig = {
  stepNumber: number;
  stage: string;
  task: string;
  volume: number;
  needsSpeech: boolean;
  promptSource: "answer" | "question";
};

export type TrainingSlice = {
  stepIndex: number;
  attemptCount: number;
  consecutiveSuccessCount: number;
  failStreak: number;
  feedbackMessage: string;
  localScore: number | null;
  keywordHits: string[];
  isRecording: boolean;
  isPlayingDemo: boolean;
  caregiverDecision: "Good" | "Bad" | null;
};

export type FullDialogueState = TrainingSlice & {
  phraseIndex: number;
  playbackBeatIndex: number;
};

export type PhraseDrillState = TrainingSlice & {
  phrase: string;
  masteryPercent: number;
  playbackBeatIndex: number;
  drillAudioVariant: "hum" | "target";
  caregiverAdvanceCount: number;
  caregiverGoodCountAfterTarget: number;
};

export type UserProfile = {
  name: string;
  age: number;
  pitch: string;
};
