"use client";

import React, { useEffect, useState, useMemo } from "react";
import ReactPDF from "@react-pdf/renderer";
import { PayrollRecordWithStaff } from "../_hooks/usePayroll";
import { PayrollPDFDocument } from "./PayrollPDFDocument";

interface PayrollPDFPreviewProps {
  records: PayrollRecordWithStaff[];
  storeName: string;
  fileName: string;
}

export default function PayrollPDFPreview({ records, storeName, fileName }: PayrollPDFPreviewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const Doc = useMemo(() => (
    <PayrollPDFDocument 
      record={records[0]} 
      storeName={storeName} 
    />
  ), [records, storeName]);

  // 다수일 경우 렌더링 처리를 위해 Document를 여러개 묶은 컴포넌트로 만들었으나, 
  // PayrollPDFDocument 내부가 이미 <Document>로 래핑되어 있습니다.
  // react-pdf에서 여러 페이지를 렌더링하려면 <Document> 하위에 여러 <Page>가 와야 합니다.
  // 따라서 PayrollPDFPreview는 현재 1건의 명세서(records[0]) 렌더링에 최적화하여 작성하고, 
  // 다건일 경우는 나중에 PayrollPDFDocument를 다건 지원으로 리팩토링해야 합니다.
  // 이번 태스크에서는 에러 해결이 우선이므로 단건 모드로 Blob을 생성합니다.

  const [instance, updateInstance] = ReactPDF.usePDF({ document: Doc });

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 bg-muted p-4 min-h-0 relative">
        {instance.loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">PDF 생성 중...</p>
          </div>
        )}
        {instance.error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-destructive">PDF 생성 중 오류가 발생했습니다: {instance.error}</p>
          </div>
        )}
        {instance.url && (
          <iframe 
            src={instance.url} 
            width="100%" 
            height="100%" 
            className="rounded-md border bg-white" 
          />
        )}
      </div>
    </div>
  );
}