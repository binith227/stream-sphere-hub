'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [step, setStep] = useState(1)
  
  // Form fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const validatePassword = (pass: string) => {
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass)
    return hasLetter && hasNumber && hasSpecial
  }

  // SIGN IN HANDLER
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username.trim())
        .maybeSingle()

      if (profileError || !profile) {
        setError('Profile matching identifier not found.')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      })

      if (authError) {
        setError('Invalid secure password entry parameter.')
        setLoading(false)
        return
      }

      if (authData?.user) {
        localStorage.setItem('current_user_id', authData.user.id)
      }
      
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected validation mismatch occurred.')
    } finally {
      setLoading(false)
    }
  }

  // SIGN UP HANDLER WITH AUTOMATIC DUPLICATE CONFLICT RESOLUTION
  async function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!validatePassword(password)) {
      setError('Password must be alphanumeric and contain at least one special character.')
      return
    }

    setLoading(true)

    try {
      // 1. Attempt to create the user account in Supabase Auth
      let { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            email_confirmed: true // Force instant confirmation bypass
          }
        }
      })

      let finalUserId = authData?.user?.id

      // 2. Error handling: if account already exists in Auth but public.profiles profile is missing/incomplete
      if (authError && authError.message.toLowerCase().includes('already registered')) {
        // Log in instantly to fetch their existing user ID reference safely
        const { data: recoverData, error: recoverError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        })

        if (recoverError || !recoverData.user) {
          setError('This credentials context already exists. Please sign in directly.')
          setLoading(false)
          return
        }
        
        finalUserId = recoverData.user.id
        authError = null // Clear error state to allow schema execution
      }

      if (authError || !finalUserId) {
        setError(authError?.message || 'Failed creating credentials.')
        setLoading(false)
        return
      }

      const derivedUsername = email.split('@')[0] + Math.floor(1000 + Math.random() * 9000)

      // 3. Use UPSERT instead of INSERT to completely bypass unique key collisions
      const { error: insertError } = await supabase
        .from('profiles')
        .upsert([{
          id: finalUserId, 
          username: derivedUsername,
          email: email.trim(),
          password: password, 
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          subscription_tier: 'none'
        }], { onConflict: 'id' })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // 4. Authenticate the active workspace token session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) {
        setError('Profile registered, but auto-authentication failed. Try logging in manually.')
        setIsSignUp(false)
        setStep(1)
        setLoading(false)
        return
      }

      if (signInData?.user) {
        localStorage.setItem('current_user_id', signInData.user.id)
      }

      // 5. Route cleanly directly onto the dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected registration error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // STYLES 
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box'
  }

  const cardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '24px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  }

  const iconContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px'
  }

  const iconBadgeStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#000000',
    border: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  }

  const titleStyle: React.CSSProperties = {
    margin: '0 0 8px 0',
    fontSize: '30px',
    fontWeight: '800',
    textAlign: 'center',
    color: '#ffffff',
    letterSpacing: '-0.025em'
  }

  const subtitleStyle: React.CSSProperties = {
    margin: '0 0 36px 0',
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: '600'
  }

  const errorStyle: React.CSSProperties = {
    background: 'rgba(66, 32, 32, 0.5)',
    border: '1px solid rgba(153, 27, 27, 0.5)',
    color: '#f87171',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '12px',
    marginBottom: '24px',
    fontWeight: '500'
  }

  const formGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.05em',
    marginBottom: '8px'
  }

  const hintStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#64748b',
    marginTop: '0px',
    marginBottom: '8px',
    lineHeight: '1.5'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '12px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  }

  const inputWithBtnStyle: React.CSSProperties = {
    ...inputStyle,
    paddingRight: '48px'
  }

  const toggleBtnStyle: React.CSSProperties = {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    fontSize: '11px',
    fontWeight: '700',
    color: '#818cf8',
    cursor: 'pointer',
    outline: 'none',
    padding: '0'
  }

  const submitBtnStyle: React.CSSProperties = {
    width: '100%',
    background: '#818cf8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    boxSizing: 'border-box'
  }

  const secondaryBtnStyle: React.CSSProperties = {
    flex: '1',
    background: '#1e293b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxSizing: 'border-box'
  }

  const primarySplitBtnStyle: React.CSSProperties = {
    ...secondaryBtnStyle,
    flex: '2',
    background: '#818cf8'
  }

  const footerTextStyle: React.CSSProperties = {
    marginTop: '32px',
    marginBottom: '0px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b',
    width: '100%'
  }

  const linkStyle: React.CSSProperties = {
    color: '#818cf8',
    cursor: 'pointer',
    fontWeight: '600',
    textDecoration: 'underline',
    marginLeft: '4px'
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        <div style={iconContainerStyle}>
          <div style={iconBadgeStyle}>
            <svg 
              style={{ width: '24px', height: '24px', color: '#818cf8' }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>

        <h1 style={titleStyle}>StreamSphere</h1>
        <p style={subtitleStyle}>
          {isSignUp ? `STEP ${step} OF 3 — Registration Parameters` : 'Sign in to access your dashboard metrics'}
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        {!isSignUp ? (
          <form onSubmit={handleSignIn} style={formGroupStyle}>
            <div>
              <label style={labelStyle}>UNIQUE USERNAME</label>
              <input 
                type="text" 
                placeholder="e.g., your_username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                style={inputStyle} 
              />
            </div>

            <div>
              <label style={labelStyle}>PROFILE PASSWORD</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  style={inputWithBtnStyle} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={toggleBtnStyle}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? 'Authenticating Sign In...' : 'Authenticate Sign In'}
            </button>
          </form>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              if (step < 3) {
                setStep(step + 1)
                setError('')
              } else {
                handleSignUpSubmit(e)
              }
            }} 
            style={formGroupStyle}
          >
            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div>
                  <label style={labelStyle}>EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    style={inputStyle} 
                  />
                </div>
                <button type="submit" style={submitBtnStyle}>
                  Proceed to Step 2
                </button>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div>
                  <label style={labelStyle}>FIRST NAME</label>
                  <input 
                    type="text" 
                    placeholder="Enter first name" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required 
                    style={inputStyle} 
                  />
                </div>
                <div>
                  <label style={labelStyle}>LAST NAME</label>
                  <input 
                    type="text" 
                    placeholder="Enter last name" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required 
                    style={inputStyle} 
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button type="button" onClick={() => setStep(1)} style={secondaryBtnStyle}>
                    Back
                  </button>
                  <button type="submit" style={primarySplitBtnStyle}>
                    Proceed to Step 3
                  </button>
                </div>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <div>
                  <label style={labelStyle}>CREATE SECURE PASSWORD</label>
                  <p style={hintStyle}>Must include letters, numbers, and at least one special character.</p>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      style={inputWithBtnStyle} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={toggleBtnStyle}
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>CONFIRM PASSWORD</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required 
                      style={inputWithBtnStyle} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={toggleBtnStyle}
                    >
                      {showConfirmPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button type="button" onClick={() => setStep(2)} style={secondaryBtnStyle}>
                    Back
                  </button>
                  <button type="submit" disabled={loading} style={primarySplitBtnStyle}>
                    {loading ? 'Completing Setup...' : 'Complete Sign Up'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        <p style={footerTextStyle}>
          {isSignUp ? 'Already have an active profile? ' : "Don't have a platform profile? "}
          <span 
            onClick={() => { 
              setIsSignUp(!isSignUp)
              setStep(1)
              setError('')
              setShowPassword(false)
              setShowConfirmPassword(false)
            }} 
            style={linkStyle}
          >
            {isSignUp ? 'Sign In Here' : 'Create One Here'}
          </span>
        </p>
      </div>
    </div>
  )
}