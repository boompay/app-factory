import * as fs from "fs";
import * as path from "path";

/**
 * CSV Reader Utility for TransUnion Users
 * 
 * This module provides functions to read and parse the transunion-users.csv file
 * and retrieve random user records.
 * 
 * @example
 * ```typescript
 * import { getRandomTransUnionUser, TransUnionUser } from './utils/csv-reader';
 * 
 * // Get a random user
 * const user: TransUnionUser = getRandomTransUnionUser();
 * console.log(`${user.firstName} ${user.lastName}`);
 * console.log(`SSN: ${user.ssn}`);
 * console.log(`FICO Score: ${user.ficoScore9}`);
 * 
 * // Get all users
 * import { getAllTransUnionUsers } from './utils/csv-reader';
 * const allUsers = getAllTransUnionUsers();
 * ```
 */

/**
 * Interface representing a TransUnion user record from the CSV file
 */
export interface TransUnionUser {
  lastName: string;
  firstName: string;
  middleName: string;
  prefix: string;
  suffix: string;
  houseNumber: string;
  direction: string;
  streetName: string;
  postDirection: string;
  streetType: string;
  aptNumber: string;
  city: string;
  state: string;
  zipCode: string;
  ssn: string;
  ficoScore9: string;
  vantageScore40: string;
  totalAccounts: number;
  totalBankcardAccounts: number;
  totalRevolvingAccounts: number;
  totalInstallmentAccounts: number;
  totalMortgageAccounts: number;
  totalBankruptcyPublicRecords: number;
}

/**
 * Converts a string to Pascal case (each word capitalized)
 * @param str - The string to convert
 * @returns The string in Pascal case
 * @example
 * toPascalCase("JOHN SMITH") // "John Smith"
 * toPascalCase("NEW YORK") // "New York"
 * toPascalCase("ROSE MALLOW") // "Rose Mallow"
 */
