import { useMemo } from "react";
import { HomePage } from "./components/HomePage";
import { LibraryPage } from "./components/LibraryPage";
import { PhraseDrillPage } from "./components/PhraseDrillPage";
import { SettingsPage } from "./components/SettingsPage";
import { SidebarNav } from "./components/SidebarNav";
import { TopHeader } from "./components/TopHeader";
import { DialogueDemoPage } from "./components/DialogueDemoPage";
import { useTrainingStore } from "./state/useTrainingStore";

export default function App() {
  const store = useTrainingStore();
  const fullStep = store.fullDialogueSteps[store.fullDialogue.stepIndex] || store.fullDialogueSteps[0];
  const drillStep = store.stepPlan[store.phraseDrill.stepIndex] || store.stepPlan[0];
  const progressPercent = useMemo(
    () => Math.round((store.fullDialogue.phraseIndex / store.dialogueData.length) * 100),
    [store.fullDialogue.phraseIndex, store.dialogueData.length]
  );

  return (
    <div className="app-root">
      <TopHeader
        mode={store.mode}
        onModeChange={store.setMode}
        userName={store.profile.name}
        onOpenSettings={() => store.setRoute("settings")}
      />
      <div className="app-shell">
        <SidebarNav route={store.route} onRouteChange={store.setRoute} />
        <main className="page-content">
          {store.route === "home" ? (
            <HomePage
              currentTask={fullStep.task}
              progressPercent={progressPercent}
              onStartTraining={() => store.setRoute("full-dialogue")}
              onOpenDrill={store.actions.openDrillForPhrase}
            />
          ) : null}

          {store.route === "full-dialogue" ? (
            <DialogueDemoPage />
          ) : null}

          {store.route === "phrase-drill" ? (
            <PhraseDrillPage
              mode={store.mode}
              state={store.phraseDrill}
              step={drillStep}
              onListen={store.actions.listen}
              onSpeak={store.actions.speak}
              onStopRecording={store.actions.stopDrillRecording}
              onPlay={store.actions.play}
              onCaregiverGood={store.actions.caregiverGood}
              onCaregiverBad={store.actions.caregiverBad}
              onCaregiverRetry={store.actions.caregiverRetry}
              onCaregiverSkip={store.actions.caregiverSkip}
            />
          ) : null}

          {store.route === "library" ? (
            <LibraryPage term={store.libraryTerm} results={store.libraryResults} onTermChange={store.setLibraryTerm} />
          ) : null}

          {store.route === "settings" ? (
            <SettingsPage profile={store.profile} onSave={store.setProfile} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
