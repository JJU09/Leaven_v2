import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { PayrollRecordWithStaff } from '../_hooks/usePayroll';
import { format } from 'date-fns';

// 한글 폰트 등록
// CORS 문제가 없는 원격 ttf 폰트 링크 사용 (Fontsource Noto Sans KR)
ReactPDF.Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.12/files/noto-sans-kr-korean-400-normal.woff', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.12/files/noto-sans-kr-korean-700-normal.woff', fontWeight: 'bold' }
  ]
});

const styles = ReactPDF.StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'NotoSansKR',
    fontSize: 9,
    color: '#333',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 20,
    alignItems: 'center',
  },
  rowNoBorder: {
    flexDirection: 'row',
    minHeight: 20,
    alignItems: 'center',
  },
  label: {
    width: '30%',
    color: '#666',
  },
  value: {
    width: '70%',
    fontWeight: 'bold',
  },
  table: {
    flexDirection: 'row',
    gap: 15,
  },
  tableCol: {
    flex: 1,
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    padding: 6,
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  calculationText: {
    fontSize: 7,
    color: '#888',
    marginTop: 2,
  },
  totalSection: {
    marginTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#111',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    textAlign: 'center',
    color: '#666',
  },
  signature: {
    marginTop: 25,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: 'bold',
  }
});

interface PayrollPDFDocumentProps {
  record: PayrollRecordWithStaff;
  storeName: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
};

