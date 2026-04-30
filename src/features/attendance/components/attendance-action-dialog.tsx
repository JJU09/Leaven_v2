import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { updateAttendanceDirectly } from '@/features/attendance/actions'

interface AttendanceActionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  selectedDate: string
  staff: any
  attendance: any
  actionType: 'clock_in' | 'clock_out' | 'edit'
  onSuccess: () => void
}

export function AttendanceActionDialog({
  isOpen,
  onOpenChange,
  storeId,
  selectedDate,
  staff,
  attendance,
  actionType,
  onSuccess
}: AttendanceActionDialogProps) {
  const [inDate, setInDate] = useState('')
  const [inTime, setInTime] = useState('')
  const [outDate, setOutDate] = useState('')
  const [outTime, setOutTime] = useState('')
  const [loading, setLoading] = useState(false)

  const name = staff?.name || staff?.profile?.full_name || '직원'

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const nowDateStr = format(now, 'yyyy-MM-dd')
      const nowTimeStr = format(now, 'HH:mm')

      const existInDate = attendance?.clock_in_time ? format(new Date(attendance.clock_in_time), 'yyyy-MM-dd') : selectedDate
      const existInTime = attendance?.clock_in_time ? format(new Date(attendance.clock_in_time), 'HH:mm') : ''
      const existOutDate = attendance?.clock_out_time ? format(new Date(attendance.clock_out_time), 'yyyy-MM-dd') : selectedDate
      const existOutTime = attendance?.clock_out_time ? format(new Date(attendance.clock_out_time), 'HH:mm') : ''

      if (actionType === 'clock_in') {
        setInDate(selectedDate)
        setInTime(nowTimeStr)
        setOutDate('')
        setOutTime('')
      } else if (actionType === 'clock_out') {
        setInDate(existInDate)
        setInTime(existInTime)
        setOutDate(nowDateStr)
        setOutTime(nowTimeStr)
      } else {
        // edit
        setInDate(existInDate)
        setInTime(existInTime)
        setOutDate(existOutDate)
        setOutTime(existOutTime)
      }
    } else {
      setInDate('')
      setInTime('')
      setOutDate('')
      setOutTime('')
    }
  }, [isOpen, attendance, actionType, selectedDate])

  const handleSubmit = async () => {
    if ((!inDate || !inTime) && (!outDate || !outTime)) {
      toast.error('출근 또는 퇴근 일시를 정확히 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      let clockInISO = null
      let clockOutISO = null

      if (inDate && inTime) {
        const d = new Date(`${inDate}T${inTime}:00`)
        clockInISO = d.toISOString()
      }
      if (outDate && outTime) {
        const d = new Date(`${outDate}T${outTime}:00`)
        clockOutISO = d.toISOString()
      }

      if (clockInISO && clockOutISO && new Date(clockOutISO) < new Date(clockInISO)) {
        toast.error('퇴근 시간은 출근 시간 이후여야 합니다.')
        setLoading(false)
        return
      }

      const res = await updateAttendanceDirectly(
        storeId,
        staff.id,
        selectedDate,
        clockInISO,
        clockOutISO,
        attendance?.id
      )

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('출퇴근 기록이 저장되었습니다.')
        onSuccess()
        onOpenChange(false)
      }
    } catch (error) {
      console.error(error)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (actionType) {
      case 'clock_in': return '출근 처리'
      case 'clock_out': return '퇴근 처리'
      case 'edit': return '출퇴근 시간 수정'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{name} - {getTitle()}</DialogTitle>
          <DialogDescription>
            {format(new Date(selectedDate), 'yyyy년 MM월 dd일')}의 기록을 {actionType === 'edit' ? '수정' : '입력'}합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">출근 일시</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={inDate}
                onChange={(e) => setInDate(e.target.value)}
                disabled={actionType === 'clock_out'}
                className="flex-1"
              />
              <Input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                disabled={actionType === 'clock_out'}
                className="w-32"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-semibold">퇴근 일시</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={outDate}
                onChange={(e) => setOutDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}