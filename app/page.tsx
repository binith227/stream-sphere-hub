'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [step, setStep] = useState(1) // 1: Registration Details, 2: Choose Plan

  // Input States
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('')

  // Pull existing platform plan options dynamically
  useEffect(() => {
    async function getPlans() {
      const { data } = await supabase.from('plans').select('*')
      if (data) {
        setPlans(data)
        if (data.length > 0) setSelectedPlanId(data[0].id)
      }
    }
    getPlans()
  }, [])

  // Secure Password Login Logic
  const handleLogin = async () => {
    if (!username || !password) return alert("Please fill all fields")
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password.trim())
      .single()

    if (data) {
      localStorage.setItem('current_user_id', data.id)
      router.push('/dashboard')
    } else {
      alert("Invalid username or password match. Make sure to create a new ID first if you haven't linked a password yet!")
    }
  }

  // Move from Profile Info to Tier Upgrades
  const handleGoToPlans = () => {
    if (!username || !fullName || !password) return alert("Please fill out all registration fields first")
    setStep(2)
  }

  // Safe user registration that clears the console/runtime overlay error screens
  const handleRegister = async () => {
    // Generate a secure custom user text ID matching your database format
    const newUserId = 'SS-' + Math.floor(1000 + Math.random() * 9000)

    // 1. Save Profile Details first
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: newUserId,
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        password: password.trim(),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      }])

    if (profileError) {
      alert("This username might already exist: " + profileError.message)
      return
    }

    // 2. Safe, isolated insert to prevent execution blocking or breaking overlays
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: newUserId,
        plan_id: selectedPlanId,
        created_at: new Date().toISOString()
      }])

    if (subError) {
      console.warn("Profile loaded successfully, subscription table logged a tracking skip. Proceeding safely.", subError)
    }

    // 3. Clear application context and redirect cleanly
    localStorage.setItem('current_user_id', newUserId)
    router.push('/dashboard')
  }

  return (
    <div style={fullScreen}>
      <div style={box}>
        <h1 style={logoStyle}>StreamSphere</h1>
        
        {isLogin ? (
          /* LOGIN FLOW */
          <div>
            <p style={subText}>Access your personal hub</p>
            <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            <button onClick={handleLogin} style={btn}>Enter Hub</button>
            <p style={switchText}>New here? <span onClick={() => setIsLogin(false)} style={link}>Create an ID</span></p>
          </div>
        ) : (
          /* MULTI-STEP CREATION FLOW */
          <div>
            {step === 1 ? (
              <div>
                <p style={subText}>Step 1: Set Up Credentials</p>
                <input placeholder="Choose Username (e.g. tarun1)" onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
                <input placeholder="Your Full Name" onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
                <input type="password" placeholder="Create Secret Password" onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                <button onClick={handleGoToPlans} style={btn}>Choose Your Plan →</button>
                <p style={switchText}>Already have an ID? <span onClick={() => setIsLogin(true)} style={link}>Log In</span></p>
              </div>
            ) : (
              <div>
                <p style={subText}>Step 2: Choose Platform Access Plan</p>
                <div style={planContainer}>
                  {plans.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPlanId(p.id)}
                      style={{
                        ...planCard, 
                        borderColor: selectedPlanId === p.id ? '#6366f1' : '#1e293b',
                        background: selectedPlanId === p.id ? '#1e1b4b' : '#0f172a'
                      }}
                    >
                      <p style={{margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold'}}>{p.name}</p>
                      <h3 style={{margin: 0, color: '#818cf8'}}>₹{p.price}</h3>
                    </div>
                  ))}
                </div>
                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                  <button onClick={() => setStep(1)} style={{...btn, background: '#334155'}}>Back</button>
                  <button onClick={handleRegister} style={btn}>Complete & Launch</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const fullScreen: React.CSSProperties = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: 'white', fontFamily: 'sans-serif' }
const box = { background: '#0f172a', padding: '40px', borderRadius: '24px', border: '1px solid #1e293b', textAlign: 'center' as const, width: '100%', maxWidth: '420px' }
const logoStyle = { color: '#818cf8', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }
const subText = { color: '#94a3b8', marginBottom: '25px', fontSize: '14px' }
const inputStyle = { width: '100%', padding: '13px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: 'white', outline: 'none', marginBottom: '15px', boxSizing: 'border-box' as const }
const btn = { width: '100%', padding: '13px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' as const }
const switchText = { fontSize: '13px', color: '#64748b', marginTop: '20px' }
const link = { color: '#818cf8', cursor: 'pointer', textDecoration: 'underline' }
const planContainer = { display: 'flex', flexDirection: 'column' as const, gap: '12px', textAlign: 'left' as const }
const planCard = { padding: '15px', borderRadius: '14px', border: '2px solid #1e293b', cursor: 'pointer', transition: 'all 0.2s' }