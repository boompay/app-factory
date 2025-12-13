# Code Refactoring Proposals

## 🔴 Critical Issues

### 1. **Type Safety - Excessive Use of `any`**
**Problem:** Many functions use `any` type, reducing type safety and IDE support.

**Files affected:**
- `services/api-client.ts` - All API methods return `Promise<any>`
- `workflows/verification.service.ts` - `setupVerifications(app: any, enrollResponse: any)`
- `utils/payload-transformer.ts` - `transformStatusFields(obj: any)`
- `utils/file-io.ts` - `writeTestData(filePath: string, data: any)`

**Proposal:** Create proper TypeScript interfaces for API responses:
```typescript
// types/api-responses.ts
export interface ApplicationResponse {
  application: {
    id: string;
    current_applicant: ApplicantResponse;
    // ... other fields
  };
}

export interface EnrollResponse {
  application: ApplicationResponse;
}

export interface AssetResponse {
  asset: {
    global_id: string;
    url: string;
    // ... other fields
  };
}
```

### 2. **Non-null Assertions (`!`) - Unsafe Code**
**Problem:** Excessive use of `!` operator (non-null assertions) can cause runtime errors.

**Files affected:**
- `runner.ts` - 10+ instances
- `workflows/personal-details.service.ts` - 15+ instances
- `workflows/enrollment.service.ts` - 5+ instances

**Proposal:** Add proper null checks and validation:
```typescript
// Instead of: app.applicant!.first_name!
// Use:
if (!app.applicant?.first_name) {
  throw new Error("Applicant first name is required");
}
```

### 3. **Unused Import**
**Problem:** `import { count } from "console"` in `personal-details.service.ts` is never used.

**Fix:** Remove the unused import.

---

## 🟡 Code Quality Issues

### 4. **Code Duplication - Repeated Pattern**
**Problem:** The pattern `getAndSaveApplicationDetails` is called 7 times in `runner.ts`.

**Proposal:** Extract to a helper function or use a loop:
```typescript
const steps = [
  { name: "personal details", fn: submitPersonalDetails },
  { name: "housing history", fn: submitHousingHistory },
  // ...
];

for (const step of steps) {
  await step.fn(api, app);
  await saveApplicationSnapshot(api, app.id!);
}
```

### 5. **Magic Numbers and Hardcoded Values**
**Problem:** Hardcoded timeouts, delays, and retry counts scattered throughout code.

**Files:**
- `runner.ts:132` - `setTimeout(resolve, 15000)`
- `runner.ts:149` - `waitFor(..., 30000, 3000)`
- `api-client.ts` - Various timeout values

**Proposal:** Move to config:
```typescript
// config/app.config.ts
export const TIMEOUTS = {
  IDENTITY_VERIFICATION_WAIT: 15000,
  IDENTITY_VERIFICATION_CHECK: 30000,
  IDENTITY_VERIFICATION_INTERVAL: 3000,
  API_REQUEST: 10000,
  API_LONG_REQUEST: 60000,
} as const;
```

### 6. **Error Handling Inconsistency**
**Problem:** Some functions throw errors, others return error objects, some use try-catch inconsistently.

**Proposal:** Create a consistent error handling strategy:
```typescript
// utils/errors.ts
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
```

### 7. **API Client Method Signatures**
**Problem:** Inconsistent parameter ordering and optional parameters.

**Proposal:** Standardize method signatures:
```typescript
// Consistent pattern: required params first, then optional
public async methodName(
  required1: string,
  required2: string,
  payload?: any,
  options?: ApiRequestOptions,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<ResponseType>
```

---

## 🟢 Improvements & Best Practices

### 8. **Extract Constants**
**Problem:** String literals scattered throughout code.

**Examples:**
- `"started"`, `"submitted"`, `"finished"` in payload transformer
- `"verified"` in identity verification check
- Content types: `"application/pdf"`, `"image/svg+xml"`

