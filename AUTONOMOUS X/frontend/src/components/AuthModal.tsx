import { useState } from 'react'

export type AuthScreen = 'login' | 'forgot' | 'verify' | 'signup' | 'enroll' | 'success'

type UserProfile = {
  email: string
  org: string
  role: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: (user: UserProfile) => void
  initialScreen?: AuthScreen
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess, initialScreen = 'login' }: Props) {
  const [screen, setScreen] = useState<AuthScreen>(initialScreen)
  const [email, setEmail] = useState('john.doe@gmail.com')
  const [password, setPassword] = useState('••••••••••••')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Form states for signup & enroll
  const [orgName, setOrgName] = useState('Iconic webtech ltd.')
  const [businessType, setBusinessType] = useState('Freight Forwarder')
  const [contactName, setContactName] = useState('John Doe')
  const [phone, setPhone] = useState('+1 (555) 234-5678')
  const [orgId, setOrgId] = useState('info@iconicweb.com')
  const [verifyCode, setVerifyCode] = useState('7789BM6X')
  const [userRole, setUserRole] = useState('Fleet Operations Manager')
  const [department, setDepartment] = useState('Logistics & Dispatch')
  const [jobTitle, setJobTitle] = useState('Senior Supply Chain Director')

  if (!isOpen) return null

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    onLoginSuccess({
      email: email || 'john.doe@gmail.com',
      org: orgName || 'Iconic webtech ltd.',
      role: userRole || 'Fleet Operations Manager',
    })
  }

  // Right banner image based on screen
  const bannerImages: Record<AuthScreen, string> = {
    login: '/auth/banner_login.jpg',
    forgot: '/auth/banner_forgot.jpg',
    verify: '/auth/banner_verify.jpg',
    signup: '/auth/banner_org.jpg',
    enroll: '/auth/banner_enroll.jpg',
    success: '/auth/banner_success.jpg',
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        {/* Left Column Form */}
        <div className="auth-form-col">
          {/* Brand */}
          <div className="auth-brand">
            <span className="brand-text">ONETRADE</span>
            <span className="brand-ai">.Ai</span>
          </div>

          {/* SCREEN 1: LOGIN */}
          {screen === 'login' && (
            <div className="auth-screen-view">
              <h1 className="auth-title">Login to OneTrade!</h1>
              <p className="auth-subtitle">Welcome back! Please enter your details to login.</p>

              <form onSubmit={handleLogin} className="auth-form">
                <div className="floating-field">
                  <label>Email Address</label>
                  <div className="input-wrap">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@gmail.com"
                      required
                    />
                    {email && (
                      <button type="button" className="clear-btn" onClick={() => setEmail('')}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="floating-field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password"
                    >
                      {showPassword ? '👁' : '👁‍🗨'}
                    </button>
                  </div>
                </div>

                <div className="auth-options-row">
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => setScreen('forgot')}
                  >
                    Forgot password?
                  </button>
                </div>

                <button type="submit" className="auth-primary-btn">
                  Login to OneTrade
                </button>

                <button
                  type="button"
                  className="auth-outline-btn"
                  onClick={() => setScreen('enroll')}
                >
                  Enroll in organisation
                </button>

                <div className="auth-footer-prompt">
                  Want to register new organisation?{' '}
                  <button
                    type="button"
                    className="auth-inline-link"
                    onClick={() => setScreen('signup')}
                  >
                    Signup here
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 2: FORGOT PASSWORD */}
          {screen === 'forgot' && (
            <div className="auth-screen-view">
              <button
                type="button"
                className="back-nav-btn"
                onClick={() => setScreen('login')}
              >
                ‹ Back to login
              </button>

              <h1 className="auth-title">Forgot your password?</h1>
              <p className="auth-subtitle">
                Don't worry, happens to all of us. Enter your email below to recover your password
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setScreen('verify')
                }}
                className="auth-form"
              >
                <div className="floating-field">
                  <label>Email Address</label>
                  <div className="input-wrap">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@gmail.com"
                      required
                    />
                    {email && (
                      <button type="button" className="clear-btn" onClick={() => setEmail('')}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <button type="submit" className="auth-primary-btn">
                  Submit
                </button>
              </form>
            </div>
          )}

          {/* SCREEN 3: VERIFY CODE */}
          {screen === 'verify' && (
            <div className="auth-screen-view">
              <button
                type="button"
                className="back-nav-btn"
                onClick={() => setScreen('login')}
              >
                ‹ Back to login
              </button>

              <h1 className="auth-title">Verify code</h1>
              <p className="auth-subtitle">An authentication code has been sent to your email.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleLogin()
                }}
                className="auth-form"
              >
                <div className="floating-field">
                  <label>Enter code</label>
                  <div className="input-wrap">
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="7789BM6X"
                      required
                    />
                  </div>
                </div>

                <div className="auth-resend-row">
                  Didn't receive a code?{' '}
                  <button type="button" className="auth-inline-link">
                    Resend
                  </button>
                </div>

                <button type="submit" className="auth-primary-btn">
                  Verify
                </button>
              </form>
            </div>
          )}

          {/* SCREEN 4: ADD NEW ORGANISATION */}
          {screen === 'signup' && (
            <div className="auth-screen-view">
              <button
                type="button"
                className="back-nav-btn"
                onClick={() => setScreen('login')}
              >
                ‹ Back to login
              </button>

              <h1 className="auth-title">Add new organisation</h1>
              <p className="auth-subtitle">Hey! Please enter your details to add a new profile to organisation.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setScreen('success')
                }}
                className="auth-form scrollable-form"
              >
                <div className="floating-field">
                  <label>Organisation name</label>
                  <div className="input-wrap">
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Iconic webtech ltd."
                      required
                    />
                  </div>
                </div>

                <div className="floating-field">
                  <label>Select business type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                  >
                    <option value="Freight Forwarder">Freight Forwarder</option>
                    <option value="Shipper / Enterprise">Shipper / Enterprise</option>
                    <option value="Carrier / Fleet Operator">Carrier / Fleet Operator</option>
                    <option value="3PL & Warehousing Hub">3PL & Warehousing Hub</option>
                  </select>
                </div>

                <div className="floating-field">
                  <label>Primary contact name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="floating-field">
                  <label>Primary email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@gmail.com"
                    required
                  />
                </div>

                <div className="floating-field">
                  <label>Phone number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                  />
                </div>

                <div className="floating-field">
                  <label>Organisation ID</label>
                  <input
                    type="text"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="info@iconicweb.com"
                  />
                </div>

                <div className="chips-section">
                  <span className="chips-label">SUGGESTIONS</span>
                  <div className="chips-row">
                    {['info@icoweb.com', 'care@icoweb.com', 'support@icoweb.com'].map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        className="suggestion-chip"
                        onClick={() => setOrgId(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="floating-field">
                  <label>Create password</label>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password"
                      required
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '👁' : '👁‍🗨'}
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-primary-btn">
                  Create organisation
                </button>
              </form>
            </div>
          )}

          {/* SCREEN 5: ENROLL IN EXISTING ORGANISATION */}
          {screen === 'enroll' && (
            <div className="auth-screen-view">
              <button
                type="button"
                className="back-nav-btn"
                onClick={() => setScreen('login')}
              >
                ‹ Back to login
              </button>

              <h1 className="auth-title">Enroll user in existing organisation</h1>
              <p className="auth-subtitle">Please enter your details to enroll users in existing organisation.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setScreen('success')
                }}
                className="auth-form"
              >
                <div className="floating-field verified-field">
                  <label>Organisation ID</label>
                  <div className="input-wrap">
                    <input
                      type="text"
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                      placeholder="info@iconicweb.com"
                      required
                    />
                    <span className="verified-icon">✔</span>
                  </div>
                  <span className="verified-note">Organisation ID is registered in the system.</span>
                </div>

                <div className="floating-field">
                  <label>User roles and permissions</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                  >
                    <option value="Fleet Operations Manager">Fleet Operations Manager</option>
                    <option value="Dispatcher / Route Planner">Dispatcher / Route Planner</option>
                    <option value="Logistics Analyst">Logistics Analyst</option>
                    <option value="Autonomous Fleet Supervisor">Autonomous Fleet Supervisor</option>
                  </select>
                </div>

                <div className="floating-field">
                  <label>Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="Logistics & Dispatch">Logistics & Dispatch</option>
                    <option value="Supply Chain Operations">Supply Chain Operations</option>
                    <option value="Autonomous Network Intelligence">Autonomous Network Intelligence</option>
                  </select>
                </div>

                <div className="floating-field">
                  <label>Job title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Logistics Coordinator"
                  />
                </div>

                <button type="submit" className="auth-primary-btn">
                  Continue
                </button>
              </form>
            </div>
          )}

          {/* SCREEN 6: THANKS FOR SIGNING UP */}
          {screen === 'success' && (
            <div className="auth-screen-view success-view">
              <div className="success-badge">
                <span className="badge-check">✔</span>
              </div>

              <h1 className="auth-title">Thanks for signing up!</h1>
              <p className="auth-subtitle">
                Your request to join <strong>{orgName}</strong> has been successfully submitted. Access will be granted once an administrator reviews and approves your request. You will receive a confirmation email as soon as your account is activated.
              </p>
              <p className="auth-subtitle-secondary">
                In the meantime, feel free to explore our live operations platform to inspect real-time network intelligence. Welcome aboard!
              </p>

              <div className="success-actions">
                <button
                  type="button"
                  className="auth-primary-btn"
                  onClick={() => handleLogin()}
                >
                  Enter Operations Dashboard
                </button>
                <button
                  type="button"
                  className="auth-outline-btn"
                  onClick={onClose}
                >
                  Visit homepage
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column Banner */}
        <div className="auth-banner-col">
          <img
            src={bannerImages[screen]}
            alt="OneTrade intelligence showcase"
            className="auth-banner-img"
          />
        </div>
      </div>
    </div>
  )
}

