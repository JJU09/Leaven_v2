'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { logout } from '../actions'

interface LogoutButtonProps {
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showIcon?: boolean
  showText?: boolean
  asDropdownItem?: boolean
}

export function LogoutButton({
  className,
  variant = 'ghost',
  size = 'default',
  showIcon = true,
  showText = true,
  asDropdownItem = false,
}: LogoutButtonProps) {
  return (
    <form action={logout} className={asDropdownItem ? "w-full" : ""}>
      <Button
        type="submit"
        variant={variant}
        size={size}
        className={className || (asDropdownItem ? "w-full justify-start px-2 py-1.5 text-sm font-normal" : "")}
        onClick={(e) => {
          // If used in DropdownMenu, prevent the dropdown from closing immediately 
          // to allow the form submission to proceed smoothly if needed.
          // However, native form submission works fine even if dropdown closes.
          // We can let it behave natively.
        }}
      >
        {showIcon && <LogOut className={`${showText ? 'mr-2' : ''} h-4 w-4`} />}
        {showText && <span>로그아웃</span>}
      </Button>
    </form>
  )
}
