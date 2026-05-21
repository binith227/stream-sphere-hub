'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!userId || !password) return alert("Please enter your ID and Password")
    setLoading(true)

    // Check if ID and Password match in the database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('password', password)
      .single()

    if (error || !data) {
      alert("Invalid User ID or Password. Please try again.")
      setLoading(false)
    } else {
      // SUCCESS: Save the user's ID in the browser's memory
      localStorage.setItem('current_user_id', data.id)
      localStorage.setItem('current_user_name', data.full_name)
      
      // Send them to the dashboard
      router.push('/dashboard')
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={logoStyle}>StreamSphere Login</h1>
        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Enter your credentials to access your hub</p>
        
        <input 
          placeholder="User ID (e.g., SS-1234)" 
          value={userId}
          onChange={e => setUserId(e.target.value)} 
          style={inputStyle} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={e => setPassword(e.target.value)} 
          style={inputStyle} 
        />
        
        <button onClick={handleLogin} disabled={loading} style={btnStyle}>
          {loading ? 'Authenticating...' : 'Access Hub'}
        </button>

        <p onClick={() => router.push('/')} style={linkStyle}>
          Don't have an ID? Register here
        </p>
      </div>
    </div>
  )
}

// STYLES (Matching your Registration page for a clean look)
const containerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#020617', color: 'white', fontFamily: 'sans-serif' }
const cardStyle: React.CSSProperties = { background: '#0f172a', padding: '40px', borderRadius: '24px', border: '1px solid #1e293b', textAlign: 'center', width: '100%', maxWidth: '380px' }
const logoStyle = { fontSize: '32px', fontWeight: 'bold', color: '#818cf8', marginBottom: '10px' }
const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #334155', background: '#020617', color: 'white', fontSize: '16px', boxSizing: 'border-box' as const }
const btnStyle = { width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }
const linkStyle = { color: '#818cf8', cursor: 'pointer', fontSize: '14px', marginTop: '20px', textDecoration: 'underline' }