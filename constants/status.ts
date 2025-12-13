/**
 * Status constants used throughout the application
 */
export const STATUS = {
  STARTED: "started",
  SUBMITTED: "submitted",
  FINISHED: "finished",
  VERIFIED: "verified",
  PENDING: "pending",
  FAILED: "failed",
} as const;

export type Status = typeof STATUS[keyof typeof STATUS];
