"use client";

import { useEffect, useState } from "react";

type Prefs = {
  sunscreen: boolean;
  sunscreenAt: string;
  reapply: boolean;
  reapplyAt: string;
  water: boolean;
  waterEvery: number;
  waterFrom: string;
  waterTo: string;
};

const DEFAULTS: Prefs = {
  sunscreen: true,
  sunscreenAt: "07:30",
  reapply: false,
  reapplyAt: "12:30",
  water: true,
  waterEvery: 2,
  waterFrom: "09:00",
  waterTo: "19:00",
};
const KEY = "shine-reminders";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

function Row({ on, onToggle, icon, label, children }: { on: boolean; onToggle: () => void; icon: string; label: string; children?: React.ReactNode }) {
  return (
    <li className="rounded-xl bg-espresso/40 p-3">
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={on} onChange={onToggle} className="h-4 w-4 accent-[#f6c453]" />
        <span aria-hidden="true">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-shea">{label}</span>
      </label>
      {on && children && <div className="mt-2 flex flex-wrap items-center gap-2 pl-7 text-xs text-muted">{children}</div>}
    </li>
  );
}

/**
 * Daily "apply sunscreen" and "drink water" reminders, added to the phone's calendar with an alert.
 * (A website can't send scheduled notifications while it's closed; a calendar alert always fires.)
 */
export function Reminders() {
  const [p, setP] = useState<Prefs>(DEFAULTS);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved choices once on mount
      if (saved) setP({ ...DEFAULTS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const set = (patch: Partial<Prefs>) =>
    setP((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const q = new URLSearchParams({ start: today() });
  if (p.sunscreen) q.set("sunscreen", p.sunscreenAt);
  if (p.reapply) q.set("reapply", p.reapplyAt);
  if (p.water) {
    q.set("waterEvery", String(p.waterEvery));
    q.set("waterFrom", p.waterFrom);
    q.set("waterTo", p.waterTo);
  }
  const any = p.sunscreen || p.reapply || p.water;

  const time = "rounded-lg bg-espresso/70 px-2 py-1 text-sm text-shea ring-1 ring-mahogany focus:outline-none focus:ring-honey";
  return (
    <section className="mt-8 rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
      <h3 className="font-display text-xl">Daily reminders</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">Sunscreen every morning is the biggest factor in fading dark marks. Let your phone remind you.</p>
      <ul className="mt-3 space-y-2">
        <Row on={p.sunscreen} onToggle={() => set({ sunscreen: !p.sunscreen })} icon="☀" label="Apply sunscreen">
          every day at
          <input type="time" value={p.sunscreenAt} onChange={(e) => e.target.value && set({ sunscreenAt: e.target.value })} className={time} aria-label="Sunscreen time" />
        </Row>
        <Row on={p.reapply} onToggle={() => set({ reapply: !p.reapply })} icon="↻" label="Reapply sunscreen">
          at
          <input type="time" value={p.reapplyAt} onChange={(e) => e.target.value && set({ reapplyAt: e.target.value })} className={time} aria-label="Reapply time" />
          <span>(if you&apos;re out)</span>
        </Row>
        <Row on={p.water} onToggle={() => set({ water: !p.water })} icon="💧" label="Drink water">
          every
          {[2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ waterEvery: n })}
              aria-pressed={p.waterEvery === n}
              className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${p.waterEvery === n ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"}`}
            >
              {n} h
            </button>
          ))}
          from
          <input type="time" value={p.waterFrom} onChange={(e) => e.target.value && set({ waterFrom: e.target.value })} className={time} aria-label="Water from" />
          to
          <input type="time" value={p.waterTo} onChange={(e) => e.target.value && set({ waterTo: e.target.value })} className={time} aria-label="Water until" />
        </Row>
      </ul>
      <a
        href={any ? `/api/reminders?${q}` : undefined}
        aria-disabled={!any}
        onClick={() => any && setAdded(true)}
        className={`mt-4 block w-full rounded-full py-3.5 text-center font-semibold ${any ? "bg-gradient-to-r from-honey to-sun text-espresso" : "pointer-events-none bg-mahogany text-muted"}`}
      >
        🔔 Add reminders to my phone
      </a>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {added
          ? "Tap \"Add All\" (iPhone) or open the downloaded file (Android) to save them. Your phone will alert you every day, even when Shine is closed."
          : "They go into your phone's calendar with an alert, so they ring even when Shine is closed. To stop them, delete the Shine events."}
      </p>
    </section>
  );
}
