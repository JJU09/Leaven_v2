import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdatePayrollDeduction } from "../_hooks/usePayrollMutations";
import { calculateTotalDeduction, calculateNetPay } from "../_utils/deductionCalculator";

interface DeductionEditorProps {
  storeId: string;
  year: number;
  month: number;
  recordId: string;
  grossPay: number;
  initialDeductions: {
    income_tax: number;
    local_income_tax: number;
    national_pension: number;
    health_insurance: number;
    employment_insurance: number;
    long_term_care: number;
  };
  disabled?: boolean;
  onChange?: (updated: {
    deductions: any;
    total_deduction: number;
    net_pay: number;
  }) => void;
}

export function DeductionEditor({
  storeId,
  year,
  month,
  recordId,
  grossPay,
  initialDeductions,
  disabled = false,
  onChange,
}: DeductionEditorProps) {
  const [deductions, setDeductions] = useState(initialDeductions);
  const updateMutation = useUpdatePayrollDeduction(storeId, year, month);

  useEffect(() => {
    setDeductions(initialDeductions);
  }, [initialDeductions]);

  const handleChange = (field: keyof typeof deductions, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value.replace(/,/g, ""), 10);
    if (isNaN(numValue)) return;

    const newDeductions = { ...deductions, [field]: numValue };
    setDeductions(newDeductions);

    const totalDeduction = calculateTotalDeduction(newDeductions);
    const netPay = calculateNetPay(grossPay, totalDeduction);

    // 부모 컴포넌트에 즉시 변경 알림
    if (onChange) {
      onChange({ deductions: newDeductions, total_deduction: totalDeduction, net_pay: netPay });
    }

    // Debounce mutation
    const timeoutId = setTimeout(() => {
      updateMutation.mutate({
        id: recordId,
        deductions: newDeductions,
        total_deduction: totalDeduction,
        net_pay: netPay,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const fields = [
    { key: "income_tax", label: "소득세" },
    { key: "local_income_tax", label: "지방소득세" },
    { key: "national_pension", label: "국민연금" },
    { key: "health_insurance", label: "건강보험" },
    { key: "employment_insurance", label: "고용보험" },
    { key: "long_term_care", label: "장기요양보험" },
  ] as const;

  return (
    <div className="grid gap-3">
      {fields.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={key} className="text-muted-foreground w-24">
            {label}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={key}
              type="text"
              value={deductions[key] === 0 ? "" : deductions[key].toLocaleString("ko-KR")}
              onChange={(e) => handleChange(key, e.target.value)}
              disabled={disabled}
              className="w-32 text-right h-8"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">원</span>
          </div>
        </div>
      ))}
    </div>
  );
}