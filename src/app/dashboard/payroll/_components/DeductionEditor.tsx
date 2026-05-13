import { useState } from "react";
import { DeductionResult, DeductionOverride } from "@/features/payroll/types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, RotateCcw, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
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
      overriddenValue: parseInt(editValue.replace(/,/g, "") || "0", 10),
      reason: reason || "미리보기",
      overriddenBy: "preview",
      overriddenAt: new Date().toISOString(),
    }
  ]) : currentDeductions;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 숫자 이외의 문자(콤마 등) 제거 후 다시 포맷팅
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setEditValue("");
      return;
    }
    // 3자리마다 콤마 찍기
    const formatted = parseInt(rawValue, 10).toLocaleString('ko-KR');
    setEditValue(formatted);
  };

  const handleEditClick = (field: keyof Omit<DeductionResult, 'totalDeduction' | 'netPay'>, value: number) => {
    if (isLocked) return;
    setEditingField(field);
    setEditValue(value.toLocaleString('ko-KR'));
    setReason("");
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue("");
    setReason("");
  };

  const handleSave = () => {
    if (!editingField || !editValue || reason.length < 5) return;
    
    // 콤마 제거 후 숫자로 변환
    const rawNumberString = editValue.replace(/,/g, "");
    const overriddenValue = parseInt(rawNumberString, 10);
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
    <div className="flex flex-col flex-1 h-full w-full">
      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        {fields.map(({ key, label }) => {
          const isEditing = editingField === key;
          const hasOverride = safeOverrides.some(o => o.field === key);
          const value = previewDeductions[key];
          const original = baseDeductions[key];

          return (
            <div key={key} className="col-span-2 sm:col-span-1">
              <div className="flex flex-col rounded-lg border border-slate-200 p-4 bg-white h-full">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  {!isLocked && !isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-slate-600 -mt-1 -mr-1"
                      onClick={() => handleEditClick(key, currentDeductions[key])}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3 mt-3 bg-slate-50/50 p-3 rounded-md border border-slate-100">
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={editValue}
                        onChange={handleValueChange}
                        placeholder="0"
                        className="h-9 pr-7 text-right font-semibold tracking-wide"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">원</span>
                    </div>
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
                  <div className="flex flex-col mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-base font-semibold ${hasOverride ? 'text-blue-600' : ''}`}>
                        {formatCurrency(value)}
                      </span>
                      {hasOverride && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(original)}
                        </span>
                      )}
                    </div>
                  {hasOverride && (
                    <div className="flex items-center mt-1 gap-1">
                      <span className="text-xs text-blue-500 flex items-center">
                        <RotateCcw className="h-3 w-3 mr-1" /> 
                        수동 보정됨
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-blue-600 rounded-full">
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                            <h4 className="font-medium text-sm text-slate-900">{label} 수정 내역</h4>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-4 flex flex-col gap-4">
                            {safeOverrides
                              .filter(o => o.field === key)
                              .sort((a, b) => new Date(b.overriddenAt || 0).getTime() - new Date(a.overriddenAt || 0).getTime())
                              .map((override, idx) => (
                                <div key={idx} className="relative pl-4 border-l-2 border-slate-200 last:border-transparent pb-4 last:pb-0">
                                  <div className="absolute w-2 h-2 bg-blue-500 rounded-full -left-[5px] top-1.5" />
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-slate-500">
                                      {override.overriddenAt ? format(new Date(override.overriddenAt), 'yyyy. MM. dd. HH:mm') : '알 수 없음'}
                                    </span>
                                    <div className="flex items-center gap-2 text-sm mt-0.5">
                                      <span className="text-slate-400 line-through">{formatCurrency(override.originalValue)}</span>
                                      <span className="text-slate-300">→</span>
                                      <span className="font-semibold text-slate-700">{formatCurrency(override.overriddenValue)}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-md mt-1.5 border border-slate-100">
                                      <p className="text-xs text-slate-600 whitespace-pre-wrap">{override.reason}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 flex justify-end">수정자: {override.overriddenBy || '시스템'}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-lg h-[68px]">
        <span className="font-medium text-slate-700">공제 합계</span>
        <div className="text-right flex flex-col items-end justify-center">
          <span className="text-lg font-bold text-destructive">
            {formatCurrency(previewDeductions.totalDeduction)}
          </span>
          {previewDeductions.totalDeduction !== baseDeductions.totalDeduction && (
            <span className="text-xs text-slate-400 line-through mt-0.5">
              기존: {formatCurrency(baseDeductions.totalDeduction)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}