**Proposal:**
```typescript
// constants/status.ts
export const STATUS = {
  STARTED: "started",
  SUBMITTED: "submitted",
  FINISHED: "finished",
  VERIFIED: "verified",
} as const;

// constants/content-types.ts
export const CONTENT_TYPES = {
  PDF: "application/pdf",
  SVG: "image/svg+xml",
  OCTET_STREAM: "application/octet-stream",
} as const;
```

### 9. **Separate Concerns - File Upload Logic**
**Problem:** File upload logic is mixed with business logic in `personal-details.service.ts`.

**Proposal:** Create a dedicated service:
```typescript
// services/file-upload.service.ts
export class FileUploadService {
  async uploadFile(
    api: ApiClient,
    app: AppInfo,
    filePath: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    // Centralized upload logic
  }
}
```

### 10. **Improve Logging**
**Problem:** Inconsistent log levels and messages.

**Proposal:** Use structured logging:
```typescript
logger.info("Application submitted", {
  applicationId: app.id,
  applicantId: app.applicant?.id,
  timestamp: new Date().toISOString(),
});
```

### 11. **Configuration Management**
**Problem:** Configuration mixed with code, hardcoded paths.

**Proposal:** Centralize configuration:
```typescript
// config/index.ts
export const CONFIG = {
  PATHS: {
    CURRENT_APP: "./current-app.json",
    TEST_DATA: "./test-data",
    LOGS: "./logs",
  },
  TIMEOUTS: { /* ... */ },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_BASE: 1000,
    BACKOFF_MAX: 10000,
  },
} as const;
```

### 12. **Type Definitions for API Responses**
**Problem:** No type definitions for API responses, making it hard to work with data.

**Proposal:** Create comprehensive types:
```typescript
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface PresignResponse {
  fields: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  url: string;
}
```

### 13. **Extract Retry Logic**
**Problem:** Retry logic only in `createAsset`, but could be useful elsewhere.

**Proposal:** Create a reusable retry utility:
```typescript
// utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  // Reusable retry logic
}
```

### 14. **Improve Function Naming**
**Problem:** Some function names are unclear:
- `passSubmissionDisclosure` - "pass" is ambiguous
- `getAndSaveApplicationDetails` - does two things

**Proposal:**
- `passSubmissionDisclosure` → `submitSubmissionDisclosure`
- `getAndSaveApplicationDetails` → `saveApplicationSnapshot`

### 15. **Add Input Validation**
**Problem:** Functions don't validate inputs before use.

**Proposal:** Add validation at function entry:
```typescript
export async function uploadSignature(
  api: ApiClient,
  app: AppInfo,
  filePath: string
): Promise<string> {
  if (!app.id) {
    throw new ValidationError("Application ID is required");
  }
  if (!filePath) {
    throw new ValidationError("File path is required");
  }
  // ... rest of function
}
```

---

## 📋 Implementation Priority

### High Priority (Do First)
1. Remove unused imports
2. Fix type safety issues (replace `any` with proper types)
3. Add null checks (reduce `!` usage)
4. Extract constants for magic strings/numbers

### Medium Priority
5. Extract retry logic to utility
6. Standardize error handling
7. Improve API response types
8. Extract file upload service

### Low Priority (Nice to Have)
9. Refactor runner.ts to use loops
10. Improve logging structure
11. Add comprehensive input validation
12. Rename ambiguous functions

---

## 🛠️ Quick Wins (Can be done immediately)

1. **Remove unused import:**
   ```typescript
   // Remove from personal-details.service.ts:18
   import { count } from "console";
   ```

2. **Extract magic numbers:**
   ```typescript
   const IDENTITY_VERIFICATION_INITIAL_DELAY = 15000;
   await new Promise(resolve => setTimeout(resolve, IDENTITY_VERIFICATION_INITIAL_DELAY));
   ```

3. **Add JSDoc comments** to public methods for better IDE support

4. **Create status constants:**
   ```typescript
   export const VERIFICATION_STATUS = {
     VERIFIED: "verified",
     PENDING: "pending",
     FAILED: "failed",
   } as const;
   ```