function toPascalCase(str: string): string {
  if (!str || !str.trim()) {
    return "";
  }
  
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      // Handle special cases like "ST", "DR", "AV" (abbreviations)
      const upperWord = word.toUpperCase();
      if (upperWord.length <= 3 && /^[A-Z]+$/.test(upperWord)) {
        // Keep short abbreviations as-is (ST, DR, AV, etc.)
        return upperWord;
      }
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Parses a CSV line, handling quoted fields and trimming whitespace
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

/**
 * Reads and parses the TransUnion users CSV file
 * @param csvPath - Path to the CSV file (defaults to test-data/transunion-users.csv)
 * @returns Array of parsed TransUnion user records
 */
function readTransUnionCsv(csvPath?: string): TransUnionUser[] {
  const defaultPath = path.resolve(
    __dirname,
    "../test-data/transunion-users.csv"
  );
  const filePath = csvPath || defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split(/\r?\n/);

  // Find the header row (contains "Last Name" and "First Name")
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Last Name") && lines[i].includes("First Name")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Could not find header row in CSV file");
  }

  // Parse header to get column indices
  const headerLine = lines[headerIndex];
  // The header spans multiple lines, so we need to combine them
  // Lines 4-6 contain the header
  const combinedHeader = [
    lines[headerIndex],
    lines[headerIndex + 1] || "",
    lines[headerIndex + 2] || "",
  ].join(" ");

  const headerFields = parseCsvLine(combinedHeader);

  // Find column indices
  const lastNameIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("last name")
  );
  const firstNameIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("first name")
  );
  const middleNameIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("middle name")
  );
  const prefixIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("prefix")
  );
  const suffixIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("suffix")
  );
  const houseNumberIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("house")
  );
  const directionIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("direction") && !h.toLowerCase().includes("post")
  );
  const streetNameIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("street name")
  );
  const postDirectionIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("post direction")
  );
  const streetTypeIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("street type")
  );
  const aptNumberIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("apt")
  );
  const cityIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("city")
  );
  const stateIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("state")
  );
  const zipCodeIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("zip code")
  );
  const ssnIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("ssn")
  );
  const ficoScore9Index = headerFields.findIndex((h) =>
    h.toLowerCase().includes("fico score 9")
  );
  const vantageScore40Index = headerFields.findIndex((h) =>
    h.toLowerCase().includes("vantagescore 4.0")
  );
  const totalAccountsIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("total number of accounts")
  );
  const totalBankcardAccountsIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("total number of bankcard accounts")
  );
  const totalRevolvingAccountsIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("total number of revolving accounts")
  );
  const totalInstallmentAccountsIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("total number of installment accounts")
  );
  const totalMortgageAccountsIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("total number of mortgage accounts")
  );
  const totalBankruptcyPublicRecordsIndex = headerFields.findIndex((h) =>
    h.toLowerCase().includes("total number of bankruptcy public records")
  );

  // Parse data rows (start after header)
  const users: TransUnionUser[] = [];
  const dataStartIndex = headerIndex + 3; // Skip header lines (4, 5, 6)

  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('"')) {
      // Skip empty lines or lines that look like headers/metadata
      continue;
    }

    const fields = parseCsvLine(line);

    // Skip if we don't have enough fields or if it's clearly not a data row
    if (fields.length < 15) {
      continue;
    }

    // Helper to safely get field value
    const getField = (index: number): string => {
      return index >= 0 && index < fields.length ? fields[index].trim() : "";
    };

    // Helper to safely parse number
    const getNumber = (index: number): number => {
      const value = getField(index);
      // Remove + sign and parse
      const cleaned = value.replace(/^\+/, "").trim();
      return cleaned ? parseInt(cleaned, 10) || 0 : 0;
    };

    const user: TransUnionUser = {
      lastName: toPascalCase(getField(lastNameIndex)),
      firstName: toPascalCase(getField(firstNameIndex)),
      middleName: getField(middleNameIndex),
      prefix: getField(prefixIndex),
      suffix: getField(suffixIndex),
      houseNumber: getField(houseNumberIndex),
      direction: getField(directionIndex),
      streetName: toPascalCase(getField(streetNameIndex)),
      postDirection: getField(postDirectionIndex),
      streetType: toPascalCase(getField(streetTypeIndex)),
      aptNumber: getField(aptNumberIndex),
      city: toPascalCase(getField(cityIndex)),
      state: getField(stateIndex),
      zipCode: getField(zipCodeIndex),
      ssn: getField(ssnIndex),
      ficoScore9: getField(ficoScore9Index),
      vantageScore40: getField(vantageScore40Index),
      totalAccounts: getNumber(totalAccountsIndex),
      totalBankcardAccounts: getNumber(totalBankcardAccountsIndex),
      totalRevolvingAccounts: getNumber(totalRevolvingAccountsIndex),
      totalInstallmentAccounts: getNumber(totalInstallmentAccountsIndex),
      totalMortgageAccounts: getNumber(totalMortgageAccountsIndex),
      totalBankruptcyPublicRecords: getNumber(
        totalBankruptcyPublicRecordsIndex
      ),
    };

    // Only add if we have at least a last name and first name
    if (user.lastName && user.firstName) {
      users.push(user);
    }
  }

  return users;
}

/**
 * Gets a random TransUnion user record from the CSV file
 * @param csvPath - Optional path to the CSV file (defaults to test-data/transunion-users.csv)
 * @returns A random TransUnion user record
 * @throws Error if the CSV file cannot be read or parsed
 */
export function getRandomTransUnionUser(
  csvPath?: string
): TransUnionUser {
  const users = readTransUnionCsv(csvPath);

  if (users.length === 0) {
    throw new Error("No valid user records found in CSV file");
  }

  const randomIndex = Math.floor(Math.random() * users.length);
  return users[randomIndex];
}

/**
 * Gets all TransUnion user records from the CSV file
 * @param csvPath - Optional path to the CSV file (defaults to test-data/transunion-users.csv)
 * @returns Array of all TransUnion user records
 */
export function getAllTransUnionUsers(csvPath?: string): TransUnionUser[] {
  return readTransUnionCsv(csvPath);
}
