import { ApiClient } from "../services";
import { Applicant } from "../models";
import { parseApplicantSignInLink, getApplicantSignInLink } from "../utils/sign-in-link";
import {
  extractApplicantFromMagicLinkCheck,
  MagicLinkCheckApplicant,
} from "../utils/magic-link-check";

export async function fetchApplicantFromMagicLinkCheck(
  api: ApiClient,
  applicant: Applicant
): Promise<MagicLinkCheckApplicant | undefined> {
  const signInLink = getApplicantSignInLink(applicant);
  const { token } = parseApplicantSignInLink(signInLink);
  const response = await api.checkMagicLink(token);
  const data = await response.json();

  return extractApplicantFromMagicLinkCheck(data);
}

export { applyApplicantIdFromMagicLinkCheck } from "../utils/magic-link-check";
