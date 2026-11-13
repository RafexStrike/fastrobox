"use client";

import { useEffect, useState } from "react";

export function EmergencyBanner() {
  const [state, setState] = useState<{ active: boolean; eventType?: string; messageTs?: string }>({ active: false });

  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch("/api/emergency", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { active?: boolean; eventType?: string; messageTs?: string };
        setState({ active: Boolean(payload.active), eventType: payload.eventType, messageTs: payload.messageTs });
      } catch {
        // no-op, the banner remains hidden when the state cannot be determined.
      }
    };

    void loadState();
    const interval = window.setInterval(() => {
      void loadState();
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  if (!state.active || !state.eventType) {
    return null;
  }

  return (
    <div className="emergency-banner" role="alert" aria-live="assertive">
      <strong>{state.eventType === "PANIC" ? "PANIC" : state.eventType === "FIRE" ? "FIRE" : "HEAT DANGER"}</strong>
      <span>{state.messageTs ? new Date(state.messageTs).toLocaleString() : "Active emergency"}</span>
    </div>
  );
}
