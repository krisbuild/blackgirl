"use client";

import { useRef, useState } from "react";
import { FaceCapture } from "./FaceCapture";
import { Journal } from "./Journal";
import { ProductCheck } from "./ProductCheck";
import { ScanResult } from "./ScanResult";
import { Tour } from "./Tour";
import { Welcome } from "./Welcome";

type Step = "welcome" | "tour" | "capture" | "result" | "journal" | "product";

/** The app's main flow: welcome → preview → guided capture → analysis & results → journal. */
export function Journey() {
  const [step, setStep] = useState<Step>("welcome");
  const [photo, setPhoto] = useState<Blob | null>(null);
  // A fresh key per photo so the result screen runs exactly one analysis for it.
  const [scanKey, setScanKey] = useState(0);
  const [productFrom, setProductFrom] = useState<Step>("welcome");
  const resultScroll = useRef(0);
  const openProduct = (from: Step) => {
    if (from === "result") resultScroll.current = window.scrollY;
    setProductFrom(from);
    go("product");
  };
  const backToResult = () => {
    setStep("result");
    requestAnimationFrame(() => window.scrollTo({ top: resultScroll.current }));
  };

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  // Keep the result screen mounted while Product check is open from it, so coming back
  // doesn't re-run (and re-save) the analysis or lose the user's answers.
  if (photo && (step === "result" || (step === "product" && productFrom === "result"))) {
    return (
      <>
        <div hidden={step !== "result"}>
          <ScanResult
            key={scanKey}
            photo={photo}
            onRetake={() => go("capture")}
            onJournal={() => go("journal")}
            onProduct={() => openProduct("result")}
          />
        </div>
        {step === "product" && <ProductCheck onBack={backToResult} />}
      </>
    );
  }

  switch (step) {
    case "welcome":
      return <Welcome onStart={() => go("tour")} onJournal={() => go("journal")} onProduct={() => openProduct("welcome")} />;
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
        <ScanResult
          key={scanKey}
          photo={photo}
          onRetake={() => go("capture")}
          onJournal={() => go("journal")}
          onProduct={() => openProduct("result")}
        />
      ) : null;
    case "journal":
      return <Journal onNewScan={() => go("capture")} onHome={() => go("welcome")} onProduct={() => openProduct("journal")} />;
    case "product":
      return <ProductCheck onBack={() => go(productFrom)} />;
  }
}
