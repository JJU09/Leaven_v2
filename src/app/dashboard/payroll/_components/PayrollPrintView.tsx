import { formatCurrency } from "@/lib/formatters";
import { PayrollRecordWithStaff } from "../_hooks/usePayroll";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PayrollPrintViewProps {
  records: PayrollRecordWithStaff[];
  storeName: string;
}

export function PayrollPrintView({ records, storeName }: PayrollPrintViewProps) {
  if (records.length === 0) return null;

  return (
    <div className="hidden print:block print:w-full">
      {records.map((record, index) => {
        const profile = record.store_members?.profiles;
        const roleName = record.store_members?.store_roles?.name;

        return (
          <div
            key={record.id}
            className="print:break-after-page mb-8 p-8 border"
            style={{ pageBreakAfter: index === records.length - 1 ? "auto" : "always" }}
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">급여 명세서</h1>
              <p className="text-lg">
                {record.period_year}년 {record.period_month}월
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-8">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-4">근로자 정보</h2>
                <div className="grid grid-cols-3 gap-2 text-sm border p-4 bg-gray-50">
                  <div className="font-medium text-gray-500">성명</div>
                  <div className="col-span-2">{profile?.full_name}</div>
                  <div className="font-medium text-gray-500">직급</div>
                  <div className="col-span-2">{roleName || "-"}</div>
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-4">사업장 정보</h2>
                <div className="grid grid-cols-3 gap-2 text-sm border p-4 bg-gray-50">
                  <div className="font-medium text-gray-500">사업장명</div>
                  <div className="col-span-2">{storeName}</div>
                  <div className="font-medium text-gray-500">발급일자</div>
                  <div className="col-span-2">{format(new Date(), "yyyy년 MM월 dd일")}</div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 mb-4">근로 내역</h2>
              <table className="w-full text-sm border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">근무일수</th>
                    <th className="border border-gray-200 p-2 text-left">총 근무시간</th>
                    <th className="border border-gray-200 p-2 text-left">연장근무시간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 p-2">{record.work_days}일</td>
                    <td className="border border-gray-200 p-2">{record.work_hours}시간</td>
                    <td className="border border-gray-200 p-2">{record.overtime_hours}시간</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-4">지급 내역</h2>
                <table className="w-full text-sm border-collapse border border-gray-200">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">기본급</td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.base_pay)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">
                        연장근무수당
                      </td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.overtime_pay)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">
                        주휴수당
                      </td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.weekly_holiday_pay)}
                      </td>
                    </tr>
                    <tr className="font-bold">
                      <td className="border border-gray-200 p-2 bg-gray-100">지급액 계</td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.gross_pay)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-4">공제 내역</h2>
                <table className="w-full text-sm border-collapse border border-gray-200">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">소득세</td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.income_tax)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">
                        지방소득세
                      </td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.local_income_tax)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">
                        국민연금
                      </td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.national_pension)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">
                        건강보험
                      </td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.health_insurance)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">
                        고용보험
                      </td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.employment_insurance)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-gray-50 font-medium">
                        장기요양보험
                      </td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.long_term_care)}
                      </td>
                    </tr>
                    <tr className="font-bold">
                      <td className="border border-gray-200 p-2 bg-gray-100">공제액 계</td>
                      <td className="border border-gray-200 p-2 text-right">
                        {formatCurrency(record.total_deduction)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t-2 border-black pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <div>실수령액</div>
                <div>{formatCurrency(record.net_pay)}</div>
              </div>
            </div>
            
            <div className="mt-12 text-center text-gray-500 text-sm">
              <p>위와 같이 급여를 명세함.</p>
              <p className="mt-4">{format(new Date(), "yyyy년 MM월 dd일")}</p>
              <p className="mt-8 font-semibold">{storeName}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}