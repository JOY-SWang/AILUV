import type { DialogueItem, FullDialogueStepConfig, StepConfig } from "../types";

export const routes = [
  { key: "home", label: "Home" },
  { key: "full-dialogue", label: "Dialogue" },
  { key: "phrase-drill", label: "Sentence" },
  { key: "library", label: "Library" },
] as const;

export const dialogueData: DialogueItem[] = [
  { question: "What's your name?", answer: "Jenny" },
  { question: "Do you want a drink?", answer: "I want water" },
];

export const stepPlan: StepConfig[] = [
  { name: "Listening", task: "Listen to demonstration", volume: 100, needsSpeech: false },
  { name: "Unison 1", task: "Sing along", volume: 100, needsSpeech: true },
  { name: "Unison 2", task: "Sing along with weak cue", volume: 50, needsSpeech: true },
  { name: "Repetition", task: "Repeat independently", volume: 0, needsSpeech: true },
  { name: "Q&A 1", task: "Answer with strong cue", volume: 100, needsSpeech: true },
  { name: "Q&A 2", task: "Answer with weak cue", volume: 50, needsSpeech: true },
  { name: "Independent", task: "Answer independently", volume: 0, needsSpeech: true },
];

export const fullDialogueSteps: FullDialogueStepConfig[] = [
  { stepNumber: 1, stage: "Listening", task: "Listen to demonstration", volume: 100, needsSpeech: false, promptSource: "answer" },
  { stepNumber: 2, stage: "Listening", task: "Listen to demonstration", volume: 100, needsSpeech: false, promptSource: "answer" },
  { stepNumber: 3, stage: "Unison 1", task: "Sing along with full cue", volume: 100, needsSpeech: true, promptSource: "answer" },
  { stepNumber: 4, stage: "Unison 1", task: "Sing along with full cue", volume: 100, needsSpeech: true, promptSource: "answer" },
  { stepNumber: 5, stage: "Unison 2", task: "Sing along with weak cue", volume: 50, needsSpeech: true, promptSource: "answer" },
  { stepNumber: 6, stage: "Unison 2", task: "Sing along with weak cue", volume: 50, needsSpeech: true, promptSource: "answer" },
  { stepNumber: 7, stage: "Repetition", task: "Repeat independently", volume: 0, needsSpeech: true, promptSource: "answer" },
  { stepNumber: 8, stage: "Repetition", task: "Repeat independently", volume: 0, needsSpeech: true, promptSource: "answer" },
  { stepNumber: 9, stage: "Q&A 1", task: "Listen to question and answer with strong cue", volume: 100, needsSpeech: true, promptSource: "question" },
  { stepNumber: 10, stage: "Q&A 1", task: "Listen to question and answer with strong cue", volume: 100, needsSpeech: true, promptSource: "question" },
  { stepNumber: 11, stage: "Q&A 2", task: "Listen to question and answer with weak cue", volume: 50, needsSpeech: true, promptSource: "question" },
  { stepNumber: 12, stage: "Q&A 2", task: "Listen to question and answer with weak cue", volume: 50, needsSpeech: true, promptSource: "question" },
  { stepNumber: 13, stage: "Independent", task: "Listen to question and answer independently", volume: 0, needsSpeech: true, promptSource: "question" },
  { stepNumber: 14, stage: "Independent", task: "Listen to question and answer independently", volume: 0, needsSpeech: true, promptSource: "question" },
];

export const synonymDict: Record<string, string[]> = {
  drink: ["beverage", "water", "juice"],
  name: ["title", "identity", "nickname"],
  happy: ["glad", "cheerful", "joyful"],
  help: ["assist", "support", "aid"],
};
