'use client'

import * as React from 'react'
import { Sidebar } from '@/shared/components/layout/sidebar'
import { StaffSidebar } from '@/features/staff/components/staff-sidebar'
import { Header } from '@/shared/components/layout/header'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PlusIcon, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { setCurrentStore } from '@/features/store/actions'
import { MobileBottomNav } from '@/shared/components/layout/mobile-bottom-nav'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  memberId: string
  storeId?: string
  role: string
  roleName?: string
  roleColor?: string
  storeName: string
  storeList: {
    id: string
    name: string
    role: string
  }[]
  staffList: any[]
  defaultLayout?: number[] | undefined
  navCollapsedSize?: number
  permissions?: Record<string, boolean>
}

export function DashboardClientLayout({
  children,
  user,
  memberId,
  storeId,
  role,
  roleName,
  roleColor,
  storeName,
  storeList,
  staffList,
  permissions = {},
}: DashboardLayoutProps) {
  return (
    <div className="h-screen w-full bg-background overflow-hidden flex">
      {/* Mobile Layout (Hidden on LG and above) */}
      <div className="flex flex-col h-full w-full lg:hidden pb-16 relative">
        <Header storeName={storeName} storeId={storeId} />
        <main className="flex-1 overflow-auto bg-muted/5 hide-scrollbar">
          {children}
        </main>
        <MobileBottomNav role={role} permissions={permissions} />
      </div>

      {/* Desktop Layout (Discord Style) */}
      <div className="hidden lg:flex h-full w-full">
        {/* 1. Store List Sidebar (Fixed Width) */}
        <div className="w-18 flex-none border-r bg-muted/10 flex flex-col items-center py-4 space-y-4 overflow-y-auto hide-scrollbar z-10">
          {/* Home Button (Workspace Switcher / Bypass) */}
          <Link href="/home?bypass=true" className="group relative flex items-center justify-center w-full">
            <div className={cn(
              "absolute left-0 w-1 bg-foreground rounded-r-full transition-all duration-300",
              "h-0 opacity-0 group-hover:h-5 group-hover:opacity-100"
            )} />
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-[24px] bg-background transition-all duration-300 group-hover:rounded-2xl group-hover:bg-primary shadow-sm border border-black/5",
              "text-foreground group-hover:text-white"
            )}
              title="모든 매장 보기 및 추가"
            >
              <Home className="w-6 h-6" />
            </div>
          </Link>

          <div className="w-8 h-0.5 bg-border rounded-full mx-auto" />

          {storeList.map((store) => {
            const isActive = store.name === storeName;
            return (
              <div key={store.id} className="group relative flex items-center justify-center w-full">
                {/* Active/Hover Indicator */}
                <div className={cn(
                  "absolute left-0 w-1 bg-primary rounded-r-full transition-all duration-300",
                  isActive ? "h-10 opacity-100" : "h-0 opacity-0 group-hover:h-5 group-hover:opacity-100"
                )} />
                
                <Button 
                  variant="ghost"
                  className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-[24px] transition-all duration-300 overflow-hidden p-0 border border-black/5 shadow-sm outline-none ring-0",
                    isActive ? "bg-primary rounded-2xl" : "bg-background hover:bg-primary group-hover:rounded-2xl"
                  )}
                  title={store.name}
                  onClick={() => setCurrentStore(store.id)}
                >
                  <Avatar className="w-full h-full bg-transparent">
                    {/* TODO: Add store logo url */}
                    <AvatarFallback className={cn(
                      "text-foreground font-semibold bg-transparent transition-colors duration-300",
                      isActive ? "text-primary-foreground" : "group-hover:text-primary-foreground"
                    )}>
                      {store.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </div>
            );
          })}
          
          <div className="w-8 h-0.5 bg-border rounded-full mx-auto" />
          
          <Link 
            href="/home?bypass=true"
            className="group relative flex items-center justify-center w-full"
            title="새 매장 추가 및 합류"
          >
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-[24px] bg-background transition-all duration-300 group-hover:rounded-2xl group-hover:bg-green-500 shadow-sm border border-black/5"
            )}>
              <PlusIcon className="w-6 h-6 text-green-500 transition-colors duration-300 group-hover:text-white" />
            </div>
          </Link>
        </div>

        {/* 2. Management Menu Sidebar (Fixed Width: 240px) */}
        <div className="w-[240px] flex-none border-r bg-background h-full overflow-hidden">
          <Sidebar 
            user={user} 
            memberId={memberId}
            role={role} 
            roleName={roleName}
            roleColor={roleColor}
            isCollapsed={false}
            permissions={permissions}
          />
        </div>

        {/* 3. Main Content */}
        <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden relative">
          <Header storeName={storeName} storeId={storeId} />
          <main className="flex-1 overflow-auto p-6 bg-muted/5">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}