const express = require("express");
const fs = require("fs");
const path = require("path");
const { recommendStack } = require("./src/services/recommender");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const frontendDistDir = path.join(__dirname, "frontend", "dist");
const hasFrontendBuild = fs.existsSync(frontendDistDir);
const sharedAudioDir = path.join(__dirname, "..", "audio");
const hasSharedAudio = fs.existsSync(sharedAudioDir);
const dialogueDemoDir = path.join(__dirname, "dialogue-demo");
const hasDialogueDemo = fs.existsSync(dialogueDemoDir);

if (hasFrontendBuild) {
  app.use(express.static(frontendDistDir));
}
if (hasSharedAudio) {
  app.use("/audio", express.static(sharedAudioDir));
}
if (hasDialogueDemo) {
  app.use("/dialogue-demo", express.static(dialogueDemoDir));
}

app.get("/api/health", (req, res) => {
  res.json({
    message: "AI-LUV training app API is running.",
    usage: "POST /api/recommend with JSON body: { goal: string }",
  });
});

app.post("/api/recommend", (req, res) => {
  const goal = String(req.body?.goal || "").trim();

  if (!goal) {
    return res.status(400).json({
      error: "Missing required field: goal",
      example: {
        goal: "Build a healthcare rehabilitation web app with low-latency audio and simple UI.",
      },
    });
  }

  const recommendation = recommendStack(goal);
  return res.json(recommendation);
});

app.use((req, res) => {
  if (!hasFrontendBuild) {
    return res.status(404).json({
      error: "Frontend build not found.",
      nextStep: "Run npm run build:client or npm run dev:client",
    });
  }
  return res.sendFile(path.join(frontendDistDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
