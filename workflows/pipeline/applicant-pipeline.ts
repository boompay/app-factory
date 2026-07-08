import { PipelineStep } from "./pipeline-step";
import { combinedIncomeStep } from "./steps/combined-income.step";
import { disclosureStep } from "./steps/disclosure.step";
import { housingHistoryStep } from "./steps/housing-history.step";
import { identityCreateStep } from "./steps/identity-create.step";
import { identityVerifyStep } from "./steps/identity-verify.step";
import { moveInDateStep } from "./steps/move-in-date.step";
import { personalDetailsStep } from "./steps/personal-details.step";
import { startFlowStep } from "./steps/start-flow.step";
import { submitStep } from "./steps/submit.step";

export const APPLICANT_PIPELINE: PipelineStep[] = [
  startFlowStep,
  identityCreateStep,
  personalDetailsStep,
  housingHistoryStep,
  combinedIncomeStep,
  moveInDateStep,
  disclosureStep,
  identityVerifyStep,
  submitStep,
];
