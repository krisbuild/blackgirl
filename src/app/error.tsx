"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

/** Last line of defence: never leave a blank screen. Your saved scans are safe in your journal. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-honey/20 text-2xl text-honey">!</span>
      <h2 className="mt-5 font-display text-3xl">That didn&apos;t load right</h2>
      <p className="mt-3 max-w-sm text-muted">Something on this screen tripped up. Your saved scans are safe in your journal.</p>
      <button onClick={() => retry()} className="mt-8 w-full rounded-full bg-gradient-to-r from-honey to-sun py-4 font-semibold text-espresso">
        Try again
      </button>
      <button onClick={() => window.location.reload()} className="mt-3 w-full rounded-full py-3.5 font-semibold text-sand ring-1 ring-mahogany">
        Back to start
      </button>
    </section>
  );
}
