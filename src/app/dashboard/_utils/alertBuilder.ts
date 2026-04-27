export type AlertType = 'asset_warning' | 'vendor_contract' | 'leave_pending' | 'attendance_late' | 'handover_notice'
export type AlertSeverity = 'red' | 'amber' | 'blue'

export type AlertItem = {
  id: string
  type: AlertType
  severity: AlertSeverity
  dDay?: number
  title: string
  subText: string
  actionLabel: string
  actionHref: string
}

export function sortAlerts(alerts: AlertItem[]): AlertItem[] {
  const severityScore = { red: 1, amber: 2, blue: 3 }
  
  return [...alerts].sort((a, b) => {
    if (severityScore[a.severity] !== severityScore[b.severity]) {
      return severityScore[a.severity] - severityScore[b.severity]
    }
    
    const dDayA = a.dDay !== undefined && a.dDay !== null ? a.dDay : 9999
    const dDayB = b.dDay !== undefined && b.dDay !== null ? b.dDay : 9999
    return dDayA - dDayB
  })
}