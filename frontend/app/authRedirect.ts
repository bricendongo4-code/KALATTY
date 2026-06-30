export const sanitizeNextPath = (value: string | null | undefined) => {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n]/.test(value)
  ) {
    return "/dashboard";
  }

  return value;
};

export const buildLoginUrl = (nextPath: string) =>
  `/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;

export const buildStudentRegisterUrl = (nextPath: string) =>
  `/register/student?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
