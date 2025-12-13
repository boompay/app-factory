export interface AppInfo {
  id?: string;
  app_token: string;
  bearer_token: string;
  refresh_token: string;
  unit_id: string;
  incomeId?: string;
  incomeSourceId?: string;
  applicant?: {
    id?: string;
    phone?: string;
    otp?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
  };
  verifications?: {
    personal_details?: string;
    housing_history?: string;
    identity?: string;
    combined_income?: string;
    submission_disclosure?: string;
  };
}
