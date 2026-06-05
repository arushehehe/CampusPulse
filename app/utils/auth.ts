const DEFAULT_REDIRECT = "/events";

export const ALLOWED_EMAIL_DOMAIN = "@iitg.ac.in";

export const isAllowedCollegeEmail = (email: string | null | undefined) => {
  if (!email) {
    return false;
  }

  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
};

export const getSafeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }

  return value;
};

export const getAuthErrorMessage = (error: string | null) => {
  switch (error) {
    case "invalid_email":
      return "Use your IITG email address ending in @iitg.ac.in.";
    case "unauthorized_domain":
      return "Only @iitg.ac.in email addresses can access CampusPulse right now.";
    case "auth_callback_failed":
      return "We could not complete the sign-in link. Try requesting a new magic link.";
    case "profile_setup_failed":
      return "Your account was created, but the CampusPulse profile setup did not finish.";
    default:
      return null;
  }
};
