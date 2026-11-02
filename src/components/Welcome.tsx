import { Sun } from "./Sun";

/** Deep-to-golden tones, shown as a quiet nod to who this is built for. */
const TONES = ["#3b2219", "#4f2d1f", "#6b3d27", "#8a5234", "#a86b45", "#c48a5f"];

export function Welcome({ onStart, onJournal, onProduct }: { onStart: () => void; onJournal: () => void; onProduct: () => void }) {
  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-10">
      <header className="rise flex items-center justify-between text-sm text-muted">
        <span className="font-display text-lg tracking-wide text-sand">Shine</span>
        <button onClick={onJournal} className="rounded-full px-3 py-1 text-sand ring-1 ring-mahogany">
          My journal
        </button>
      </header>

      <div className="relative mx-auto mt-6 w-64 max-w-full">
        <Sun className="w-full" />
      </div>

      <div className="mt-2 text-center">
        <p className="rise rise-1 text-sm uppercase tracking-[0.3em] text-honey">Welcome</p>
        <h1 className="rise rise-2 mt-3 font-display text-5xl leading-[1.05] text-shea">
          Hello, <em className="text-sun">sunshine.</em>
        </h1>
        <p className="rise rise-3 mt-4 font-display text-2xl italic text-sand">
          You shine like the sun.
        </p>
        <p className="rise rise-3 mx-auto mt-5 max-w-sm text-base leading-relaxed text-muted">
          A skin journal made for melanin-rich skin. Track your dark marks and acne scars
          as they fade, week by week, so you can see your progress and celebrate it.
        </p>
      </div>

      <div className="rise rise-4 mt-7 flex justify-center gap-2" aria-hidden="true">
        {TONES.map((t) => (
          <span key={t} className="h-6 w-6 rounded-full ring-2 ring-espresso" style={{ background: t }} />
        ))}
      </div>

      <div className="rise rise-4 mt-auto pt-10">
        <button
          onClick={onStart}
          className="w-full rounded-full bg-gradient-to-r from-honey to-sun px-6 py-4 text-lg font-semibold text-espresso shadow-[0_10px_40px_-10px_rgba(246,196,83,0.7)] transition active:scale-[0.98]"
        >
          Start my first scan
        </button>
        <button onClick={onProduct} className="mt-3 w-full rounded-full px-6 py-3.5 font-semibold text-sand ring-1 ring-mahogany transition active:scale-[0.98]">
          Check a skincare product
        </button>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <li>Private to you</li>
          <li aria-hidden="true">·</li>
          <li>No account needed</li>
          <li aria-hidden="true">·</li>
          <li>Cosmetic guidance, not medical advice</li>
        </ul>
      </div>
    </section>
  );
}