export function PayrollPDFDocument({ record, storeName }: PayrollPDFDocumentProps) {
  const profile = record.store_members?.profiles;
  const manualName = record.store_members?.name;
  const displayName = profile?.full_name || manualName || "알 수 없음";
  const roleName = record.store_members?.store_roles?.name || "-";
  const wageType = record.store_members?.wage_type || 'hourly';

  // 산출식 생성 헬퍼
  const getBasePayCalculation = () => {
    const hourly = record.store_members?.base_hourly_wage || 0;
    const daily = record.store_members?.base_daily_wage || 0;

    if (wageType === 'hourly') {
      return `(시급 ${formatCurrency(hourly)} × ${record.work_hours}시간)`;
    } else if (wageType === 'daily') {
      return `(일급 ${formatCurrency(daily)} × ${record.work_days}일)`;
    }
    return '';
  };

  const getOvertimeCalculation = () => {
    const hourly = record.store_members?.base_hourly_wage || 0;
    if (hourly > 0 && record.overtime_hours > 0) {
      return `(시급 ${formatCurrency(hourly)} × 1.5배 × ${record.overtime_hours}시간)`;
    }
    return '';
  };

  const getWeeklyHolidayCalculation = () => {
    // 주휴수당 산출식 예시 (단순화: 1일 소정근로시간 × 시급)
    // 현재 레코드에는 총 주휴수당액만 있으므로, 역산하거나 설명으로 대체
    if (record.weekly_holiday_pay > 0) {
      return `(주휴수당 발생분에 따른 지급액)`;
    }
    return '';
  };

  return (
    <ReactPDF.Document>
      <ReactPDF.Page size="A4" style={styles.page}>
        <ReactPDF.View style={styles.header}>
          <ReactPDF.Text style={styles.title}>급여 명세서</ReactPDF.Text>
          <ReactPDF.Text style={styles.subtitle}>{record.period_year}년 {record.period_month}월</ReactPDF.Text>
        </ReactPDF.View>

        <ReactPDF.View style={styles.table}>
          <ReactPDF.View style={styles.tableCol}>
            <ReactPDF.Text style={styles.sectionTitle}>근로자 정보</ReactPDF.Text>
            <ReactPDF.View style={styles.row}>
              <ReactPDF.Text style={styles.label}>성명</ReactPDF.Text>
              <ReactPDF.Text style={styles.value}>{displayName}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.row}>
              <ReactPDF.Text style={styles.label}>직급/역할</ReactPDF.Text>
              <ReactPDF.Text style={styles.value}>{roleName}</ReactPDF.Text>
            </ReactPDF.View>
          </ReactPDF.View>
          <ReactPDF.View style={styles.tableCol}>
            <ReactPDF.Text style={styles.sectionTitle}>사업장 정보</ReactPDF.Text>
            <ReactPDF.View style={styles.row}>
              <ReactPDF.Text style={styles.label}>사업장명</ReactPDF.Text>
              <ReactPDF.Text style={styles.value}>{storeName}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.row}>
              <ReactPDF.Text style={styles.label}>발급일자</ReactPDF.Text>
              <ReactPDF.Text style={styles.value}>{format(new Date(), 'yyyy년 MM월 dd일')}</ReactPDF.Text>
            </ReactPDF.View>
          </ReactPDF.View>
        </ReactPDF.View>

        <ReactPDF.View style={{ marginTop: 15, marginBottom: 15 }}>
          <ReactPDF.Text style={styles.sectionTitle}>근로 내역</ReactPDF.Text>
          <ReactPDF.View style={{ flexDirection: 'row', backgroundColor: '#f8f9fa', padding: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ddd' }}>
            <ReactPDF.Text style={{ flex: 1, fontWeight: 'bold' }}>근무일수</ReactPDF.Text>
            <ReactPDF.Text style={{ flex: 1, fontWeight: 'bold' }}>총 근무시간</ReactPDF.Text>
            <ReactPDF.Text style={{ flex: 1, fontWeight: 'bold' }}>연장근무시간</ReactPDF.Text>
          </ReactPDF.View>
          <ReactPDF.View style={{ flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderColor: '#eee' }}>
            <ReactPDF.Text style={{ flex: 1 }}>{record.work_days}일</ReactPDF.Text>
            <ReactPDF.Text style={{ flex: 1 }}>{record.work_hours}시간</ReactPDF.Text>
            <ReactPDF.Text style={{ flex: 1 }}>{record.overtime_hours}시간</ReactPDF.Text>
          </ReactPDF.View>
        </ReactPDF.View>

        <ReactPDF.View style={styles.table}>
          <ReactPDF.View style={styles.tableCol}>
            <ReactPDF.Text style={styles.sectionTitle}>지급 내역</ReactPDF.Text>
            <ReactPDF.View style={styles.tableHeader}>
              <ReactPDF.Text>항목 및 산출식</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.View>
                <ReactPDF.Text>기본급</ReactPDF.Text>
                {getBasePayCalculation() && <ReactPDF.Text style={styles.calculationText}>{getBasePayCalculation()}</ReactPDF.Text>}
              </ReactPDF.View>
              <ReactPDF.Text>{formatCurrency(record.base_pay)}</ReactPDF.Text>
            </ReactPDF.View>
            {record.overtime_pay > 0 && (
              <ReactPDF.View style={styles.tableRow}>
                <ReactPDF.View>
                  <ReactPDF.Text>연장근무수당</ReactPDF.Text>
                  {getOvertimeCalculation() && <ReactPDF.Text style={styles.calculationText}>{getOvertimeCalculation()}</ReactPDF.Text>}
                </ReactPDF.View>
                <ReactPDF.Text>{formatCurrency(record.overtime_pay)}</ReactPDF.Text>
              </ReactPDF.View>
            )}
            {record.weekly_holiday_pay > 0 && (
              <ReactPDF.View style={styles.tableRow}>
                <ReactPDF.View>
                  <ReactPDF.Text>주휴수당</ReactPDF.Text>
                  {getWeeklyHolidayCalculation() && <ReactPDF.Text style={styles.calculationText}>{getWeeklyHolidayCalculation()}</ReactPDF.Text>}
                </ReactPDF.View>
                <ReactPDF.Text>{formatCurrency(record.weekly_holiday_pay)}</ReactPDF.Text>
              </ReactPDF.View>
            )}
            <ReactPDF.View style={[styles.tableRow, { backgroundColor: '#f8f9fa', fontWeight: 'bold' }]}>
              <ReactPDF.Text>지급액 계</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.gross_pay)}</ReactPDF.Text>
            </ReactPDF.View>
          </ReactPDF.View>

          <ReactPDF.View style={styles.tableCol}>
            <ReactPDF.Text style={styles.sectionTitle}>공제 내역</ReactPDF.Text>
            <ReactPDF.View style={styles.tableHeader}>
              <ReactPDF.Text>항목 및 금액</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.Text>소득세</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.income_tax)}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.Text>지방소득세</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.local_income_tax)}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.Text>국민연금</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.national_pension)}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.Text>건강보험</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.health_insurance)}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.Text>고용보험</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.employment_insurance)}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.Text>장기요양보험</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.long_term_care)}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={[styles.tableRow, { backgroundColor: '#f8f9fa', fontWeight: 'bold' }]}>
              <ReactPDF.Text>공제액 계</ReactPDF.Text>
              <ReactPDF.Text>{formatCurrency(record.total_deduction)}</ReactPDF.Text>
            </ReactPDF.View>
          </ReactPDF.View>
        </ReactPDF.View>

        <ReactPDF.View style={styles.totalSection}>
          <ReactPDF.Text style={styles.totalLabel}>실수령액 (지급액 계 - 공제액 계)</ReactPDF.Text>
          <ReactPDF.Text style={styles.totalValue}>{formatCurrency(record.net_pay)}</ReactPDF.Text>
        </ReactPDF.View>

        <ReactPDF.View style={styles.footer}>
          <ReactPDF.Text>근로기준법 제48조 및 동법 시행령 제27조의2에 따라 위와 같이 임금명세서를 교부합니다.</ReactPDF.Text>
          <ReactPDF.Text style={{ marginTop: 10 }}>{format(new Date(), 'yyyy년 MM월 dd일')}</ReactPDF.Text>
          <ReactPDF.Text style={styles.signature}>{storeName} (서명 또는 인)</ReactPDF.Text>
        </ReactPDF.View>
      </ReactPDF.Page>
    </ReactPDF.Document>
  );
}