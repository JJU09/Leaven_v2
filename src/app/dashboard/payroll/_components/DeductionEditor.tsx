import { useState } from "react";
import { DeductionResult, DeductionOverride } from "@/features/payroll/types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { applyOverrides } from "../_utils/deductionCalculator";

interface DeductionEditorProps {
  baseDeductions: DeductionResult;
  currentDeductions: DeductionResult;
  overrides: DeductionOverride[];
  isLocked: boolean;
  onOverrideSubmit: (override: Omit<DeductionOverride, 'overriddenBy' | 'overriddenAt'>) => void;
}

export function DeductionEditor({
  baseDeductions,
  currentDeductions,
  overrides,
  isLocked,
  onOverrideSubmit,
}: DeductionEditorProps) {
  const [editingField, setEditingField] = useState<keyof Omit<DeductionResult, 'totalDeduction' | 'netPay'> | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const safeOverrides = overrides || [];

  // 프리뷰 계산용
  const previewDeductions = editingField ? applyOverrides(baseDeductions, [
    ...safeOverrides.filter(o => o.field !== editingField),
    {
      field: editingField,
      originalValue: baseDeductions[editingField],
      overriddenValue: parseInt(editValue || "0", 10),
      reason: reason || "미리보기",
      overriddenBy: "preview",
      overriddenAt: new Date().toISOString(),
    }
  ]) : currentDeductions;

  const handleEditClick = (field: keyof Omit<DeductionResult, 'totalDeduction' | 'netPay'>, value: number) => {
    if (isLocked) return;
    setEditingField(field);
    setEditValue(value.toString());
    setReason("");
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue("");
    setReason("");
  };

  const handleSave = () => {
    if (!editingField || !editValue || reason.length < 5) return;
    
    const overriddenValue = parseInt(editValue, 10);
    if (isNaN(overriddenValue)) return;

    onOverrideSubmit({
      field: editingField,
      originalValue: baseDeductions[editingField],
      overriddenValue,
      reason,
    });

    handleCancel();
  };

  const fields: { key: keyof Omit<DeductionResult, 'totalDeduction' | 'netPay'>, label: string }[] = [
    { key: "nationalPension", label: "국민연금" },
    { key: "healthInsurance", label: "건강보험" },
    { key: "longTermCare", label: "장기요양보험" },
    { key: "employmentInsurance", label: "고용보험" },
    { key: "incomeTax", label: "소득세" },
    { key: "localIncomeTax", label: "지방소득세" },
  ];

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-white text-sm">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {fields.map(({ key, label }) => {
          const isEditing = editingField === key;
          const hasOverride = safeOverrides.some(o => o.field === key);
          const value = previewDeductions[key];
          const original = baseDeductions[key];

          return (
            <div key={key} className="col-span-2 sm:col-span-1">
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-slate-600">{label}</Label>
                  {!isLocked && !isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-primary"
                      onClick={() => handleEditClick(key, currentDeductions[key])}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="금액 입력"
                      className="h-8"
                    />
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="수정 사유 (5자 이상 필수)"
                      className="min-h-[60px] text-xs resize-none"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={handleCancel} className="h-7 text-xs">
                        <X className="h-3 w-3 mr-1" /> 취소
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSave} 
                        disabled={reason.length < 5 || editValue === ""}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" /> 저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className={`font-semibold ${hasOverride ? 'text-blue-600' : ''}`}>
                        {formatCurrency(value)}
                      </span>
                      {hasOverride && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(original)}
                        </span>
                      )}
                    </div>
                    {hasOverride && (
                      <span className="text-xs text-blue-500 mt-1 line-clamp-1 flex items-center">
                        <RotateCcw className="h-3 w-3 mr-1 inline" /> 
                        수동 보정됨
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t flex justify-between items-center bg-slate-50 p-3 rounded-md">
        <span className="font-semibold">공제 합계</span>
        <div className="text-right flex flex-col">
          <span className="text-lg font-bold text-destructive">
            {formatCurrency(previewDeductions.totalDeduction)}
          </span>
          {previewDeductions.totalDeduction !== baseDeductions.totalDeduction && (
            <span className="text-xs text-slate-400 line-through">
              기존: {formatCurrency(baseDeductions.totalDeduction)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}