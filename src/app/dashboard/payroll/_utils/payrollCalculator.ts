import { WageType } from "@/features/payroll/types";

interface CalculateBasePayParams {
  wageType: WageType;
  workDays: number;
  workHours: number;
  baseHourlyWage: number;
  baseDailyWage: number;
  baseMonthlyWage: number;
  baseYearlyWage: number;
}

export function calculateBasePay(params: CalculateBasePayParams): number {
  switch (params.wageType) {
    case "hourly":
      return Math.round(params.workHours * params.baseHourlyWage);
    case "daily":
      return Math.round(params.workDays * params.baseDailyWage);
    case "monthly":
      return params.baseMonthlyWage;
    case "yearly":
      return Math.round(params.baseYearlyWage / 12);
    default:
      return 0;
  }
}

interface CalculateOvertimeParams {
  wageType: WageType;
  overtimeHours: number;
  baseHourlyWage: number;
}

export function calculateOvertimePay(params: CalculateOvertimeParams): number {
  if (params.baseHourlyWage <= 0 || params.overtimeHours <= 0) return 0;

  // 시급/일급의 경우: 연장시간 * 시급 * 1.5
  // 월급/연봉의 경우: 포괄임금제 등 다양한 케이스가 있으나 기획서에 따라 시급 기반 1.5배로 동일하게 처리
  return Math.round(params.overtimeHours * params.baseHourlyWage * 1.5);
}

export function calculateWeeklyHolidayPay(
  qualifiedWeeks: number,
  baseHourlyWage: number
): number {
  if (baseHourlyWage <= 0 || qualifiedWeeks <= 0) return 0;
  // 주휴수당 = 주 15시간 이상 충족한 주 수 × 시급 × 8시간
  return Math.round(qualifiedWeeks * baseHourlyWage * 8);
}