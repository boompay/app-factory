export interface Verification {
  name: string;
  id?: string | number;
}

export type PersonalDetailsStepPayload = () => Record<string, unknown>;

export interface PersonalDetailsStepConfig {
  stepName: string;
  getPayload: PersonalDetailsStepPayload;
}

