'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { updateStore, deleteStore } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from 'sonner'
import { AlertTriangle, Search, MapPin, Save, RotateCcw, Plus, Trash2, Crosshair } from 'lucide-react'
import { ImageUpload } from './image-upload'
import { OpeningHours } from './opening-hours'
import { StoreLocationMap } from './store-location-map'
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/formatters'

const formatBusinessNumber = (value: string) => {
  const v = value.replace(/\D/g, '')
  if (v.length <= 3) return v
  if (v.length <= 5) return `${v.slice(0, 3)}-${v.slice(3)}`
  return `${v.slice(0, 3)}-${v.slice(3, 5)}-${v.slice(5, 10)}`
}

interface StoreSettingsFormProps {
  initialData: {
    id: string
    name: string
    address?: string
    business_number?: string
    description?: string
    owner_name?: string
    store_phone?: string
    zip_code?: string
    address_detail?: string
    image_url?: string
    stamp_image_url?: string
    latitude?: number
    longitude?: number
    auth_radius?: number
    opening_hours?: any
    invite_code?: string
  }
}

export function StoreSettingsForm({ initialData }: StoreSettingsFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteStoreName, setDeleteStoreName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const initialFormState = useMemo(() => {
    return {
      name: initialData.name || '',
      owner_name: initialData.owner_name || '',
      business_number: initialData.business_number || '',
      store_phone: initialData.store_phone || '',
      description: initialData.description || '',
      zip_code: initialData.zip_code || '',
      address: initialData.address || '',
      address_detail: initialData.address_detail || '',
      image_url: initialData.image_url || null,
      stamp_image_url: initialData.stamp_image_url || null,
      latitude: initialData.latitude != null ? String(initialData.latitude) : '',
      longitude: initialData.longitude != null ? String(initialData.longitude) : '',
      auth_radius: initialData.auth_radius != null ? String(initialData.auth_radius) : '200',
      opening_hours: initialData.opening_hours || {},
    }
  }, [initialData])

  const [formData, setFormData] = useState(initialFormState)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setFormData(initialFormState)
  }, [initialFormState])

  useEffect(() => {
    const isChanged = JSON.stringify(formData) !== JSON.stringify(initialFormState)
    setIsDirty(isChanged)
  }, [formData, initialFormState])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      try {
        document.body.removeChild(script)
      } catch (e) {
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    let formattedValue = value
    if (name === 'business_number') {
      formattedValue = formatBusinessNumber(value)
    } else if (name === 'store_phone') {
      formattedValue = formatPhoneNumber(value)
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }))
  }

  const handleAddressSearch = () => {
    if (window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data: any) {
          setFormData(prev => ({
            ...prev,
            address: data.address,
            zip_code: data.zonecode
          }))
          
          // Address to Coord (Optional: if we have Kakao Maps API Key, we can use it here)
          // For now, we'll encourage using the "Current Location" button at the shop.
        }
      }).open()
    } else {
      toast.error('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('이 브라우저에서는 위치 정보를 지원하지 않습니다.')
      return
    }

    toast.promise(
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData(prev => ({
              ...prev,
              latitude: String(position.coords.latitude),
              longitude: String(position.coords.longitude)
            }))
            resolve(position)
          },
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 5000 }
        )
      }),
      {
        loading: '현재 위치를 파악 중입니다...',
        success: '매장 좌표가 현재 위치로 설정되었습니다.',
        error: (err: any) => {
          if (err.code === 1) return '위치 정보 접근 권한이 거부되었습니다.'
          return '위치 정보를 가져오지 못했습니다.'
        }
      }
    )
  }

  const handleReset = () => {
    setFormData(initialFormState)
    toast.info('변경사항이 초기화되었습니다.')
  }

  async function handleSubmit() {
    setIsSaving(true)
    const submitData = new FormData()
    submitData.append('name', formData.name)
    submitData.append('owner_name', formData.owner_name)
    submitData.append('business_number', formData.business_number)
    submitData.append('store_phone', formData.store_phone)
    submitData.append('description', formData.description)
    submitData.append('zip_code', formData.zip_code)
    submitData.append('address', formData.address)
    submitData.append('address_detail', formData.address_detail)
    if (formData.image_url) submitData.append('image_url', formData.image_url)
    if (formData.stamp_image_url) submitData.append('stamp_image_url', formData.stamp_image_url)
    if (formData.latitude) submitData.append('latitude', formData.latitude)
    if (formData.longitude) submitData.append('longitude', formData.longitude)
    if (formData.auth_radius) submitData.append('auth_radius', formData.auth_radius)
    submitData.append('opening_hours', JSON.stringify(formData.opening_hours))

    const result = await updateStore(submitData)
    
    if (result?.error) {
      setError(result.error)
      toast.error("저장 실패", { description: result.error })
    } else {
      setError(null)
      toast.success("저장 완료", { description: "매장 정보가 성공적으로 수정되었습니다." })
      setIsDirty(false) 
    }
    setIsSaving(false)
  }

  async function handleDeleteStore() {
    setIsDeleting(true)
    try {
      const result = await deleteStore(initialData.id)
      if (result?.error) {
        toast.error("매장 삭제 실패", { description: result.error })
        setIsDeleting(false)
      } else {
        toast.success("매장 삭제 완료", { description: "매장이 삭제되었습니다. 홈으로 이동합니다." })
        router.push('/home')
      }
    } catch (e) {
      toast.error("오류 발생", { description: "알 수 없는 오류가 발생했습니다." })
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative">
      <div className="space-y-12 pb-24">
        {/* SECTION: 매장 프로필 & 기본 정보 */}
        <section>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 shrink-0">
              <h2 className="text-lg font-bold tracking-tight">매장 기본 정보</h2>
              <p className="text-sm text-muted-foreground mt-2">
                매장의 대표 이미지와 기본 정보를 설정합니다. <br/>
                직인(도장)은 근로계약서 등에 자동으로 사용됩니다.
              </p>
            </div>
            
            <div className="w-full md:w-2/3 max-w-2xl space-y-8">
              <div className="space-y-4">
                <Label className="text-base font-semibold">매장 이미지</Label>
                <ImageUpload 
                  currentImageUrl={formData.image_url} 
                  onImageChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))} 
                  storeName={formData.name} 
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">사업장 직인(도장)</Label>
                <p className="text-sm text-muted-foreground mb-4">근로계약서 발송 시 사업주 서명란에 자동 날인됩니다. (투명 배경 권장)</p>
                <ImageUpload 
                  currentImageUrl={formData.stamp_image_url} 
                  onImageChange={(url) => setFormData(prev => ({ ...prev, stamp_image_url: url }))} 
                  storeName={`${formData.name} 직인`} 
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label htmlFor="name" className="text-base font-semibold">상호명</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  placeholder="예: 맛있는 베이커리"
                  required
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label htmlFor="owner_name" className="text-base font-semibold">대표자명</Label>
                  <Input
                    id="owner_name"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleInputChange}
                    placeholder="예: 홍길동"
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="business_number" className="text-base font-semibold">사업자등록번호</Label>
                  <Input
                    id="business_number"
                    name="business_number"
                    value={formData.business_number}
                    onChange={handleInputChange}
                    placeholder="예) 123-45-12345"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label htmlFor="store_phone" className="text-base font-semibold">매장 전화번호</Label>
                <Input
                  id="store_phone"
                  name="store_phone"
                  value={formData.store_phone}
                  onChange={handleInputChange}
                  placeholder="예) 02-1234-5678"
                  className="w-full sm:w-1/2"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label htmlFor="description" className="text-base font-semibold">매장 소개</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="매장에 대한 간단한 소개를 입력해주세요. (최대 200자)"
                    className="resize-none pb-8 min-h-[120px]"
                    maxLength={200}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background px-1">
                    {formData.description.length}/200자
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="my-10" />

        {/* SECTION: 매장 위치 */}
        <section>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 shrink-0">
              <h2 className="text-lg font-bold tracking-tight">매장 위치 및 출퇴근</h2>
              <p className="text-sm text-muted-foreground mt-2">
                지도에 표시될 주소를 입력하고, 출퇴근 인증을 위한 GPS 좌표와 반경을 설정합니다.
              </p>
            </div>

            <div className="w-full md:w-2/3 max-w-2xl space-y-8">
              <div className="space-y-4">
                <Label htmlFor="zip_code" className="text-base font-semibold">주소 검색</Label>
                <div className="flex gap-2">
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    readOnly
                    placeholder="우편번호"
                    className="bg-muted w-32"
                  />
                  <Button type="button" variant="outline" onClick={handleAddressSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    주소 검색
                  </Button>
                </div>
                <Input
                  id="address"
                  value={formData.address}
                  readOnly
                  placeholder="기본 주소"
                  className="bg-muted"
                />
              </div>

              <div className="space-y-4">
                <Label htmlFor="address_detail" className="text-base font-semibold">상세 주소</Label>
                <Input
                  id="address_detail"
                  name="address_detail"
                  value={formData.address_detail}
                  onChange={handleInputChange}
                  placeholder="층, 호수 등 상세 주소를 입력해주세요."
                />
                {formData.address && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex items-start gap-3 text-blue-700 dark:text-blue-300 mt-2 border border-blue-100 dark:border-blue-900/50">
                    <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">위치 확인</p>
                      <p className="mt-1 opacity-90">
                        {formData.address} {formData.address_detail}
                      </p>
                      <a 
                        href={`https://map.kakao.com/link/search/${formData.address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs font-medium underline underline-offset-2 hover:opacity-80"
                      >
                        카카오맵에서 보기 &rarr;
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">출퇴근 인증 좌표</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">정확한 출퇴근 인증을 위해 매장의 위도와 경도를 지도에서 핀을 옮겨 지정해주세요.</p>
                </div>
                
                <StoreLocationMap 
                  latitude={formData.latitude ? parseFloat(formData.latitude) : null}
                  longitude={formData.longitude ? parseFloat(formData.longitude) : null}
                  radius={parseInt(formData.auth_radius)}
                  onLocationChange={(lat, lng) => {
                    setFormData(prev => ({
                      ...prev,
                      latitude: String(lat),
                      longitude: String(lng)
                    }))
                  }}
                />
                
                <div className="p-5 bg-muted/20 border rounded-xl space-y-5">
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      GPS 좌표 수동 설정
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} className="h-8 gap-2 w-full sm:w-auto">
                      <Crosshair className="w-3.5 h-3.5" />
                      내 위치로 설정
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-semibold">위도 (Latitude)</Label>
                      <Input 
                        value={formData.latitude} 
                        onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="예: 37.123456"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-semibold">경도 (Longitude)</Label>
                      <Input 
                        value={formData.longitude} 
                        onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="예: 127.123456"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  {!formData.latitude && (
                    <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">
                      * 좌표가 등록되지 않으면 위치 기반 출퇴근 기능을 사용할 수 없습니다.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">출퇴근 허용 반경</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Select 
                    value={formData.auth_radius} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, auth_radius: val }))}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="반경 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50m (매우 좁음)</SelectItem>
                      <SelectItem value="100">100m (보통)</SelectItem>
                      <SelectItem value="200">200m (추천)</SelectItem>
                      <SelectItem value="300">300m (넓음)</SelectItem>
                      <SelectItem value="500">500m (매우 넓음)</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">이내에서만 출퇴근 가능</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="my-10" />

        {/* SECTION: 영업 시간 */}
        <section>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 shrink-0">
              <h2 className="text-lg font-bold tracking-tight">영업 시간</h2>
              <p className="text-sm text-muted-foreground mt-2">
                요일별 영업 시간을 설정해주세요. 스케줄링의 기준이 됩니다.
              </p>
            </div>

            <div className="w-full md:w-2/3 max-w-2xl">
              <OpeningHours 
                initialData={formData.opening_hours} 
                onChange={(newHours) => setFormData(prev => ({ ...prev, opening_hours: newHours }))} 
              />
            </div>
          </div>
        </section>
      </div>

      {error && <div className="text-sm text-red-500 font-medium p-4 bg-red-50 rounded-md">{error}</div>}

      {/* SECTION: Danger Zone */}
      <section className="mt-12">
        <div className="border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden">
          <div className="bg-red-50/50 dark:bg-red-950/10 px-6 py-4 border-b border-red-200 dark:border-red-900/50 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-500">위험 구역</h3>
          </div>
          <div className="p-6 bg-background flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-medium">매장 영구 삭제</h4>
              <p className="text-sm text-muted-foreground max-w-lg">
                이 작업은 되돌릴 수 없습니다. 매장을 삭제하면 소속된 모든 직원, 스케줄 내역, 그리고 설정 데이터가 영구적으로 삭제됩니다.
              </p>
            </div>
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="shrink-0 w-full md:w-auto">매장 삭제하기</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>정말 매장을 삭제하시겠습니까?</DialogTitle>
                  <DialogDescription>
                    이 작업은 되돌릴 수 없습니다. 삭제를 확인하려면 매장 이름 <strong>{initialData.name}</strong>을(를) 입력해주세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    value={deleteStoreName}
                    onChange={(e) => setDeleteStoreName(e.target.value)}
                    placeholder={initialData.name}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>취소</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteStore}
                    disabled={deleteStoreName !== initialData.name || isDeleting}
                  >
                    {isDeleting ? '삭제 중...' : '삭제 확인'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Floating Save Bar */}
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300 ease-in-out transform z-50",
        isDirty ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      )}>
        <div className="bg-background text-foreground p-4 rounded-xl shadow-2xl flex items-center justify-between border border-border">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm font-medium">변경사항이 감지되었습니다.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              재설정
            </Button>
            <Button 
              onClick={handleSubmit} 
              size="sm"
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? '저장 중...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  변경사항 저장
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Global declaration for Daum Postcode
declare global {
  interface Window {
    daum: any
  }
}