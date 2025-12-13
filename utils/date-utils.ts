/**
 * Returns the last day of the current month in ISO format (yyyy-MM-dd)
 * @returns The last day of the current month as a string in format "yyyy-MM-dd"
 */
export function getLastDayOfCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Get the last day of the current month by going to day 0 of next month
  const lastDay = new Date(year, month + 1, 0);
  
  // Format as yyyy-MM-dd
  const yearStr = lastDay.getFullYear().toString();
  const monthStr = (lastDay.getMonth() + 1).toString().padStart(2, "0");
  const dayStr = lastDay.getDate().toString().padStart(2, "0");
  
  return `${yearStr}-${monthStr}-${dayStr}`;
}
