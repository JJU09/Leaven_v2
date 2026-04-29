'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VendorContractUploadProps {
  currentUrl: string | null | undefined
  onUpload: (url: string | null) => void
  storeId: string
}

export function VendorContractUpload({ currentUrl, onUpload, storeId }: VendorContractUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fileName = currentUrl ? currentUrl.split('/').pop() : null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setIsUploading(true)
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const timestamp = new Date().getTime()
    const safeName = file.name.split('.')[0].replace(/[^a-zA-Z0-9-_]/g, '')
    const filePath = `vendor-contracts/${storeId}/${timestamp}_${safeName || 'contract'}.${fileExt}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('store_documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('store_documents')
        .getPublicUrl(filePath)

      onUpload(publicUrl)
      toast.success('계약서가 업로드되었습니다.')
    } catch (error: any) {
      console.error(error)
      toast.error('업로드 실패', { description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    onUpload(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      <div 
        className={cn(
          "border border-dashed rounded-xl p-3 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 min-h-[100px]",
          fileName ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20"
        )}
        onClick={() => !isUploading && !fileName && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm font-semibold text-slate-500">업로드 중...</p>
          </div>
        ) : fileName ? (
          <div className="flex items-center justify-between w-full gap-2 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate mb-0.5">{fileName}</span>
                <span className="text-xs text-primary font-medium">계약서 파일 등록됨</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-slate-100 p-2 rounded-full mb-1">
              <Upload className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-bold text-slate-600 mb-1">계약서 파일 업로드</p>
              <p className="text-xs text-slate-400 font-medium">클릭하여 파일 선택 (PDF, 이미지, 문서)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}