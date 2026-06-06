// ─── Shared primitives ────────────────────────────────────────────────────────

export interface Money {
  cents: number;
  currency: string;
}

export interface CodeDescription {
  code: string | null;
  description: string;
}

export interface YearsAndMonths {
  years: number;
  months: number;
  total_months: number;
}

// ─── TransUnion raw response ───────────────────────────────────────────────────
// Shape produced by Boom::Services::Transunion::ParseCreditResponse

export interface TransunionCreditDataStatus {
  suppressed: boolean;
  do_not_promote: boolean;
  freeze: boolean;
  minor: boolean;
  disputed: boolean;
}

export interface TransunionFileSummary {
  file_hit_indicator: "regularHit" | "regularNoHit" | "noHit" | string;
  ssn_match_indicator?: string;
  consumer_statement_indicator: boolean;
  market?: string;
  submarket?: string;
  in_file_since_date?: string;
  credit_data_status: TransunionCreditDataStatus;
}

export interface TransunionTransactionControl {
  user_ref_number?: string;
  transaction_timestamp?: string;
  correlation_id?: string | null;
}

export interface TransunionName {
  first?: string;
  middle?: string;
  last?: string;
}

export interface TransunionAddress {
  status?: string;
  qualifier?: string;
  street_number?: string;
  street_name?: string;
  street_type?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  date_reported?: string;
}

export interface TransunionEmployment {
  employer?: string;
  date_on_file_since?: string;
  date_effective?: string;
}

export interface TransunionPersonalInfo {
  name?: TransunionName;
  addresses: TransunionAddress[];
  ssn?: string;
  date_of_birth?: string;
  employment?: TransunionEmployment;
}

export interface TransunionScoreFactor {
  rank: number;
  code: string;
}

export interface TransunionCreditScore {
  score: number;
  model_code?: string;
  derogatory_alert: boolean;
  file_inquiries_impacted_score: boolean;
  factors: TransunionScoreFactor[];
}

export interface TransunionRemark {
  code?: string;
  type?: string;
}

export interface TransunionSubscriber {
  industry_code?: string;
  member_code?: string;
  name?: string;
}

export interface TransunionMaxDelinquency {
  earliest: boolean;
  amount?: number;
  date?: string;
  account_rating?: string;
}

export interface TransunionPaymentPattern {
  start_date?: string;
  text?: string;
}

export interface TransunionHistoricalCounters {
  months_reviewed_count: number;
  late_30_days_total: number;
  late_60_days_total: number;
  late_90_days_total: number;
}

export interface TransunionPaymentHistory {
  max_delinquency?: TransunionMaxDelinquency;
  payment_pattern?: TransunionPaymentPattern;
  historical_counters?: TransunionHistoricalCounters;
}

export interface TransunionTradeTerms {
  payment_schedule_month_count?: string;
  scheduled_monthly_payment?: number;
}

export interface TransunionTradeLine {
  subscriber: TransunionSubscriber;
  portfolio_type?: string;
  account_number?: string;
  ecoa_designator?: string;
  date_opened?: string;
  date_effective?: string;
  date_closed?: string;
  date_paid_out?: string;
  closed_indicator?: string;
  current_balance?: number;
  high_credit?: number;
  credit_limit?: number;
  account_rating?: string;
  account_type?: string;
  past_due?: number;
  terms?: TransunionTradeTerms;
  payment_history?: TransunionPaymentHistory;
  most_recent_payment?: string;
  update_method?: string;
  remarks: TransunionRemark[];
}

export interface TransunionOriginalCreditor {
  name?: string;
  classification?: string;
  balance?: number;
}

export interface TransunionCollection {
  subscriber: TransunionSubscriber;
  portfolio_type?: string;
  account_number?: string;
  ecoa_designator?: string;
  account_type?: string;
  date_opened?: string;
  date_effective?: string;
  current_balance?: number;
  past_due?: number;
  account_rating?: string;
  original_creditor: TransunionOriginalCreditor;
  remarks: TransunionRemark[];
  update_method?: string;
}

export interface TransunionInquirySubscriber extends TransunionSubscriber {
  inquiry_prefix_code?: string;
}

export interface TransunionInquiry {
  ecoa_designator?: string;
  subscriber: TransunionInquirySubscriber;
  date?: string;
}

export interface TransunionPublicRecord {
  subscriber: TransunionSubscriber;
  ecoa_designator?: string;
  type?: string;
  docket_number?: string;
  attorney?: string;
  date_filed?: string;
  date_paid?: string;
  date_effective?: string;
  date_verified?: string;
  evaluation?: string;
  source_type?: string;
  amount?: number;
  remarks: TransunionRemark[];
}

