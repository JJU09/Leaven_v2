'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, LogIn, LogOut, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { clockIn, clockOut } from "@/features/attendance/actions"
import { toast } from "sonner"
import { format } from "date-fns"

interface ClockInOutCardProps {
  storeId: string
  memberId?: string
}

export function ClockInOutCard({ storeId, memberId }: ClockInOutCardProps) {
  const [attendance, setAttendance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const fetchAttendance = async () => {
    if (!memberId) return
    setIsLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('store_attendance')
      .select('*')
      .eq('store_id', storeId)
      .eq('member_id', memberId)
      .eq('target_date', todayStr)
      .maybeSingle()
    
    if (!error) {
      setAttendance(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchAttendance()
  }, [storeId, memberId, todayStr])

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('브라우저가 위치 정보를 지원하지 않습니다.'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('위치 정보 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'));
          } else {
            reject(new Error('현재 위치를 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.'));
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!memberId) return
    setIsProcessing(true)
    
    try {
      toast.info('위치 정보를 확인 중입니다...', { id: 'location-check' });
      const location = await getCurrentLocation();
      toast.dismiss('location-check');
      
      const result = await clockIn(storeId, memberId, todayStr, undefined, location)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('출근 처리되었습니다.')
        fetchAttendance()
      }
    } catch (err: any) {
      toast.dismiss('location-check');
      toast.error(err.message || '위치 확인 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClockOut = async () => {
    if (!attendance?.id) return
    setIsProcessing(true)
    
    try {
      toast.info('위치 정보를 확인 중입니다...', { id: 'location-check' });
      const location = await getCurrentLocation();
      toast.dismiss('location-check');

      const result = await clockOut(attendance.id, storeId, location)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('퇴근 처리되었습니다.')
        fetchAttendance()
      }
    } catch (err: any) {
      toast.dismiss('location-check');
      toast.error(err.message || '위치 확인 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false)
    }
  }

  if (!memberId || isLoading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex items-center justify-center h-full">
          <div className="animate-pulse flex items-center gap-2 text-primary/60">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">확인 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isClockedIn = !!attendance?.clock_in_time
  const isClockedOut = !!attendance?.clock_out_time

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 md:p-6 flex flex-col justify-center h-full space-y-3">
        <div className="flex items-center justify-between space-y-0">
          <p className="text-sm font-medium text-primary">내 출퇴근</p>
          <Clock className="h-4 w-4 text-primary/70" />
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          {!isClockedIn ? (
            <>
              <div className="text-lg font-bold text-slate-700">출근 전</div>
              <Button 
                onClick={handleClockIn} 
                disabled={isProcessing}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                size="sm"
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    확인 중...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    출근하기
                  </>
                )}
              </Button>
            </>
          ) : !isClockedOut ? (
            <>
              <div className="text-lg font-bold text-blue-600 flex items-center gap-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                근무 중
              </div>
              <Button 
                onClick={handleClockOut} 
                disabled={isProcessing}
                variant="outline"
                className="w-full border-blue-200 hover:bg-blue-50 text-blue-600"
                size="sm"
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    확인 중...
                  </span>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    퇴근하기
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                퇴근 완료
              </div>
              <div className="text-xs text-slate-400 font-medium">
                오늘 근무 수고하셨습니다
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}