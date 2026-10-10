import { useEffect, useState, type FC, type FormEvent } from 'react'
import { useAppStore } from '@/editor/store'
import { listOAuthProviders, requestPasswordReset, toAccountError, type AccountErrorKind, type OAuthProvider } from '@/editor/api/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation, type TranslationKey } from '@/i18n'

type LoginMode = 'login' | 'register'

const ERROR_KEYS: Record<AccountErrorKind, TranslationKey | null> = {
  'invalid-credentials': 'accountErrorInvalidCredentials',
  'email-taken': 'accountErrorEmailTaken',
  'invalid-input': 'accountErrorInvalidInput',
  network: 'accountErrorNetwork',
  unavailable: 'accountErrorNetwork',
  cancelled: null,
  unknown: 'accountErrorUnknown',
}

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const LoginDialog: FC<LoginDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation()
  const login = useAppStore((state) => state.login)
  const register = useAppStore((state) => state.register)
  const loginWithOAuth = useAppStore((state) => state.loginWithOAuth)
  const [mode, setMode] = useState<LoginMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [providers, setProviders] = useState<OAuthProvider[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    listOAuthProviders()
      .then((list) => { if (!cancelled) setProviders(list) })
      .catch(() => { if (!cancelled) setProviders([]) })
    return () => {
      cancelled = true
    }
  }, [open])

  const showError = (reason: unknown) => {
    const key = ERROR_KEYS[toAccountError(reason).kind]
    setError(key ? t(key) : null)
  }

  const run = (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    action()
      .then(() => {
        setPassword('')
        onOpenChange(false)
      })
      .catch(showError)
      .finally(() => setBusy(false))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    run(() => mode === 'login' ? login(email.trim(), password) : register(name.trim(), email.trim(), password))
  }

  const handlePasswordReset = () => {
    if (!email.trim()) return
    setError(null)
    requestPasswordReset(email.trim())
      .then(() => setNotice(t('accountPasswordResetSent')))
      .catch(showError)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('loginDialogTitle')}</DialogTitle>
          <DialogDescription>{t('loginDialogDescription')}</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => { setMode(value === 'register' ? 'register' : 'login'); setError(null) }}>
          <TabsList className="w-full">
            <TabsTrigger value="login">{t('loginTab')}</TabsTrigger>
            <TabsTrigger value="register">{t('registerTab')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="account-name">{t('accountName')}</Label>
              <Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="account-email">{t('accountEmail')}</Label>
            <Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-password">{t('accountPassword')}</Label>
            <Input
              id="account-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
            {mode === 'register' && <p className="text-xs text-muted-foreground">{t('accountPasswordHint')}</p>}
            {mode === 'login' && (
              <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={handlePasswordReset}>
                {t('accountForgotPassword')}
              </button>
            )}
          </div>

          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}

          <DialogFooter>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {mode === 'login' ? t('accountSignIn') : t('accountSubmitRegister')}
            </Button>
          </DialogFooter>
        </form>

        {providers.length > 0 && (
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">{t('accountOAuthDivider')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {providers.map((provider) => (
                <Button
                  key={provider.name}
                  type="button"
                  variant="outline"
                  disabled={busy}
                  // No await before the SDK call: Safari blocks popups opened after an async gap.
                  onClick={() => run(() => loginWithOAuth(provider.name))}
                >
                  {provider.displayName}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
