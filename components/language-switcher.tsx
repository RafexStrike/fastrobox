"use client";

import { useState } from "react";
import { localeLabels, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const changeLocale = async (nextLocale: Locale) => {
    setLocale(nextLocale);
    document.cookie = `fastrobox-lang=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    window.location.reload();
  };

  return (
    <label className="language-switcher" aria-label="Language selector">
      <span>{localeLabels[locale]}</span>
      <select
        value={locale}
        onChange={(event) => void changeLocale(event.target.value === "bn" ? "bn" : "en")}
      >
        <option value="en">English</option>
        <option value="bn">বাংলা</option>
      </select>
    </label>
  );
}
