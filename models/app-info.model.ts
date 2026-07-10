export interface Email{
  email: string;
  inboxEmail: string;
  password: string;
  token: string;
  accountId: string;
}

export interface Applicant {
  id?: string;
  role?: string;
  /** Co-applicant entry URL: /auth/sign-in?token=...&unitId=...&applicationId=... */
  sign_in_link?: string;
  invite_magic_link?: string;
  phone?: string;
  otp?: number;
  email?: Email;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  address?: {
    full_address?: string;
    address_components?: {
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      county?: string;
    };
  };
}

export interface AppInfo {
  id?: string;
  app_token: string;
  bearer_token: string;
  refresh_token: string;
  unit_id: string;
  incomeId?: string;
  incomeSourceId?: string;
  applicants?: Applicant[];
  verifications?: {
    personal_details?: string;
    housing_history?: string;
    identity?: string;
    combined_income?: string;
    submission_disclosure?: string;
  };
}

/**
 * Returns the applicant at the given index in the applicants array.
 */
export function getApplicantAt(
  app: AppInfo,
  applicantIndex = 0
): Applicant | undefined {
  return app.applicants?.[applicantIndex];
}

/** @deprecated Use getApplicantAt or getApplicant(ctx) from workflows/run-context */
export function getCurrentApplicant(
  app: AppInfo,
  applicantIndex = 0
): Applicant | undefined {
  return getApplicantAt(app, applicantIndex);
}
