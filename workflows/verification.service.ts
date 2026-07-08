import { Verification } from "../types";
import { APP_CONFIG } from "../config";
import { AppInfo } from "../models";

export function extractVerificationId(
  verifications: Verification[],
  verificationName: string,
  displayName: string
): string {
  const verification = verifications.find((v) =>
    v.name.includes(verificationName)
  );
  if (!verification || verification.id == null) {
    throw new Error(
      `${displayName} verification (${verificationName}) not found in enroll response`
    );
  }
  return verification.id.toString();
}

export function setupVerificationsFromApplicant(
  app: AppInfo,
  applicantData: { verifications: Verification[] }
): void {
  if (!app.verifications) {
    app.verifications = {};
  }

  if (!applicantData.verifications) {
    throw new Error("Applicant data missing verifications");
  }

  app.verifications.personal_details = extractVerificationId(
    applicantData.verifications,
    APP_CONFIG.VERIFICATION_NAMES.PERSONAL_DETAILS,
    "Personal details"
  );

  app.verifications.housing_history = extractVerificationId(
    applicantData.verifications,
    APP_CONFIG.VERIFICATION_NAMES.HOUSING_HISTORY,
    "Housing history"
  );

  app.verifications.identity = extractVerificationId(
    applicantData.verifications,
    APP_CONFIG.VERIFICATION_NAMES.IDENTITY,
    "Identity"
  );

  app.verifications.combined_income = extractVerificationId(
    applicantData.verifications,
    APP_CONFIG.VERIFICATION_NAMES.COMBINED_INCOME,
    "Combined income"
  );

  app.verifications.submission_disclosure = extractVerificationId(
    applicantData.verifications,
    APP_CONFIG.VERIFICATION_NAMES.SUBMISSION_DISCLOSURE,
    "Submission disclosure"
  );
}

export function setupVerifications(app: AppInfo, enrollResponse: any): void {
  const currentApplicant = enrollResponse.application.current_applicant;
  if (!currentApplicant || !currentApplicant.verifications) {
    throw new Error("Enroll response missing current_applicant.verifications");
  }

  setupVerificationsFromApplicant(app, currentApplicant);
}
