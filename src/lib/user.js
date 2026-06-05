

export function getUserDisplayName(session, state) {
  const metadata = session?.user?.user_metadata || {};

  const metadataName =
    metadata.first_name ||
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    "";

  if (metadataName) {
    return String(metadataName).split(" ")[0];
  }

  if (state?.firstName) {
    return state.firstName;
  }

  const emailPrefix = session?.user?.email?.split("@")?.[0];
  if (emailPrefix) {
    return emailPrefix;
  }

  return "there";
}

// Age derived from birth month+year ("YYYY-MM"), so it stays current without
// the user ever updating it. Falls back to the legacy static profile.age for
// users who onboarded before birth month was captured.
export function getCurrentAge(profile) {
  const birth = profile?.birth;
  if (typeof birth === "string" && /^\d{4}-\d{2}$/.test(birth)) {
    const [y, m] = birth.split("-").map(Number);
    const now = new Date();
    let age = now.getFullYear() - y;
    if (now.getMonth() + 1 < m) age -= 1;
    if (age >= 0 && age < 130) return age;
  }
  const legacy = Number(profile?.age);
  return Number.isFinite(legacy) && legacy > 0 ? legacy : null;
}
