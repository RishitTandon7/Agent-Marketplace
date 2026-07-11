'use client'

import { createClient } from '@/lib/supabase/client'

function GoogleLogo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-p-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="premium-grid" />

      {/* Floating blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-p-purple/20 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-p-lime/20 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite] pointer-events-none" style={{ animationDelay: '-3s' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-p-red rounded-full border-2 border-p-black premium-shadow flex items-center justify-center text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/>
                <line x1="7.38" y1="12" x2="13.12" y2="2.06"/><line x1="9.69" y1="16" x2="3.95" y2="6.06"/>
                <line x1="14.31" y1="16" x2="2.83" y2="16"/><line x1="16.62" y1="12" x2="10.88" y2="21.94"/>
              </svg>
            </div>
            <span className="font-display font-bold text-3xl tracking-tight">AgentLab</span>
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-p-black">Welcome back</h1>
          <p className="font-sans text-p-black/60 mt-1">Sign in to browse and run AI agents</p>
        </div>

        {/* Card */}
        <div className="bg-p-surface border-2 border-p-black rounded-3xl p-8 premium-static">
          <button
            onClick={handleGoogleLogin}
            id="google-signin-btn"
            className="w-full flex items-center justify-center gap-3 bg-p-surface text-p-black border-2 border-p-black rounded-xl px-6 py-4 font-display font-bold text-lg premium-shadow hover:bg-p-bg transition-all"
          >
            <GoogleLogo />
            Sign in with Google
          </button>

          <div className="mt-6 pt-6 border-t border-p-black/10 text-center">
            <p className="font-sans text-xs text-p-black/50">
              By signing in you agree to our{' '}
              <a href="#" className="underline hover:text-p-black transition-colors">Terms</a>
              {' '}and{' '}
              <a href="#" className="underline hover:text-p-black transition-colors">Privacy Policy</a>.
            </p>
          </div>
        </div>

        <p className="text-center font-sans text-sm text-p-black/40 mt-6">
          No credit card required to explore.
        </p>
      </div>
    </div>
  )
}
