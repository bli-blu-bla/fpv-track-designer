import { useState } from 'react'
import { Loader2, LogOut, UserRound } from 'lucide-react'
import { useAppStore } from '@/editor/store'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LoginDialog } from '@/editor/panels/LoginDialog'
import { useTranslation } from '@/i18n'

/** TopBar account entry: sign-in button, or the signed-in user's menu. Hidden when no API is configured. */
export function AccountMenu() {
  const { t } = useTranslation()
  const status = useAppStore((state) => state.accountStatus)
  const user = useAppStore((state) => state.accountUser)
  const namespaces = useAppStore((state) => state.accountNamespaces)
  const logout = useAppStore((state) => state.logout)
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  if (status === 'disabled') return null

  if (status === 'checking') {
    return (
      <span role="status" aria-label={t('accountChecking')} className="flex size-8 items-center justify-center text-subtle-foreground">
        <Loader2 className="size-4 animate-spin" />
      </span>
    )
  }

  if (!user) {
    return (
      <>
        <Button
          variant="ghost"
          onClick={() => setLoginOpen(true)}
          className="h-8 gap-1.5 px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <UserRound />
          <span className="hidden md:inline">{t('accountSignIn')}</span>
        </Button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    )
  }

  const displayName = user.name || user.email
  const initial = displayName.charAt(0).toUpperCase() || '?'

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-label={t('accountMenuLabel', { name: displayName })}
          className="h-8 gap-2 px-1.5 text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-secondary font-mono text-[11px] text-foreground">
            {initial}
          </span>
          <span className="hidden max-w-28 truncate lg:inline">{displayName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-64 gap-0 border-border bg-background p-1 shadow-xl shadow-black/50">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">{t('accountSignedInAs')}</p>
          <p className="truncate text-[13px] font-medium">{displayName}</p>
          {user.name && <p className="truncate text-xs text-subtle-foreground">{user.email}</p>}
        </div>
        {namespaces.length > 0 && (
          <>
            <div className="-mx-1 my-1 h-px bg-border" />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('accountNamespacesHeading')}</div>
            <ul className="px-2 pb-1">
              {namespaces.map((namespace) => (
                <li key={namespace.id} className="flex items-baseline justify-between gap-2 py-0.5 text-[13px]">
                  <span className="truncate">{namespace.name}</span>
                  <span className="font-mono text-[11px] text-subtle-foreground">{namespace.slug}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="-mx-1 my-1 h-px bg-border" />
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2.5 rounded-sm px-2 text-left text-[13px] text-foreground hover:bg-secondary"
          onClick={() => {
            setMenuOpen(false)
            logout()
          }}
        >
          <LogOut className="size-4 text-muted-foreground" />
          {t('accountSignOut')}
        </button>
      </PopoverContent>
    </Popover>
  )
}
