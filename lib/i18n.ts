export type Locale = "en" | "bn";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  bn: "বাংলা",
};

export const translations = {
  en: {
    overview: "Overview",
    welcome: "Welcome",
    yourWorkspace: "Your workspace",
    accountAccess: "Account access",
    yourRole: "Your role",
    signOut: "Sign out",
    login: "Log in",
    signIn: "Sign in",
    roomDashboard: "Room dashboard",
    deviceHealth: "Device health",
    emergencyBanner: "Emergency status",
    fire: "FIRE",
    panic: "PANIC",
    heatDanger: "Heat danger",
    noData: "No data available",
    unavailable: "Unavailable",
    loading: "Loading",
    resetFire: "Reset fire",
    adminHistory: "Login history",
    language: "Language",
  },
  bn: {
    overview: "সংক্ষিপ্ত বিবরণ",
    welcome: "স্বাগতম",
    yourWorkspace: "আপনার ওয়ার্কস্পেস",
    accountAccess: "অ্যাকাউন্ট অ্যাক্সেস",
    yourRole: "আপনার ভূমিকা",
    signOut: "সাইন আউট",
    login: "লগইন",
    signIn: "সাইন ইন",
    roomDashboard: "রুম ড্যাশবোর্ড",
    deviceHealth: "ডিভাইস স্বাস্থ্য",
    emergencyBanner: "জরুরি অবস্থা",
    fire: "অগ্নি",
    panic: "প্যানিক",
    heatDanger: "তাপ ঝুঁকি",
    noData: "কোনো তথ্য নেই",
    unavailable: "উপলব্ধ নয়",
    loading: "লোড হচ্ছে",
    resetFire: "আগুন বন্ধ করুন",
    adminHistory: "লগইন ইতিহাস",
    language: "ভাষা",
  },
} as const;

export function getLocaleFromCookie(value: string | undefined): Locale {
  return value === "bn" ? "bn" : "en";
}

export function getTranslations(locale: Locale) {
  return translations[locale];
}
