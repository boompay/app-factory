import { Verification } from "../types";
import { Applicant } from "../models";

export type MagicLinkCheckApplicant = {
  id?: string | number;
  email?: string;
  verifications?: Verification[];
};

export type MagicLinkCheckResponse = {
  magic_link?: {
    applicant_id?: string | number;
    current_applicant?: MagicLinkCheckApplicant;
  };
  current_applicant?: MagicLinkCheckApplicant;
  applicant?: MagicLinkCheckApplicant;
};

export function extractApplicantFromMagicLinkCheck(
  data: MagicLinkCheckResponse
): MagicLinkCheckApplicant | undefined {
  return (
    data.current_applicant ??
    data.applicant ??
    data.magic_link?.current_applicant ??
    (data.magic_link?.applicant_id
      ? { id: data.magic_link.applicant_id }
      : undefined)
  );
}

export function applyApplicantIdFromMagicLinkCheck(
  applicant: Applicant,
  checkData: MagicLinkCheckResponse
): void {
  if (applicant.id) {
    return;
  }

  const fromCheck = extractApplicantFromMagicLinkCheck(checkData);
  if (fromCheck?.id != null) {
    applicant.id = String(fromCheck.id);
  }
}
