import { PipelineStep } from "./pipeline-step";
import { combinedIncomeStep } from "./steps/combined-income.step";
import { disclosureStep } from "./steps/disclosure.step";
import { housingHistoryStep } from "./steps/housing-history.step";
import { identityCreateStep } from "./steps/identity-create.step";
import { identityVerifyStep } from "./steps/identity-verify.step";
import { moveInDateStep } from "./steps/move-in-date.step";
import { coApplicantAuthStep } from "./steps/co-applicant-auth.step";
import { passInviteStep } from "./steps/pass-invite.step";
import { personalDetailsStep } from "./steps/personal-details.step";
import { refreshApplicantContextStep } from "./steps/refresh-applicant-context.step";
import { startFlowStep } from "./steps/start-flow.step";
import { submitStep } from "./steps/submit.step";

const VERIFICATION_STEPS: PipelineStep[] = [
  identityCreateStep,
  personalDetailsStep,
  housingHistoryStep,
  combinedIncomeStep,
  moveInDateStep,
  disclosureStep,
  identityVerifyStep,
];

export const PRIMARY_APPLICANT_PIPELINE: PipelineStep[] = [
  startFlowStep,
  ...VERIFICATION_STEPS,
  submitStep,
];

export const CO_APPLICANT_PIPELINE: PipelineStep[] = [
  coApplicantAuthStep,
  passInviteStep,
  refreshApplicantContextStep,
  ...VERIFICATION_STEPS,
];
