export interface DeductionItems {
  income_tax: number;
  local_income_tax: number;
  national_pension: number;
  health_insurance: number;
  employment_insurance: number;
  long_term_care: number;
}

export function calculateTotalDeduction(items: DeductionItems): number {
  return (
    (items.income_tax || 0) +
    (items.local_income_tax || 0) +
    (items.national_pension || 0) +
    (items.health_insurance || 0) +
    (items.employment_insurance || 0) +
    (items.long_term_care || 0)
  );
}

export function calculateNetPay(grossPay: number, totalDeduction: number): number {
  return grossPay - totalDeduction;
}