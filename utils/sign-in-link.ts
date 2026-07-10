export interface SignInLinkParams {
  token: string;
  unitId: string;
  applicationId?: string;
}

/**
 * Parses a co-applicant sign-in URL:
 * https://screen.../auth/sign-in?token=...&unitId=...&applicationId=...
 *
 * Also supports legacy magic links: https://screen.../a/<token>
 */
export function parseApplicantSignInLink(link: string): SignInLinkParams {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new Error(`Invalid applicant sign-in link: ${link}`);
  }

  if (url.pathname.includes("/auth/sign-in")) {
    const token = url.searchParams.get("token");
    const unitId = url.searchParams.get("unitId");
    const applicationId = url.searchParams.get("applicationId") ?? undefined;

    if (!token?.trim()) {
      throw new Error(`Sign-in link missing token query param: ${link}`);
    }
    if (!unitId?.trim()) {
      throw new Error(`Sign-in link missing unitId query param: ${link}`);
    }

    return { token: token.trim(), unitId: unitId.trim(), applicationId };
  }

  const pathToken = url.pathname.split("/").filter(Boolean).pop();
  if (pathToken) {
    return { token: pathToken, unitId: "" };
  }

  throw new Error(`Unsupported applicant sign-in link format: ${link}`);
}

export function getApplicantSignInLink(applicant: {
  sign_in_link?: string;
  invite_magic_link?: string;
}): string {
  const link = applicant.sign_in_link ?? applicant.invite_magic_link;
  if (!link) {
    throw new Error("Applicant is missing sign_in_link");
  }
  return link;
}
