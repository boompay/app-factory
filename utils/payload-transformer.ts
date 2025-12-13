import { STATUS } from "../constants";

/**
 * Recursively transforms an object by changing specific field values:
 * - Fields named "status" with value "started" → "submitted"
 * - Fields named "application_status" with value "finished" → "submitted"
 * 
 * @param obj - The object to transform (can be nested)
 * @returns A new object with transformed values
 */
export function transformStatusFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => transformStatusFields(item));
  }

  // Handle objects
  if (typeof obj === "object") {
    const transformed: any = {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // Transform specific fields
        if (key === "status" && value === STATUS.STARTED) {
          transformed[key] = STATUS.SUBMITTED;
        } else if (key === "application_status" && value === STATUS.FINISHED) {
          transformed[key] = STATUS.SUBMITTED;
        } else {
          // Recursively transform nested objects/arrays
          transformed[key] = transformStatusFields(value);
        }
      }
    }
    
    return transformed;
  }

  // Return primitive values as-is
  return obj;
}
