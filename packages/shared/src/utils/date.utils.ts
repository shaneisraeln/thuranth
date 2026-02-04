/**
 * Check if a date is within SLA deadline with safety margin
 * @param deadline SLA deadline
 * @param safetyMarginMinutes Safety margin in minutes
 * @returns true if within safe deadline
 */
export function isWithinSLADeadline(deadline: Date, safetyMarginMinutes: number = 30): boolean {
  const now = new Date();
  const safeDeadline = new Date(deadline.getTime() - (safetyMarginMinutes * 60 * 1000));
  return now <= safeDeadline;
}

/**
 * Calculate time remaining until deadline
 * @param deadline Target deadline
 * @returns Minutes remaining (negative if overdue)
 */
export function getTimeRemainingMinutes(deadline: Date): number {
  const now = new Date();
  return Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60));
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + (minutes * 60 * 1000));
}

/**
 * Format date for display
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}