/** Output of Boom::Services::Transunion::ParseCreditResponse */
export interface TransunionRawResponse {
  transaction_control: TransunionTransactionControl;
  subject_number?: string;
  file_summary: TransunionFileSummary;
  personal_info: TransunionPersonalInfo;
  credit_score?: TransunionCreditScore;
  trade_lines: TransunionTradeLine[];
  collections: TransunionCollection[];
  inquiries: TransunionInquiry[];
  public_records: TransunionPublicRecord[];
  raw_xml: string;
}

// ─── Equifax raw response ──────────────────────────────────────────────────────
// Shape of consumers.equifaxUSConsumerCreditReport[0] from the Equifax JSON API

export interface EquifaxModel {
  score?: number;
  modelNumber?: string;
  reasons?: EquifaxReasonCode[];
}

export interface EquifaxReasonCode {
  code?: string;
  description?: string;
}

export interface EquifaxRiskBasedPricing {
  percentage?: number;
  lowRange?: number;
  highRange?: number;
}

export interface EquifaxHitCode {
  code: string;
  description?: string;
}

export interface EquifaxSubjectName {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
}

export interface EquifaxIdentification {
  socialNumConfirmed?: string;
  socialNumMatch?: string;
  socialMatchFlags?: string;
  inquirySocialNumYearIssued?: string;
  inquirySocialNumStateIssued?: string;
}

export interface EquifaxAddress {
  addressLine1?: string;
  cityName?: string;
  stateAbbreviation?: string;
  zipCode?: string;
  county?: string;
  addressType?: "current" | "previous" | string;
  dateFirstReported?: string;
  dateLastReported?: string;
  addressVarianceIndicator?: string;
  telephoneNumber?: string;
  dateTelephoneReported?: string;
}

export interface EquifaxEmployment {
  identifier?: string;
  occupation?: string;
  employer?: string;
  dateLastReported?: string;
  dateFirstReported?: string;
}

export interface EquifaxConsumerStatement {
  statement?: string;
  dateReported?: string;
  datePurged?: string;
}

export interface EquifaxNarrativeCode {
  code?: string;
  description?: string;
}

export interface EquifaxTrade {
  customerNumber?: string;
  customerName?: string;
  accountDesignator?: string;
  portfolioTypeCode?: string;
  accountTypeCode?: string;
  balance?: number;
  highCredit?: number;
  creditLimit?: number;
  scheduledPaymentAmount?: number;
  monthsReviewed?: number;
  rate?: string;
  dateOpened?: string;
  dateReported?: string;
  closedDate?: string;
  originalChargeOffAmount?: number;
  lastActivityDate?: string;
  narrativeCodes?: EquifaxNarrativeCode[];
  ballonPaymentAmount?: number;
  ballonPaymentDueDate?: string;
  pastDueAmount?: number;
  actualPaymentAmount?: number;
  lastPaymentDate?: string;
  termsDurationCode?: string;
  termsFrequencyCode?: string;
  deferredPaymentStartDate?: string;
  previousHighRate1?: string;
  previousHighRate2?: string;
  previousHighDate1?: string;
  previousHighDate2?: string;
  dateMajorDelinquencyFirstReported?: string;
  thirtyDayCounter?: number;
  sixtyDayCounter?: number;
  ninetyDayCounter?: number;
  creditorClassificationCode?: string;
  purchasedFromOrSoldCreditorName?: string;
  paymentHistory1to24?: string;
}

export interface EquifaxCollection {
  indicator?: string;
  industryCode?: string;
  customerNumber?: string;
  accountNumber?: string;
  clientNameOrNumber?: string;
  statusCode?: string;
  statusDate?: string;
  narrativeCodes?: EquifaxNarrativeCode[];
  dateReported?: string;
  dateAssigned?: string;
  originalAmount?: number;
  balance?: number;
  accountDesignatorCode?: string;
  creditorClassificationCode?: string;
  dateOfFirstDelinquency?: string;
}

export interface EquifaxBankruptcy {
  dateFiled?: string;
  dateReported?: string;
  filer?: string;
  type?: string;
  industryCode?: string;
  narrativeCodes?: EquifaxNarrativeCode[];
  caseNumber?: string;
  customerNumber?: string;
  dispositionDate?: string;
  currentIntentOrDispositionCode?: string;
  currentDispositionDate?: string;
  priorIntentOrDispositionCode?: string;
}

export interface EquifaxInquiry {
  customerName?: string;
  inquiryDate?: string;
}

export interface EquifaxAlertContactPhone {
  telephoneNumberType?: string;
  telephoneNumber?: string;
  countryCode?: string;
  extension?: string;
}

