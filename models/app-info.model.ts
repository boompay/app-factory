export interface Email{
  email: string;
  password: string;
  token: string;
  accountId: string;
}

export interface Applicant {
  id?: string;
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
 * Gets the current applicant from the applicants array.
 * Returns the first applicant if available, or undefined if the array is empty.
 * @param app - The AppInfo object
 * @returns The current applicant or undefined
 */
export function getCurrentApplicant(app: AppInfo): Applicant | undefined {
  return app.applicants && app.applicants.length > 0 ? app.applicants[0] : undefined;
}
