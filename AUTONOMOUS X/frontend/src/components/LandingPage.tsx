import { useEffect } from 'react'
import type { AuthScreen } from './AuthModal'

type Props = {
  onOpenAuth: (screen?: AuthScreen) => void
  onOpenDashboard: () => void
  isLoggedIn: boolean
}

export default function LandingPage({ onOpenAuth, onOpenDashboard, isLoggedIn }: Props) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_AUTH') {
        onOpenAuth((event.data.screen as AuthScreen) || 'login')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onOpenAuth])

  return (
    <div className="landing-container">
      {/* 100% Unaltered Framer Landing Page with embedded footer Login button */}
      <iframe
        id="framer-landing-frame"
        src="/landing.html"
        title="Autonomous X Logistics Landing Page"
        className="framer-iframe"
      />

      {/* Floating Bottom Action matching the red color theme */}
      <div className="landing-bottom-bar">
        <button
          type="button"
          className="landing-red-login-btn"
          onClick={() => onOpenAuth('login')}
          title="Login to OneTrade"
        >
          <span className="red-login-dot" />
          Login
        </button>

        {isLoggedIn && (
          <button
            type="button"
            className="landing-dashboard-pill-btn"
            onClick={onOpenDashboard}
            title="Open Operations Control Room"
          >
            Dashboard ›
          </button>
        )}
      </div>
    </div>
  )
}