export interface EquifaxAlertContactAddress {
  addressLine1?: string;
  addressLine2?: string;
  cityName?: string;
  stateAbbreviation?: string;
  zipCode?: string;
  countryCode?: string;
}

export interface EquifaxAlertContact {
  alertType?: string;
  dateReported?: string;
  effectiveDate?: string;
  status?: string;
  telephoneNumbers?: EquifaxAlertContactPhone[];
  address?: EquifaxAlertContactAddress;
}

export interface EquifaxFraudVictimIndicator {
  description?: string;
}

/** Shape of consumers.equifaxUSConsumerCreditReport[0] from the Equifax JSON API */
export interface EquifaxConsumerCreditReport {
  hitCode?: EquifaxHitCode;
  customerReferenceNumber?: string;
  customerNumber?: string;
  reportDate?: string;
  birthDate?: string;
  deathDate?: string;
  subjectSocialNum?: string;
  subjectName?: EquifaxSubjectName;
  formerNames?: EquifaxSubjectName[];
  fileSinceDate?: string;
  lastActivityDate?: string;
  identification?: EquifaxIdentification;
  models?: EquifaxModel[];
  riskBasedPricingOrModel?: EquifaxRiskBasedPricing;
  addresses?: EquifaxAddress[];
  employments?: EquifaxEmployment[];
  consumerStatements?: EquifaxConsumerStatement[];
  trades?: EquifaxTrade[];
  collections?: EquifaxCollection[];
  bankruptcies?: EquifaxBankruptcy[];
  inquiries?: EquifaxInquiry[];
  fraudVictimIndicator?: EquifaxFraudVictimIndicator;
  addressDiscrepancyIndicator?: string;
  alertContacts?: EquifaxAlertContact[];
}

/** Top-level Equifax API response envelope */
export interface EquifaxApiResponse {
  consumers: {
    equifaxUSConsumerCreditReport: EquifaxConsumerCreditReport[];
  };
  links?: Record<string, string>;
}

// ─── Normalized credit report ──────────────────────────────────────────────────
// Unified shape output by both builder interactors and serialized by CreditReportEntity

export interface PaymentHistoryEntry {
  code: string;
  description: string;
}

export interface AccountOverview {
  account_number?: string;
  subscriber_number?: string;
  account_name?: string;
  account_owner?: string;
  portfolio_type?: CodeDescription;
  account_type?: CodeDescription;
  balance?: Money;
  high_credit?: Money;
  credit_limit?: Money;
  scheduled_payment_amount?: Money;
  months_reviewed?: number;
  rate?: CodeDescription | string;
  date_opened?: string;
  date_reported?: string;
  date_closed?: string;
  charge_off_amount?: Money;
  last_activity_date?: string;
  narrative_codes?: Array<{ code?: string; description?: string }>;
  balloon_payment_amount?: Money;
  balloon_payment_date?: string;
  past_due_amount?: Money;
  actual_payment_amount?: Money;
  last_payment_date?: string;
  terms_duration?: string;
  terms_frequency?: string;
  deferred_payment_start?: string;
  previous_high_rate_one?: string;
  previous_high_rate_two?: string;
  previous_high_date_one?: string;
  previous_high_date_two?: string;
  date_major_first_delinquency_reported?: string;
  thirty_days_delinquency?: number;
  sixty_days_delinquency?: number;
  ninety_days_delinquency?: number;
  creditor_classification?: CodeDescription;
  original_creditor_name?: string;
  account_rating?: string;
  payment_history?: PaymentHistoryEntry[] | string;
}

export interface NormalizedCollection {
  indicator?: string | null;
  industry_code?: string;
  customer_number?: string;
  account_number?: string;
  client_name?: string;
  status?: CodeDescription;
  status_date?: string | null;
  narrative_codes?: Array<{ code?: string; description?: string }>;
  date_reported?: string;
  date_assigned?: string;
  original_amount?: Money;
  balance?: Money;
  account_designator?: CodeDescription;
  creditor_classification?: CodeDescription;
  date_of_first_delinquency?: string | null;
}

export interface NormalizedBankruptcy {
  date_filed?: string;
  date_reported?: string;
  date_paid?: string;
  filer?: string;
  type?: string;
  industry_code?: string;
  narrative_codes?: string[];
  case_number?: string;
  customer_number?: string;
  attorney?: string;
  disposition?: string;
  current_intent_or_disposition_code?: string;
  current_disposition_date?: string;
  prior_intent_or_disposition_code?: string;
  source_type?: string;
}

export interface NormalizedInquiry {
  inquirer?: string;
  date?: string;
}

