import { useEffect, useMemo, useRef, useState } from "react";
import { dialogueData, fullDialogueSteps, stepPlan, synonymDict } from "../data/training";
import type { AppRoute, FullDialogueState, Mode, PhraseDrillState, TrainingSlice, UserProfile } from "../types";

const defaultTrainingSlice: TrainingSlice = {
  stepIndex: 0,
  attemptCount: 0,
  consecutiveSuccessCount: 0,
  failStreak: 0,
  feedbackMessage: "Ready to start training.",
  localScore: null,
  keywordHits: [],
  isRecording: false,
  isPlayingDemo: false,
  caregiverDecision: null,
};

function evaluateAttempt(targetText: string): { score: number; hits: string[] } {
  const keywords = targetText.toLowerCase().split(" ").filter((w) => w.length > 1);
  const hitCount = Math.max(1, Math.floor(Math.random() * (keywords.length + 1)));
  const score = hitCount >= keywords.length ? 2 : hitCount >= 1 ? 1 : 0;
  return { score, hits: keywords.slice(0, hitCount) };
}

function feedbackFromScore(score: number): string {
  if (score === 2) return "Great!";
  if (score === 1) return "Good, keep going";
  return "Let's try again";
}

function getDrillAudioSrc(phrase: string, variant: "hum" | "target"): string {
  if (variant === "hum") return "/audio/hum4.mp3";

  const normalized = phrase.toLowerCase().replace(/\s+/g, "");
  if (normalized === "jenny") return "/audio/Jenny.mp3";
  if (normalized.includes("iwantwater") || normalized.includes("wa-ter")) return "/audio/iwantWater.mp3";
  return "/audio/hum4.mp3";
}

function getAnswerAudioSrc(answer: string): string {
  const normalized = answer.toLowerCase().replace(/\s+/g, "");
  if (normalized === "jenny") return "/audio/Jenny.mp3";
  if (normalized.includes("iwantwater")) return "/audio/iwantWater.mp3";
  return "/audio/hum4.mp3";
}

function getQuestionAudioSrc(question: string): string {
  const normalized = question.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("whatsyourname")) return "/audio/whatsurName.mp3";
  if (normalized.includes("doyouwantadrink")) return "/audio/doyouwannaDrink.mp3";
  return "/audio/hum2.mp3";
}

export function splitToSyllables(text: string): string[] {
  return text
    .split(" ")
    .flatMap((word) => {
      if (word.length <= 3) return [word];
      if (word.includes("'")) return word.split("'");
      const cut = Math.ceil(word.length / 2);
      return [word.slice(0, cut), word.slice(cut)];
    })
    .filter(Boolean);
}

