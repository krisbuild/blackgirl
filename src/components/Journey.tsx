"use client";

import { useState } from "react";
import { FaceCapture } from "./FaceCapture";
import { Journal } from "./Journal";
import { ScanResult } from "./ScanResult";
import { Tour } from "./Tour";
import { Welcome } from "./Welcome";

type Step = "welcome" | "tour" | "capture" | "result" | "journal";

/** The app's main flow: welcome → preview → guided capture → analysis & results → journal. */
export function Journey() {
  const [step, setStep] = useState<Step>("welcome");
  const [photo, setPhoto] = useState<Blob | null>(null);
  // A fresh key per photo so the result screen runs exactly one analysis for it.
  const [scanKey, setScanKey] = useState(0);

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  switch (step) {
    case "welcome":
      return <Welcome onStart={() => go("tour")} onJournal={() => go("journal")} />;
    case "tour":
      return <Tour onStart={() => go("capture")} onBack={() => go("welcome")} />;
    case "capture":
      return (
        <FaceCapture
          onBack={() => go("tour")}
          onCaptured={(p) => {
            setPhoto(p);
            setScanKey((k) => k + 1);
            go("result");
          }}
        />
      );
    case "result":
      return photo ? (
        <ScanResult key={scanKey} photo={photo} onRetake={() => go("capture")} onJournal={() => go("journal")} />
      ) : null;
    case "journal":
      return <Journal onNewScan={() => go("capture")} onHome={() => go("welcome")} />;
  }
}