export interface NormalizedEmployment {
  status?: string;
  occupation?: string;
  employer?: string;
  date_last_reported?: string;
  date_first_reported?: string;
}

export interface NormalizedAddress {
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  date_first_reported?: string | null;
  date_last_reported?: string;
  type?: string;
}

export interface NormalizedConsumerStatement {
  statement?: string;
  date_reported?: string;
  date_purged?: string;
}

export interface NormalizedPersonalData {
  full_name?: string;
  ssn?: string;
  file_pulled?: string;
  customer_number?: string;
  dob?: string;
}

export interface NormalizedConsumerInformation {
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  address_variance_indicator?: string;
  current_phone_number?: string;
  date_reported_address?: string;
  date_reported_phone_number?: string;
  date_file_established?: string;
  date_most_recent_activity?: string;
  ssn_status?: string;
  ssn_match?: string;
  ssn_match_flags?: string;
  issue_date?: string;
  issue_state?: string;
  other_names?: string[];
  death_date?: string | null;
  otherNames?: string[];
}

export interface AlertContactPhone {
  type?: string;
  phone_number?: string;
  country_code?: string;
  extension?: string;
}

export interface AlertContactAddress {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface AlertContact {
  type?: string;
  date_reported?: string;
  date_effective?: string;
  status?: string;
  phone_numbers?: AlertContactPhone[];
  address?: AlertContactAddress;
}

export interface NormalizedAlertsAndTriggers {
  alert_contacts: AlertContact[];
  // Equifax-specific
  fraud_victim_indicator?: string;
  address_discrepancy_indicator?: string;
  // TransUnion-specific
  credit_freeze?: boolean;
  credit_disputed?: boolean;
  credit_minor?: boolean;
  credit_suppressed?: boolean;
  credit_deceased?: boolean;
  credit_insufficient_info?: boolean;
  credit_do_not_promote?: boolean;
}

export interface NormalizedRisk {
  percentage?: number;
  low_range: number;
  high_range: number;
}

export interface NormalizedHitCode {
  code: string;
  description?: string;
}

/** TransUnion-only: accounts summary computed by the builder */
export interface AccountsSummary {
  length_of_credit_history?: YearsAndMonths;
  average_account_age?: YearsAndMonths;
  oldest_open_account?: { name?: string; date?: string } | null;
  most_recent_account?: { name?: string; date?: string } | null;
  number_of_accounts: number;
  revolving: number;
  installments: number;
  mortgage: number;
  line_of_credit: number;
  other: number;
}

export interface CriteriaData {
  collections_balance?: number;
  credit_score?: number;
  past_due_account?: number;
  unpaid_collections_balance?: number;
  bankruptcy_records?: number;
  foreclosure_accounts?: number;
}

/** Unified credit report shape — output of both Equifax and TransUnion builder interactors */
export interface NormalizedCreditReport {
  vendor: "equifax" | "transunion";
  model_number?: string;
  score?: number;
  completed_at?: string;

  hit_code?: NormalizedHitCode;
  is_no_hit: boolean;

  past_due_accounts: AccountOverview[];
  balance_past_due?: Money;
  balance_past_due_amount?: number;
  balance_of_collections?: Money;
  debt_balance?: Money;

  bankruptcy: number;
  bankruptcy_details: NormalizedBankruptcy[];

  risk: NormalizedRisk;
  reasons?: Array<{ code?: string; rank?: number } | string>;

  personal_data?: NormalizedPersonalData;
  consumer_information?: NormalizedConsumerInformation;
  historical_consumer_information: NormalizedAddress[];
  consumer_statements: NormalizedConsumerStatement[];
  employment_information: NormalizedEmployment[];
  credit_inquiries: NormalizedInquiry[];

  alerts_and_triggers?: NormalizedAlertsAndTriggers;
  has_alerts_and_triggers_warnings?: boolean;
  has_consumer_information_warnings?: boolean;

  account_overview: AccountOverview[];
  filtered_accounts: AccountOverview[];
  collection_accounts: AccountOverview[];
  foreclosure_accounts: AccountOverview[];

  /** TransUnion only */
  accounts_summary?: AccountsSummary;

  rental_collection_accounts: AccountOverview[];
  balance_of_rental_collections?: Money;
  rental_past_due_accounts: AccountOverview[];
  balance_of_rental_past_due?: Money;

  collections: NormalizedCollection[];

  ssn_mismatched?: boolean;
  itin_detected?: boolean;

  request_data?: Record<string, unknown>;
  customer_reference_number?: string | null;

  /** Equifax only */
  links?: Record<string, string>;

  criteria_data?: CriteriaData;
  meets_criteria?: boolean;
  reason_codes?: string[];
}