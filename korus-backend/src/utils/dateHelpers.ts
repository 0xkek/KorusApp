/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Get Monday and Sunday dates for a given date's week
 */
export function getWeekDates(date: Date): { weekStart: Date; weekEnd: Date; friday: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  const friday = new Date(weekStart)
  friday.setDate(weekStart.getDate() + 4) // Friday is 4 days after Monday
  friday.setHours(12, 0, 0, 0) // Noon on Friday
  
  return { weekStart, weekEnd, friday }
}

/**
 * Check if a date is Friday
 */
export function isFriday(date: Date): boolean {
  return date.getDay() === 5
}

/**
 * Get next Friday from a given date
 */
export function getNextFriday(date: Date): Date {
  const d = new Date(date)
  const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntilFriday)
  d.setHours(12, 0, 0, 0) // Noon on Friday
  return d
}