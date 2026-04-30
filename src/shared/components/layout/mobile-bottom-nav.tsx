'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  CalendarRange,
  ClipboardList,
  Umbrella,
  LayoutDashboard,
  Megaphone
} from 'lucide-react'

interface MobileBottomNavProps {
  role: string
  permissions?: Record<string, boolean>
}

export function MobileBottomNav({ role, permissions = {} }: MobileBottomNavProps) {
  const pathname = usePathname()
  
  const canManage = role === 'owner' || role === 'manager'

  const navItems = [
    ...(permissions.view_announcements ? [{
      title: '공지',
      href: '/dashboard/announcements',
      icon: Megaphone,
    }] : []),
    {
      title: '휴가',
      href: '/dashboard/leave',
      icon: Umbrella,
    },
    ...(permissions.view_dashboard ? [{
      title: '대시보드',
      href: '/dashboard',
      icon: LayoutDashboard,
    }] : []),
    {
      title: '스케줄',
      href: '/dashboard/schedule',
      icon: CalendarRange,
    },
    {
      title: '업무',
      href: '/dashboard/tasks',
      icon: ClipboardList,
    }
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around px-2 pb-safe z-40">
      {navItems.map((item) => {
        const isActive = item.href === '/dashboard' 
          ? pathname === '/dashboard' 
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full transition-colors relative",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "flex flex-col items-center justify-center px-1 py-1.5 gap-1 rounded-xl transition-colors w-full",
              isActive && "bg-muted"
            )}>
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className={cn(
                "text-[10px] font-medium tracking-tighter whitespace-nowrap",
                isActive && "font-bold"
              )}>
                {item.title}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}