import { UseFormReturn } from 'react-hook-form';
import { TaskFormValues } from '../_schema/task.schema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Paperclip, UploadCloud, X, FileText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface AttachmentSectionProps {
  form: UseFormReturn<TaskFormValues>;
  storeId: string | null;
}

// Dummy type for local state until uploaded
type LocalFile = {
  id: string; // temp id or actual attachmentId
  name: string;
  size: number;
  type: string;
  isUploading: boolean;
};

export function AttachmentSection({ form, storeId }: AttachmentSectionProps) {
  const [files, setFiles] = useState<LocalFile[]>(() => {
    const existingIds = form.getValues('attachmentIds') || [];
    return existingIds.map(id => ({
      id,
      name: id.split('/').pop() || '첨부파일',
      size: 0,
      type: id.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/jpeg' : 'application/octet-stream',
      isUploading: false
    }));
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    return <Paperclip className="w-4 h-4 text-slate-500" />;
  };

  const supabase = createClient();

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (!storeId) {
      toast.error('매장 정보를 확인할 수 없습니다. 다시 시도해주세요.');
      return;
    }

    const currentAttachments = form.getValues('attachmentIds') || [];
    if (currentAttachments.length + selectedFiles.length > 5) {
      toast.error('첨부파일은 최대 5개까지 업로드할 수 있습니다.');
      return;
    }

    const filesToUpload = Array.from(selectedFiles);
    const newLocalFiles: LocalFile[] = filesToUpload.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      isUploading: true
    }));

    setFiles(prev => [...prev, ...newLocalFiles]);

    // Actual upload logic
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const localFile = newLocalFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}/tasks/${localFile.id}.${fileExt}`;

      try {
        const { data, error } = await supabase.storage
          .from('store_documents')
          .upload(fileName, file);

        if (error) {
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('store_documents')
          .getPublicUrl(fileName);

        // Update local state to remove isUploading
        setFiles(prev => prev.map(f => f.id === localFile.id ? { ...f, id: publicUrl, isUploading: false } : f));
        
        // Add publicUrl to form attachmentIds
        const currentIds = form.getValues('attachmentIds') || [];
        form.setValue('attachmentIds', [...currentIds, publicUrl]);

      } catch (err: any) {
        console.error('File upload error:', err);
        toast.error(`'${file.name}' 업로드 실패: ${err.message || '알 수 없는 오류'}`);
        // Remove failed file from local state
        setFiles(prev => prev.filter(f => f.id !== localFile.id));
      }
    }
  };

  const handleRemove = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    const currentIds = form.getValues('attachmentIds') || [];
    form.setValue('attachmentIds', currentIds.filter(id => id !== fileId));
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">첨부파일</h2>
        <span className="text-sm text-slate-500">{files.length}/5</span>
      </div>
      
      <FormField
        control={form.control}
        name="attachmentIds"
        render={() => (
          <FormItem>
            <FormControl>
              <div className="flex flex-col gap-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-center",
                    isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50",
                    files.length >= 5 && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                  onDragOver={(e) => { e.preventDefault(); if (files.length < 5) setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (files.length < 5) handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => {
                    if (files.length < 5) fileInputRef.current?.click();
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept=".png,.jpg,.jpeg,.pdf,.xlsx,.xls"
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={files.length >= 5}
                  />
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <UploadCloud className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    클릭하거나 파일을 이곳으로 드래그하세요
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, PDF, XLSX (최대 10MB)
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {files.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {getFileIcon(file.type)}
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                            <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          {file.isUploading ? (
                            <span className="text-xs font-medium text-blue-500">업로드 중...</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemove(file.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}