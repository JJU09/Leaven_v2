import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface WeeklyReportData {
  id?: string
  store_id: string
  report_type: 'weekly'
  period_key: string
  generated_at?: string
  content: {
    summary: {
      text: string
      insights: { type: 'warning' | 'good' | 'bad' | 'info'; text: string }[]
    }
    staffing: {
      insights: { type: 'warning' | 'good' | 'bad' | 'info'; text: string }[]
      hotDays: string[]
    }
    assetsAndVendors: {
      insights: { type: 'warning' | 'good' | 'bad' | 'info'; text: string }[]
    }
    recommendations: { title: string; description: string }[]
  }
}

export function useWeeklyReport(storeId: string, targetDate: string) {
  const queryClient = useQueryClient()
  const queryKey = ['ai-report', 'weekly', storeId, targetDate]

  const { data, isLoading, isError, refetch } = useQuery<WeeklyReportData>({
    queryKey,
    queryFn: async () => {
      const response = await fetch('/api/ai-report/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, targetDate, forceRefresh: false }),
      })

      if (!response.ok) {
        throw new Error('리포트를 불러오는데 실패했습니다.')
      }

      return response.json()
    },
    staleTime: 1000 * 60 * 60, // 1시간
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai-report/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, targetDate, forceRefresh: true }),
      })

      if (!response.ok) {
        throw new Error('리포트 생성에 실패했습니다.')
      }

      return response.json()
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(queryKey, newData)
      toast.success('주간 AI 리포트가 재생성되었습니다.')
    },
    onError: () => {
      toast.error('리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  })

  return {
    report: data,
    isLoading: isLoading || generateMutation.isPending,
    isGenerating: generateMutation.isPending,
    isError,
    generateReport: () => generateMutation.mutate(),
    refetch
  }
}