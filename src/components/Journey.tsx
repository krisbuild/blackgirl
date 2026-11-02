"use client";

import { useState } from "react";
import { Consent } from "./Consent";
import { FaceCapture } from "./FaceCapture";
import { Welcome } from "./Welcome";

type Step = "welcome" | "consent" | "capture" | "captured";

export function Journey() {
  const [step, setStep] = useState<Step>("welcome");
  const [photo, setPhoto] = useState<Blob | null>(null);

  if (step === "welcome") return <Welcome onStart={() => setStep("consent")} />;
  if (step === "consent") return <Consent onAgree={() => setStep("capture")} onBack={() => setStep("welcome")} />;
  if (step === "capture")
    return (
      <FaceCapture
        onBack={() => setStep("consent")}
        onCaptured={(p) => {
          setPhoto(p);
          setStep("captured");
        }}
      />
    );

  // Analysis screen comes next; for now confirm the capture worked.
  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h2 className="font-display text-3xl">Photo ready</h2>
      <p className="mt-2 text-muted">{photo ? `${Math.round(photo.size / 1024)} KB captured.` : ""} Analysis is the next step.</p>
      <button onClick={() => setStep("capture")} className="mt-6 text-honey">
        Take another
      </button>
    </section>
  );
}
