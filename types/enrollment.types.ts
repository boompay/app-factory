import { Verification } from "./verification.types";

export interface EnrollApplicant {
  id: string;
  verifications: Verification[];
}

export interface EnrollResponse {
  application: {
    id: string;
    current_applicant: EnrollApplicant;
  };
}

export interface ApplicationDetailsApplicant {
  id?: string;
  email?: string;
  verifications?: Verification[];
}

export interface ApplicationDetailsResponse {
  application: {
    applicants?: ApplicationDetailsApplicant[];
    current_applicant?: ApplicationDetailsApplicant;
  };
}