export function useTrainingStore() {
  const [mode, setMode] = useState<Mode>("patient");
  const [route, setRoute] = useState<AppRoute>("home");
  const [fullDialogue, setFullDialogue] = useState<FullDialogueState>({
    ...defaultTrainingSlice,
    phraseIndex: 0,
    playbackBeatIndex: 0,
  });
  const [phraseDrill, setPhraseDrill] = useState<PhraseDrillState>({
    ...defaultTrainingSlice,
    phrase: "I want water",
    masteryPercent: 0,
    playbackBeatIndex: 0,
    feedbackMessage: "Start speaking to see feedback.",
    drillAudioVariant: "hum",
    caregiverAdvanceCount: 0,
    caregiverGoodCountAfterTarget: 0,
  });
  const [libraryTerm, setLibraryTerm] = useState("");
  const [profile, setProfile] = useState<UserProfile>({
    name: "Ms. Zhang",
    age: 68,
    pitch: "B3",
  });
  const drillAudioRef = useRef<HTMLAudioElement | null>(null);
  const drillBeatTimerRef = useRef<number | null>(null);
  const fullAudioRef = useRef<HTMLAudioElement | null>(null);
  const fullBeatTimerRef = useRef<number | null>(null);
  const drillRecordTimerRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const patientRecordingUrlRef = useRef<string | null>(null);

  const currentPhrase = dialogueData[fullDialogue.phraseIndex];
  const libraryResults = useMemo(() => synonymDict[libraryTerm.toLowerCase()] || [], [libraryTerm]);

  const applyAttempt = (slice: TrainingSlice, score: number, hits: string[]): TrainingSlice => {
    const next: TrainingSlice = {
      ...slice,
      attemptCount: slice.attemptCount + 1,
      localScore: score,
      keywordHits: hits,
      feedbackMessage: feedbackFromScore(score),
    };

    if (score >= 1) {
      next.consecutiveSuccessCount += 1;
      next.failStreak = 0;
    } else {
      next.consecutiveSuccessCount = 0;
      next.failStreak += 1;
    }

    if (next.failStreak > 3) {
      next.feedbackMessage = "You are doing great";
    }

    return next;
  };

  const maybeAdvanceStep = (slice: TrainingSlice): TrainingSlice => {
    if (slice.consecutiveSuccessCount >= 2) {
      return {
        ...slice,
        stepIndex: slice.stepIndex + 1,
        attemptCount: 0,
        consecutiveSuccessCount: 0,
        failStreak: 0,
      };
    }
    return slice;
  };

  const stopDrillPlayback = (): void => {
    if (drillBeatTimerRef.current !== null) {
      window.clearInterval(drillBeatTimerRef.current);
      drillBeatTimerRef.current = null;
    }
    if (drillAudioRef.current) {
      drillAudioRef.current.pause();
      drillAudioRef.current.currentTime = 0;
      drillAudioRef.current = null;
    }
    setPhraseDrill((prev) => ({
      ...prev,
      isPlayingDemo: false,
      playbackBeatIndex: 0,
    }));
  };

  const stopFullPlayback = (): void => {
    if (fullBeatTimerRef.current !== null) {
      window.clearInterval(fullBeatTimerRef.current);
      fullBeatTimerRef.current = null;
    }
    if (fullAudioRef.current) {
      fullAudioRef.current.pause();
      fullAudioRef.current.currentTime = 0;
      fullAudioRef.current = null;
    }
    setFullDialogue((prev) => ({
      ...prev,
      isPlayingDemo: false,
      playbackBeatIndex: 0,
    }));
  };

  const listen = (): void => {
    if (route === "phrase-drill") {
      stopDrillPlayback();

      const src = getDrillAudioSrc(phraseDrill.phrase, phraseDrill.drillAudioVariant);
      const audio = new Audio(src);
      drillAudioRef.current = audio;

      setPhraseDrill((prev) => ({
        ...prev,
        isPlayingDemo: true,
        isRecording: false,
        feedbackMessage: "Playing demonstration...",
        playbackBeatIndex: 0,
      }));

      drillBeatTimerRef.current = window.setInterval(() => {
        setPhraseDrill((prev) => ({
          ...prev,
          playbackBeatIndex: (prev.playbackBeatIndex + 1) % 4,
        }));
      }, 450);

      const finalize = () => {
        if (drillBeatTimerRef.current !== null) {
          window.clearInterval(drillBeatTimerRef.current);
          drillBeatTimerRef.current = null;
        }
        setPhraseDrill((prev) => ({
          ...prev,
          isPlayingDemo: false,
          playbackBeatIndex: 0,
        }));
      };

      audio.onended = finalize;
      audio.onerror = finalize;
      audio.play().catch(() => {
        finalize();
        setPhraseDrill((prev) => ({
          ...prev,
          feedbackMessage: "Audio unavailable. Please try again.",
        }));
      });
      return;
    }

    stopFullPlayback();

    const currentStep = fullDialogueSteps[fullDialogue.stepIndex] || fullDialogueSteps[0];
    const currentDialogue = dialogueData[fullDialogue.phraseIndex];
    const src =
      currentStep.promptSource === "question"
        ? getQuestionAudioSrc(currentDialogue.question)
        : getAnswerAudioSrc(currentDialogue.answer);

    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, currentStep.volume / 100));
    fullAudioRef.current = audio;

    setFullDialogue((prev) => ({
      ...prev,
      isPlayingDemo: true,
      isRecording: false,
      feedbackMessage: `Step ${currentStep.stepNumber}/14: ${currentStep.task}`,
      playbackBeatIndex: 0,
    }));

    fullBeatTimerRef.current = window.setInterval(() => {
      setFullDialogue((prev) => ({
        ...prev,
        playbackBeatIndex: (prev.playbackBeatIndex + 1) % 4,
      }));
    }, 1000);

    const finalize = () => {
      if (fullBeatTimerRef.current !== null) {
        window.clearInterval(fullBeatTimerRef.current);
        fullBeatTimerRef.current = null;
      }
      setFullDialogue((prev) => {
        const isListeningStep = prev.stepIndex <= 1;
        const nextStepIndex = isListeningStep ? Math.min(fullDialogueSteps.length - 1, prev.stepIndex + 1) : prev.stepIndex;
        return {
          ...prev,
          isPlayingDemo: false,
          playbackBeatIndex: 0,
          stepIndex: nextStepIndex,
          feedbackMessage: isListeningStep
            ? `Auto advanced to Step ${nextStepIndex + 1}/14`
            : `Ready for Step ${prev.stepIndex + 1}/14`,
        };
      });
    };

    audio.onended = finalize;
    audio.onerror = finalize;
    audio.play().catch(() => {
      finalize();
      setFullDialogue((prev) => ({
        ...prev,
        feedbackMessage: "Audio unavailable. Please try again.",
      }));
    });
  };

  const saveRecordingBlob = (): void => {
    if (recordChunksRef.current.length === 0) return;
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(recordChunksRef.current, { type: mimeType });
    if (patientRecordingUrlRef.current) URL.revokeObjectURL(patientRecordingUrlRef.current);
    patientRecordingUrlRef.current = URL.createObjectURL(blob);
    recordChunksRef.current = [];
  };

  const completeDrillEvaluation = (): void => {
    saveRecordingBlob();
    setPhraseDrill((prev) => {
      if (!prev.isRecording) return prev;
      const result = evaluateAttempt(prev.phrase);
      const applied = applyAttempt({ ...prev, isRecording: false }, result.score, result.hits);
      const advanced = maybeAdvanceStep(applied);
      const wrapped =
        advanced.stepIndex >= stepPlan.length
          ? { ...advanced, stepIndex: 0, feedbackMessage: "Phrase drill cycle complete. Continue practicing." }
          : advanced;
      const masteryGain = result.score === 2 ? 12 : result.score === 1 ? 6 : 0;
      return { ...wrapped, masteryPercent: Math.min(100, prev.masteryPercent + masteryGain) };
    });
  };

  const stopMediaRecorder = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  };

  const finalizeDrillRecording = (): void => {
    if (drillRecordTimerRef.current !== null) {
      window.clearTimeout(drillRecordTimerRef.current);
      drillRecordTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        completeDrillEvaluation();
      };
      recorder.stop();
    } else {
      mediaRecorderRef.current = null;
      completeDrillEvaluation();
    }
  };

  const startMicRecording = async (): Promise<boolean> => {
    try {
      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      recordChunksRef.current = [];
      const recorder = new MediaRecorder(micStreamRef.current);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      return true;
    } catch {
      return false;
    }
  };

  const speak = (): void => {
    if (route === "phrase-drill") {
      stopDrillPlayback();
      setPhraseDrill((prev) => ({ ...prev, isRecording: true, feedbackMessage: "Recording... (max 5s)" }));
      startMicRecording().then((ok) => {
        if (!ok) {
          setPhraseDrill((prev) => ({
            ...prev,
            feedbackMessage: "Recording... (max 5s) — mic unavailable, scoring only",
          }));
        }
        drillRecordTimerRef.current = window.setTimeout(finalizeDrillRecording, 5000);
      });
      return;
    }

    stopFullPlayback();
    setFullDialogue((prev) => ({ ...prev, isRecording: true, feedbackMessage: "Recording..." }));
    setTimeout(() => {
      setFullDialogue((prev) => {
        const dialogue = dialogueData[prev.phraseIndex];
        const step = fullDialogueSteps[prev.stepIndex] || fullDialogueSteps[0];

        if (!step.needsSpeech) {
          return {
            ...prev,
            isRecording: false,
            feedbackMessage: `Step ${step.stepNumber}/14 is listening-only. Tap Listen.`,
          };
        }

        const result = evaluateAttempt(dialogue.answer);
        const applied = applyAttempt({ ...prev, isRecording: false }, result.score, result.hits);
        const succeeded = result.score >= 1;

        if (succeeded) {
          const nextStepIndex = prev.stepIndex + 1;
          if (nextStepIndex >= fullDialogueSteps.length) {
            if (mode === "caregiver") {
              return {
                ...applied,
                stepIndex: fullDialogueSteps.length - 1,
                feedbackMessage: "Phrase complete. Caregiver decides next.",
              };
            }
            if (prev.phraseIndex < dialogueData.length - 1) {
              return {
                ...defaultTrainingSlice,
                phraseIndex: prev.phraseIndex + 1,
                playbackBeatIndex: 0,
                feedbackMessage: "Moved to next phrase.",
              };
            }
            return {
              ...applied,
              stepIndex: fullDialogueSteps.length - 1,
              feedbackMessage: "Full dialogue completed.",
            };
          }
          return {
            ...applied,
            stepIndex: nextStepIndex,
            feedbackMessage: `Passed Step ${step.stepNumber}/14. Move to Step ${nextStepIndex + 1}/14.`,
          };
        }

        const pairStart = step.stepNumber % 2 === 0 ? prev.stepIndex - 1 : prev.stepIndex;
        return {
          ...applied,
          stepIndex: Math.max(0, pairStart),
          feedbackMessage: `Failed Step ${step.stepNumber}/14. Retry from Step ${Math.max(1, pairStart + 1)}/14.`,
        };
      });
    }, 700);
  };

  const stopDrillRecording = (): void => {
    finalizeDrillRecording();
  };

  const caregiverGood = (): void => {
    if (route === "phrase-drill") {
      setPhraseDrill((prev) => ({
        ...prev,
        caregiverDecision: "Good",
        masteryPercent: Math.min(100, prev.masteryPercent + 10),
        ...(prev.drillAudioVariant === "hum"
          ? (() => {
              const nextAdvance = prev.caregiverAdvanceCount + 1;
              if (nextAdvance >= 3) {
                return {
                  drillAudioVariant: "target" as const,
                  caregiverAdvanceCount: 0,
                  caregiverGoodCountAfterTarget: 0,
                  feedbackMessage: "Now listen to the target sentence audio.",
                };
              }
              return { caregiverAdvanceCount: nextAdvance };
            })()
          : (() => {
              const nextGood = prev.caregiverGoodCountAfterTarget + 1;
              if (nextGood >= 3) {
                return {
                  caregiverGoodCountAfterTarget: nextGood,
                  localScore: 2,
                  feedbackMessage: "Great! You practise this sentence well!",
                };
              }
              return { caregiverGoodCountAfterTarget: nextGood };
            })()),
      }));
      return;
    }
    setFullDialogue((prev) => {
      const nextStepIndex = prev.stepIndex + 1;
      if (nextStepIndex < fullDialogueSteps.length) {
        return {
          ...prev,
          caregiverDecision: "Good",
          stepIndex: nextStepIndex,
          feedbackMessage: `Caregiver advanced to Step ${nextStepIndex + 1}/14.`,
        };
      }
      if (prev.phraseIndex < dialogueData.length - 1) {
        return {
          ...defaultTrainingSlice,
          phraseIndex: prev.phraseIndex + 1,
          playbackBeatIndex: 0,
          feedbackMessage: "Moved to next phrase by caregiver.",
        };
      }
      return { ...prev, caregiverDecision: "Good", feedbackMessage: "Full dialogue completed." };
    });
  };

  const caregiverBad = (): void => {
    if (route === "phrase-drill") {
      setPhraseDrill((prev) => ({ ...applyAttempt(prev, 0, []), caregiverDecision: "Bad" }));
      return;
    }
    setFullDialogue((prev) => {
      const step = fullDialogueSteps[prev.stepIndex] || fullDialogueSteps[0];
      const pairStart = step.stepNumber % 2 === 0 ? prev.stepIndex - 1 : prev.stepIndex;
      return {
        ...applyAttempt(prev, 0, []),
        caregiverDecision: "Bad",
        stepIndex: Math.max(0, pairStart),
        feedbackMessage: `Caregiver marked bad. Retry from Step ${Math.max(1, pairStart + 1)}/14.`,
      };
    });
  };

  const caregiverRetry = (): void => {
    if (route === "phrase-drill") {
      setPhraseDrill((prev) => ({
        ...prev,
        attemptCount: 0,
        consecutiveSuccessCount: 0,
        failStreak: 0,
        feedbackMessage: "Stage reset. Try again.",
      }));
      return;
    }
    setFullDialogue((prev) => ({
      ...prev,
      attemptCount: 0,
      consecutiveSuccessCount: 0,
      failStreak: 0,
      feedbackMessage: "Stage reset. Try again.",
    }));
  };

  const caregiverSkip = (): void => {
    if (route === "phrase-drill") {
      setPhraseDrill((prev) => {
        const nextStep = prev.stepIndex + 1;
        const wrapped = nextStep >= stepPlan.length ? 0 : nextStep;
        const nextAdvance = prev.drillAudioVariant === "hum" ? prev.caregiverAdvanceCount + 1 : prev.caregiverAdvanceCount;

        const shouldSwitchToTarget = prev.drillAudioVariant === "hum" && nextAdvance >= 3;

        return {
          ...prev,
          stepIndex: wrapped,
          attemptCount: 0,
          consecutiveSuccessCount: 0,
          failStreak: 0,
          caregiverDecision: null,
          drillAudioVariant: shouldSwitchToTarget ? "target" : prev.drillAudioVariant,
          caregiverAdvanceCount: shouldSwitchToTarget ? 0 : nextAdvance,
          caregiverGoodCountAfterTarget: shouldSwitchToTarget ? 0 : prev.caregiverGoodCountAfterTarget,
          feedbackMessage: shouldSwitchToTarget
            ? "Now listen to the target sentence audio."
            : `Skipped to step ${wrapped + 1}.`,
        };
      });
      return;
    }
    setFullDialogue((prev) => {
      const nextStep = Math.min(fullDialogueSteps.length - 1, prev.stepIndex + 1);
      return {
        ...prev,
        stepIndex: nextStep,
        attemptCount: 0,
        consecutiveSuccessCount: 0,
        failStreak: 0,
        caregiverDecision: null,
        feedbackMessage: `Skipped to Step ${nextStep + 1}/14.`,
      };
    });
  };

  const playPatientRecording = (): void => {
    if (route === "phrase-drill") {
      if (phraseDrill.isRecording) {
        setPhraseDrill((prev) => ({
          ...prev,
          feedbackMessage: "Still recording... stop recording first.",
        }));
        return;
      }
      if (!patientRecordingUrlRef.current) {
        setPhraseDrill((prev) => ({
          ...prev,
          feedbackMessage: "No recording yet. Tap Record first.",
        }));
        return;
      }
      setPhraseDrill((prev) => ({ ...prev, feedbackMessage: "Playing patient recording..." }));
      const audio = new Audio(patientRecordingUrlRef.current);
      audio.onended = () => {
        setPhraseDrill((prev) => ({ ...prev, feedbackMessage: "Playback finished." }));
      };
      audio.onerror = () => {
        setPhraseDrill((prev) => ({ ...prev, feedbackMessage: "Playback failed." }));
      };
      audio.play().catch(() => {
        setPhraseDrill((prev) => ({ ...prev, feedbackMessage: "Cannot play recording." }));
      });
      return;
    }
    setFullDialogue((prev) => ({
      ...prev,
      feedbackMessage: "Playing patient recording...",
    }));
  };

  const openDrillForPhrase = (phrase: string): void => {
    setPhraseDrill((prev) => ({
      ...prev,
      phrase,
      playbackBeatIndex: 0,
      feedbackMessage: "Start speaking to see feedback.",
      drillAudioVariant: "hum",
      caregiverAdvanceCount: 0,
      caregiverGoodCountAfterTarget: 0,
    }));
    setRoute("phrase-drill");
  };

  useEffect(() => {
    return () => {
      if (drillBeatTimerRef.current !== null) {
        window.clearInterval(drillBeatTimerRef.current);
      }
      if (fullBeatTimerRef.current !== null) {
        window.clearInterval(fullBeatTimerRef.current);
      }
      if (drillRecordTimerRef.current !== null) {
        window.clearTimeout(drillRecordTimerRef.current);
      }
      if (drillAudioRef.current) {
        drillAudioRef.current.pause();
      }
      if (fullAudioRef.current) {
        fullAudioRef.current.pause();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (patientRecordingUrlRef.current) {
        URL.revokeObjectURL(patientRecordingUrlRef.current);
      }
    };
  }, []);

  return {
    mode,
    setMode,
    route,
    setRoute,
    fullDialogue,
    phraseDrill,
    currentPhrase,
    fullDialogueSteps,
    stepPlan,
    dialogueData,
    libraryTerm,
    setLibraryTerm,
    libraryResults,
    profile,
    setProfile,
    actions: {
      openDrillForPhrase,
      listen,
      play: playPatientRecording,
      speak,
      stopDrillRecording,
      caregiverGood,
      caregiverBad,
      caregiverRetry,
      caregiverSkip,
    },
  };
}
