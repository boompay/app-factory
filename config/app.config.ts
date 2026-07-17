export type IncomeSource = "Paystub" | "W2" | "Bank statement";

export const INCOME_SOURCE_DETAILS: Record<
  IncomeSource,
  { apiType: string; filePath: string; documentType: string }
> = {
  Paystub: {
    apiType: "paystub",
    filePath: "./test-data/Paystub.pdf",
    documentType: "paystub",
  },
  W2: {
    apiType: "w2",
    filePath: "./test-data/W2.pdf",
    documentType: "w2",
  },
  "Bank statement": {
    apiType: "bank_statement",
    filePath: "./test-data/BankStatement.pdf",
    documentType: "bank_statement",
  },
};

export const APP_CONFIG = {
  ENV: "stg2",
  PATHS: {
    CURRENT_APP: "./current-app.json",
    TEST_DATA_APPLICATION: "./test-data/application.json",
    TEST_DATA_APPLICANT: "./test-data/applicant.json",
  },
  VERIFICATION_NAMES: {
    PERSONAL_DETAILS: "rental_application",
    HOUSING_HISTORY: "housing_history",
    IDENTITY: "identity",
    COMBINED_INCOME: "combined_income",
    SUBMISSION_DISCLOSURE: "submission_disclosure",
  },
  STEP_NAMES: {
    PERSONAL_DETAILS: "personal_details",
    DEPENDENTS: "dependents",
    EMERGENCY_CONTACTS: "emergency_contacts",
    PETS: "pets",
    VEHICLES: "vehicles",
    MILITARY_FIRST_RESPONDER_TEACHER: "military_first_responder_teacher",
    LEAD_SOURCE: "lead_source",
    HOUSING_HISTORY: "address",
    SUBMISSION_DISCLOSURE: "submission_disclosure_step",
  },
  DEFAULT_VALUES: {
    DEPENDENTS: "No",
    PETS: "No",
    VEHICLES: "No",
    MILITARY_FIRST_RESPONDER_TEACHER: "No",
    LEAD_SOURCE: "Google",
    HOUSING_TYPE: "Own my home",
    EMERGENCY_CONTACT_RELATIONSHIP: "Other",
    INCOME_SOURCE: "Paystub" as IncomeSource,
  },
  TIMEOUTS: {
    API_REQUEST: 10000,
    API_LONG_REQUEST: 60000,
    IDENTITY_VERIFICATION_WAIT: 20000,
    IDENTITY_VERIFICATION_CHECK: 90000,
    IDENTITY_VERIFICATION_INTERVAL: 5000,
    INVITE_DELAY_MS: 15000,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_BASE_MS: 1000,
    BACKOFF_MAX_MS: 10000,
  },
  ACTORS: {
    APPLICANT: 0,
    OCCUPANT: 0,
    GUARANTOR: 0,
  },
  ACTOR_ROLES: {
    APPLICANT: "applicant",
    OCCUPANT: "occupant",
    GUARANTOR: "co_signer",
  },
  ACTOR_PATCH_FLAGS: {
    applicant: { has_multiple_applicants: true },
    occupant: { has_multiple_occupants: true },
    co_signer: { has_multiple_guarantors: true },
  },
};

const DEFAULT_CONFIG = JSON.parse(JSON.stringify(APP_CONFIG));

export function applyConfigOverrides(overrides: Record<string, any>): void {
  if (overrides.ACTORS?.GARANTOR != null && overrides.ACTORS.GUARANTOR == null) {
    overrides.ACTORS.GUARANTOR = overrides.ACTORS.GARANTOR;
  }

  if (overrides.ACTORS?.GUARANTORS != null && overrides.ACTORS.GUARANTOR == null) {
    overrides.ACTORS.GUARANTOR = overrides.ACTORS.GUARANTORS;
  }

  for (const section of ["ACTORS", "DEFAULT_VALUES", "TIMEOUTS", "RETRY"] as const) {
    if (overrides[section]) {
      Object.assign(APP_CONFIG[section], overrides[section]);
    }
  }
}

export function resetConfig(): void {
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    if (typeof DEFAULT_CONFIG[key] === "object" && DEFAULT_CONFIG[key] !== null) {
      Object.assign((APP_CONFIG as any)[key], JSON.parse(JSON.stringify(DEFAULT_CONFIG[key])));
    }
  }
}
