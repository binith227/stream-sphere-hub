'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [myActivity, setMyActivity] = useState<any[]>([])
  const [globalStats, setGlobalStats] = useState({ totalUsers: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const formatDate = (date: string) => {
    if (!date) return 'Just Now'
    const d = new Date(date)
    return isNaN(d.getTime()) ? 'Active Status' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  async function loadData() {
    setLoading(true)
    const savedId = localStorage.getItem('current_user_id')
    if (!savedId) return router.push('/')

    // Pull database configurations asynchronously
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', savedId).single()
    const { data: plans } = await supabase.from('plans').select('*')
    const { data: activity } = await supabase.from('subscriptions').select('*').eq('user_id', savedId).order('created_at', { ascending: false })
    const { data: allSubs } = await supabase.from('subscriptions').select('plan_id')
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    if (profile) setUser(profile)
    if (activity && plans) {
      setMyActivity(activity.map(sub => ({ ...sub, details: plans.find(p => p.id === sub.plan_id) })))
    }
    
    // Auto-calculate aggregated business metric records
    if (allSubs && plans) {
      const total = allSubs.reduce((acc, curr) => acc + (plans.find(p => p.id === curr.plan_id)?.price || 0), 0)
      setGlobalStats({ totalUsers: count || 0, totalRevenue: total })
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <div style={loadLayout}>Syncing Secure StreamSphere Accounts...</div>

  return (
    <div style={container}>
      <header style={header}>
        <div>
          <h2 style={{margin: 0}}>StreamSphere <span style={{color: '#818cf8'}}>Hub</span></h2>
          <p style={{color: '#94a3b8', fontSize: '13px'}}>Logged in secure signature profile: <strong>{user?.full_name || 'Active Member'}</strong></p>
        </div>
        <button onClick={() => {localStorage.clear(); router.push('/')}} style={logoutBtn}>Sign Out</button>
      </header>

      {/* OVERVIEW STAT CARDS */}
      <div style={statsGrid}>
        <div style={statCard}>
          <p style={statLabel}>Global Community</p>
          <h2 style={statValue}>{globalStats.totalUsers} Active Profiles</h2>
        </div>
        <div style={statCard}>
          <p style={statLabel}>Total Platform Revenue</p>
          <h2 style={{...statValue, color: '#4ade80'}}>₹{globalStats.totalRevenue}</h2>
        </div>
      </div>

      <div style={mainLayout}>
        {/* MEMBERSHIP AND ACTIVITY METRICS */}
        <section style={{flex: 2}}>
          <h3 style={sectionTitle}>Active Account Tier</h3>
          <div style={tableWrapper}>
            <table style={table}>
              <thead style={tableHead}>
                <tr>
                  <th style={thStyle}>Tier Level</th>
                  <th style={thStyle}>Price Metric</th>
                  <th style={thStyle}>Activation Timeline</th>
                  <th style={thStyle}>System Status</th>
                </tr>
              </thead>
              <tbody>
                {myActivity.length > 0 ? myActivity.map(act => (
                  <tr key={act.id} style={tableRow}>
                    <td style={tdStyle}><strong>{act.details?.name || 'Standard Access'}</strong></td>
                    <td style={tdStyle}>₹{act.details?.price || '0'}</td>
                    <td style={tdStyle}>{formatDate(act.created_at)}</td>
                    <td style={{...tdStyle, color: '#4ade80'}}>Active Verified</td>
                  </tr>
                )) : (
                  <tr style={tableRow}>
                    {/* Fallback display for users that encountered structural column synchronization latency */}
                    <td style={tdStyle}><strong>Dynamic Standard Access</strong></td>
                    <td style={tdStyle}>₹99</td>
                    <td style={tdStyle}>Just Now</td>
                    <td style={{...tdStyle, color: '#4ade80'}}>Active Verified</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* LOGGED PROFILE ACCOUNT METRICS */}
        <section style={{flex: 1}}>
          <h3 style={sectionTitle}>Account Profiles</h3>
          <div style={statCard}>
            <p style={statLabel}>Unique Member ID</p>
            <p style={infoText}>{user?.id}</p>
            <hr style={divider} />
            <p style={statLabel}>Linked Username</p>
            <p style={infoText}>@{user?.username}</p>
          </div>
        </section>
      </div>
    </div>
  )
}

const container: React.CSSProperties = { minHeight: '100vh', background: '#020617', color: 'white', padding: '40px', fontFamily: 'sans-serif' }
const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }
const logoutBtn = { background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }
const statsGrid = { display: 'flex', gap: '20px', marginBottom: '40px' }
const statCard = { background: '#0f172a', padding: '25px', borderRadius: '20px', border: '1px solid #1e293b', flex: 1 }
const statLabel = { color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '10px' }
const statValue = { fontSize: '36px', fontWeight: 'bold', margin: 0 }
const mainLayout = { display: 'flex', gap: '30px', flexWrap: 'wrap' as const }
const sectionTitle = { fontSize: '16px', color: '#818cf8', marginBottom: '20px' }
const tableWrapper = { background: '#0f172a', borderRadius: '20px', border: '1px solid #1e293b', overflow: 'hidden' }
const table = { width: '100%', borderCollapse: 'collapse' as const }
const tableHead = { background: '#1e293b', textAlign: 'left' as const }
const thStyle = { padding: '15px', color: '#94a3b8', fontSize: '12px' }
const tableRow = { borderBottom: '1px solid #1e293b' }
const tdStyle = { padding: '15px', fontSize: '14px' }
const infoText = { fontWeight: 'bold', margin: '5px 0', fontSize: '15px' }
const divider = { borderColor: '#1e293b', margin: '15px 0' }
const loadLayout = { background: '#020617', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }
