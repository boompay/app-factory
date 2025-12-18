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
    SUBMISSION_DISCLOSURE: "submission_disclosure"

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
  },
  TIMEOUTS: {
    API_REQUEST: 10000,
    API_LONG_REQUEST: 60000,
    IDENTITY_VERIFICATION_WAIT: 15000,
    IDENTITY_VERIFICATION_CHECK: 50000,
    IDENTITY_VERIFICATION_INTERVAL: 5000,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_BASE_MS: 1000,
    BACKOFF_MAX_MS: 10000,
  },
} as const;
