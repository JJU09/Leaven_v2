import { WageType, DeductionResult, DeductionOverride } from "@/features/payroll/types";

// 세율 상수 (법령 변경 시 이곳만 수정)
export const DEDUCTION_RATES = {
  NATIONAL_PENSION: 0.045,
  HEALTH_INSURANCE: 0.03545,
  LONG_TERM_CARE: 0.004591,       // 건강보험료의 12.95% (실제로는 건강보험료 기준)
  EMPLOYMENT_INSURANCE: 0.009,
  SIMPLE_INCOME_TAX: 0.033,       // 비대상자 소득세 3.3% (소득세 3% + 지방소득세 0.3%)
  LOCAL_INCOME_TAX_RATIO: 0.1,    // 지방소득세 = 소득세의 10%
} as const;

export interface DeductionInput {
  wageType: WageType;
  grossPay: number;
  monthlyHours: number;
  dependents?: number;             // 부양가족 수 (간이세액표 적용 시)
}

// 간소화된 소득세 계산 함수 (실제로는 국세청 간이세액표 필요, 여기선 임시 비율 적용)
function calcIncomeTaxByTable(grossPay: number, dependents: number): number {
  // TODO: 실제 간이세액표 로직 구현. 현재는 임시로 3% 적용.
  return Math.round(grossPay * 0.03);
}

export function calculateDeductions(input: DeductionInput): DeductionResult {
  const isInsuranceEligible = input.monthlyHours >= 60;

  if (!isInsuranceEligible) {
    // 단기·비적용자: 소득세 3.3% (소득세 3% + 지방소득세 0.3%)
    const incomeTax = Math.round(input.grossPay * 0.03);
    const localIncomeTax = Math.round(input.grossPay * 0.003);
    const totalDeduction = incomeTax + localIncomeTax;
    
    return {
      nationalPension: 0,
      healthInsurance: 0,
      longTermCare: 0,
      employmentInsurance: 0,
      incomeTax,
      localIncomeTax,
      totalDeduction,
      netPay: input.grossPay - totalDeduction,
    };
  }

  // 4대보험 적용 대상자
  const nationalPension = Math.round(input.grossPay * DEDUCTION_RATES.NATIONAL_PENSION);
  const healthInsurance = Math.round(input.grossPay * DEDUCTION_RATES.HEALTH_INSURANCE);
  const longTermCare = Math.round(healthInsurance * 0.1295);
  const employmentInsurance = Math.round(input.grossPay * DEDUCTION_RATES.EMPLOYMENT_INSURANCE);
  const incomeTax = calcIncomeTaxByTable(input.grossPay, input.dependents ?? 1);
  const localIncomeTax = Math.round(incomeTax * DEDUCTION_RATES.LOCAL_INCOME_TAX_RATIO);
  
  const totalDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax;

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    incomeTax,
    localIncomeTax,
    totalDeduction,
    netPay: input.grossPay - totalDeduction,
  };
}

// 수동 보정값 적용 — DeductionResult에 override를 반영해 재계산
export function applyOverrides(
  base: DeductionResult,
  overrides: DeductionOverride[]
): DeductionResult {
  if (!overrides || overrides.length === 0) return { ...base };

  const result = { ...base };
  for (const override of overrides) {
    result[override.field] = override.overriddenValue;
  }
  
  result.totalDeduction =
    result.nationalPension +
    result.healthInsurance +
    result.longTermCare +
    result.employmentInsurance +
    result.incomeTax +
    result.localIncomeTax;
    
  result.netPay = base.netPay + base.totalDeduction - result.totalDeduction;
  
  return result;
}