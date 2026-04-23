import { startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'

export const getToday = () => startOfDay(new Date())

export const getThisWeekMonday = () => startOfWeek(getToday(), { weekStartsOn: 1 })

export const getThisWeekFriday = () => {
  const end = endOfWeek(getToday(), { weekStartsOn: 1 })
  const friday = new Date(end)
  friday.setDate(friday.getDate() - 2)
  return startOfDay(friday)
}

export const getStartOfMonth = () => startOfMonth(getToday())
export const getEndOfMonth = () => endOfMonth(getToday())

export const getDday = (targetDate: string | Date | null | undefined): number | null => {
  if (!targetDate) return null
  return differenceInDays(startOfDay(new Date(targetDate)), getToday())
}