/**
 * Content type constants for file uploads
 */
export const CONTENT_TYPES = {
  PDF: "application/pdf",
  SVG: "image/svg+xml",
  OCTET_STREAM: "application/octet-stream",
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];
