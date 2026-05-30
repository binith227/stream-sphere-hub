'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [totalIncome, setTotalIncome] = useState<number>(0)
  const [daysRemaining, setDaysRemaining] = useState<number>(30)
  const [activeUserCount, setActiveUserCount] = useState<number>(0) // 🚀 Track real-time database user volume
  
  // Account settings inputs
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  
  const [saveLoading, setSaveLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', isError: false })

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  async function checkUserAndFetchData() {
    try {
      setLoading(true)
      setMessage({ text: '', isError: false })

      // Fetch the freshest authentication token directly
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        localStorage.clear()
        router.push('/login')
        return
      }

      // 1. Fetch profile mapping
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      // 2. Fetch active user subscription metrics
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
        setEmailInput(profileData.email || '')
      }

      if (subData) {
        setSubscription(subData)
        calculateCountdown(subData.start_date, subData.end_date)
      } else {
        setSubscription(null)
      }

      // 3. Compile system analytics values
      await fetchCompanyIncome()
      await fetchActiveUserMetrics() // 🚀 Triggers dynamic profile row queries

    } catch (err: any) {
      console.error("Data fetch exception: ", err)
    } finally {
      setLoading(false)
    }
  }

  // Live count query pulling absolute record length from your profiles backend table
  async function fetchActiveUserMetrics() {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      if (!error && count !== null) {
        setActiveUserCount(count)
      }
    } catch (err) {
      console.error("Error updating user tracking metrics: ", err)
    }
  }

  // Aggregate active transactional milestones across company databases
  async function fetchCompanyIncome() {
    try {
      const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('status', 'active')

      if (allSubs) {
        const income = allSubs.reduce((acc, curr) => {
          if (curr.plan_id === 1) return acc + 99
          if (curr.plan_id === 2) return acc + 299
          if (curr.plan_id === 3) return acc + 499
          return acc
        }, 0)
        setTotalIncome(income)
      }
    } catch (err) {
      // Fail silently
    }
  }

  // Defensive date math: parses ISO strings or injects a 30-day window if data is null
  function calculateCountdown(startDateString: string, endDateString?: string) {
    const today = new Date()
    let expiration: Date

    if (endDateString) {
      expiration = new Date(endDateString)
    } else if (startDateString) {
      const start = new Date(startDateString)
      expiration = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    } else {
      setDaysRemaining(30)
      return
    }
    
    const differenceInTime = expiration.getTime() - today.getTime()
    const diffDays = Math.ceil(differenceInTime / (1000 * 3600 * 24))
    
    setDaysRemaining(diffDays > 0 ? diffDays : 0)
  }

  // Concurrent Mutation Pipeline: Updates profile tier and subscription windows together
  async function handleSelectPlan(planId: number) {
    setSaveLoading(true)
    setMessage({ text: '', isError: false })
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const tierName = planId === 1 ? 'Basic' : planId === 2 ? 'Pro' : 'Enterprise'
      
      // Calculate explicitly defined timestamp blocks to save directly to the DB
      const startTimeISO = new Date().toISOString()
      const endTimeISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Step 1: Write explicit validation records to the subscriptions table
      const { data: newSub, error: subError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          start_date: startTimeISO,
          end_date: endTimeISO
        }])
        .select()
        .maybeSingle()

      if (subError) throw subError

      // Step 2: Push human-readable text string back to profile row parameters
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ subscription_tier: tierName })
        .eq('id', user.id)

      if (profileUpdateError) throw profileUpdateError

      // Step 3: Local view refresh containing fresh countdown logs
      setSubscription(newSub)
      calculateCountdown(startTimeISO, endTimeISO)
      
      await checkUserAndFetchData()
      setMessage({ text: 'Infrastructure tier successfully provisioned!', isError: false })
    } catch (err: any) {
      setMessage({ text: err.message || 'Error processing database update sync.', isError: true })
    } finally {
      setSaveLoading(false)
    }
  }

  // Teardown subscriber links gracefully
  async function handleCancelSubscription() {
    setSaveLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('subscriptions').delete().eq('user_id', user.id)
      await supabase.from('profiles').update({ subscription_tier: 'none' }).eq('id', user.id)

      setSubscription(null)
      await checkUserAndFetchData()
      setMessage({ text: 'Active specifications detached safely.', isError: false })
    } catch (err: any) {
      setMessage({ text: 'Error executing subscription termination route.', isError: true })
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleUpdateCredentials(e: React.FormEvent) {
    e.preventDefault()
    setMessage({ text: '', isError: false })
    setSaveLoading(true)

    try {
      const updatePayload: any = { email: emailInput.trim() }
      if (passwordInput) updatePayload.password = passwordInput

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', profile.id)

      if (error) throw error

      setMessage({ text: 'Account settings parameters modified successfully.', isError: false })
      setPasswordInput('')
      checkUserAndFetchData()
    } catch (err: any) {
      setMessage({ text: err.message || 'Error executing credential update.', isError: true })
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    localStorage.clear()
    router.push('/login')
    router.refresh()
  }

  // PRESENTATION STYLES
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#020617',
    color: '#ffffff',
    fontFamily: 'sans-serif',
    padding: '40px 20px',
    boxSizing: 'border-box'
  }

  const navStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto 40px auto',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '20px'
  }

  const cardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    textAlign: 'left'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: '8px'
  }

  const metricStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: '800',
    margin: '0 0 4px 0',
    color: '#ffffff'
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
    boxSizing: 'border-box',
    marginBottom: '16px'
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading operational layout parameters...</p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* SHARED WORKSPACE NAVIGATION */}
      <nav style={navStyle}>
        <div style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#000000', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '20px', height: '20px', color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          StreamSphere Workspace
        </div>
        <button onClick={handleSignOut} style={{ background: '#1e293b', color: '#f87171', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          Terminate Session
        </button>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {message.text && (
          <div style={{ background: message.isError ? 'rgba(66,32,32,0.5)' : 'rgba(32,66,45,0.5)', border: '1px solid', borderColor: message.isError ? '#f87171' : '#4ade80', color: message.isError ? '#f87171' : '#4ade80', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
            {message.text}
          </div>
        )}
      </div>

      {/* CORE SPECIFICATION SWITCHBOARD */}
      {!subscription ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.025em' }}>Select an Infrastructure Plan</h2>
          <p style={{ color: '#64748b', marginBottom: '48px', fontSize: '15px' }}>Unlock system mapping and real-time parameters by completing configuration setup.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', fontWeight: '700' }}>Basic Plan</h3>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#818cf8', marginBottom: '16px' }}>
                ₹99 <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>/mo</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13.5px', marginBottom: '32px', lineHeight: '1.6', flexGrow: 1 }}>Access core logging dashboards and storage features.</p>
              <button onClick={() => handleSelectPlan(1)} disabled={saveLoading} style={{ background: '#1e293b', color: '#ffffff', border: '1px solid #334155', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>Select Basic Tier</button>
            </div>

            <div style={{ ...cardStyle, border: '2px solid #818cf8' }}>
              <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', fontWeight: '700' }}>Pro Plan</h3>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginBottom: '16px' }}>
                ₹299 <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>/mo</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13.5px', marginBottom: '32px', lineHeight: '1.6', flexGrow: 1 }}>Unlock analytical parameters and high speed maps.</p>
              <button onClick={() => handleSelectPlan(2)} disabled={saveLoading} style={{ background: '#818cf8', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>Select Pro Tier</button>
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', fontWeight: '700' }}>Enterprise Plan</h3>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginBottom: '16px' }}>
                ₹499 <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>/mo</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13.5px', marginBottom: '32px', lineHeight: '1.6', flexGrow: 1 }}>Dedicated infrastructure threads and premium access nodes.</p>
              <button onClick={() => handleSelectPlan(3)} disabled={saveLoading} style={{ background: '#1e293b', color: '#ffffff', border: '1px solid #334155', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>Select Enterprise Tier</button>
            </div>
          </div>
        </div>
      ) : (
        /* SYNCHRONIZED DASHBOARD VIEWPANELS */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={cardStyle}>
            <label style={labelStyle}>Active System Profiles</label>
            {/* 🚀 Dynamic Counter Field displays exact user data length now */}
            <div style={metricStyle}>{activeUserCount} {activeUserCount === 1 ? 'User' : 'Users'} Registered</div>
            <p style={{ color: '#64748b', margin: '0', fontSize: '13px' }}>
              User ID Reference: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{profile?.username || 'anonymous'}</span>
            </p>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Total Company Income</label>
            <div style={{ ...metricStyle, color: '#10b981' }}>₹{totalIncome}</div>
            <p style={{ color: '#64748b', margin: '0', fontSize: '13px' }}>Calculated dynamically based on active system tier choices.</p>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Account Credentials Control</label>
            <form onSubmit={handleUpdateCredentials}>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={inputStyle} required />
              <input type="password" placeholder="Leave blank to keep unchanged" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={inputStyle} />
              <button type="submit" style={{ background: '#818cf8', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', width: '100%', cursor: 'pointer' }}>Save Configuration changes</button>
            </form>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Active Specifications</label>
            <div style={{ fontSize: '26px', fontWeight: '800', marginBottom: '12px' }}>
              {profile?.subscription_tier && profile.subscription_tier !== 'none' ? profile.subscription_tier : 'Active User'} <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', marginLeft: '8px' }}>ACTIVE</span>
            </div>
            <p style={{ color: '#64748b', margin: '0 0 20px 0', fontSize: '13px', lineHeight: '1.5' }}>
              System Mapping Plan ID: {subscription?.plan_id || 'N/A'}<br />
              Cycle Log End Date: {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : '30 Days Remaining'}
            </p>
            <button onClick={handleCancelSubscription} disabled={saveLoading} style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
              Cancel Active Subscription Plan
            </button>
          </div>

          {/* REALTIME TIME CAPPED COUNTDOWN METRIC */}
          <div style={cardStyle}>
            <label style={labelStyle}>Time Capped Countdown</label>
            <div style={{ ...metricStyle, color: daysRemaining <= 5 ? '#f87171' : '#818cf8' }}>
              {daysRemaining}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
              Days until expiration
            </div>
            <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${(daysRemaining / 30) * 100}%`, height: '100%', background: daysRemaining <= 5 ? '#f87171' : '#818cf8', transition: 'width 0.3s ease' }} />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}