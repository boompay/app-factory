import { Verification } from "../types";
import { APP_CONFIG } from "../config";

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

export function setupVerifications(app: any, enrollResponse: any): void {
  if (!app.verifications) {
    app.verifications = {};
  }

  const currentApplicant = enrollResponse.application.current_applicant;
  if (!currentApplicant || !currentApplicant.verifications) {
    throw new Error("Enroll response missing current_applicant.verifications");
  }

  app.verifications.personal_details = extractVerificationId(
    currentApplicant.verifications,
    APP_CONFIG.VERIFICATION_NAMES.PERSONAL_DETAILS,
    "Personal details"
  );

  app.verifications.housing_history = extractVerificationId(
    currentApplicant.verifications,
    APP_CONFIG.VERIFICATION_NAMES.HOUSING_HISTORY,
    "Housing history"
  );

  app.verifications.identity = extractVerificationId(
    currentApplicant.verifications,
    APP_CONFIG.VERIFICATION_NAMES.IDENTITY,
    "Identity"
  );

  app.verifications.combined_income = extractVerificationId(
    currentApplicant.verifications,
    APP_CONFIG.VERIFICATION_NAMES.COMBINED_INCOME,
    "Combined income"
  );

  app.verifications.submission_disclosure = extractVerificationId(
    currentApplicant.verifications,
    APP_CONFIG.VERIFICATION_NAMES.SUBMISSION_DISCLOSURE,
    "Submission disclosure"
  );

}

