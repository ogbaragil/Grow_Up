

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


