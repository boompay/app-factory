import { ApiClient } from "../../services";
import { AppInfo, getCurrentApplicant } from "../../models";
import { resolveApplicantId } from "../enrollment.service";
import { setupVerificationsFromApplicant } from "../verification.service";

export async function refreshApplicantContext(
  api: ApiClient,
  app: AppInfo,
  applicantIndex: number
): Promise<void> {
  await resolveApplicantId(api, app, applicantIndex);

  const applicant = getCurrentApplicant(app, applicantIndex);
  if (!applicant) {
    throw new Error(`Applicant at index ${applicantIndex} not found`);
  }

  const appDetailsRaw = await api.getApplicationDetails(app.id!);
  const appDetails = await appDetailsRaw.json();
  const email = applicant.email?.email;
  const apiApplicants = appDetails.application?.applicants ?? [];
  const apiApplicant =
    apiApplicants.find((entry: { email?: string }) => entry.email === email) ??
    appDetails.application?.current_applicant;

  if (!apiApplicant?.verifications) {
    throw new Error(
      `Verifications not found for applicant at index ${applicantIndex}`
    );
  }

  setupVerificationsFromApplicant(app, apiApplicant);
  app.incomeId = undefined;
  app.incomeSourceId = undefined;
}
