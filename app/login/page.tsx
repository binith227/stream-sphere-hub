'use client';

import React, { useState } from 'react';
// Updated to target the new lib folder created by your AI assistant
import { supabase } from '../../lib/supabase'; 

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Enterprise');
  const [planId, setPlanId] = useState(3);

  // Toggle Eye visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline CSS Styles
  const containerStyle: React.CSSProperties = {
    backgroundColor: '#020617',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
    border: '1px solid #1e293b',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '15px',
    marginTop: '8px',
    marginBottom: '20px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.05em',
  };

  const linkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    fontWeight: '600',
    marginLeft: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline',
  };

  const eyeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    right: '16px',
    top: '43px',
    background: 'none',
    border: 'none',
    color: '#818cf8',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  };

  const validatePassword = (pass: string) => {
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
    return hasLetters && hasNumbers && hasSpecial;
  };

  const handleStepOneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !username.trim()) {
      setError('Email and Username are mandatory fields.');
      return;
    }
    setStep(2);
  };

  const handleStepTwoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    setStep(3);
  };

  const handleStepThreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must contain letters, numbers, and at least one special character.');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id, 
            username: username.toLowerCase().trim(),
            full_name: fullName,
            plan_tier: selectedPlan,
            system_plan_id: planId,
            cycle_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          });

        if (profileError) throw profileError;

        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#1e293b', borderRadius: '50%', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>👁️</span>
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.025em' }}>
            StreamSphere
          </h1>
          {isSignUp && (
            <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              STEP {step} OF 3 — {step === 1 ? 'REGISTRATION' : step === 2 ? 'PLAN SELECTION' : 'SECURITY'}
            </p>
          )}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            {error}
          </div>
        )}

        {/* --- SIGN IN FORM --- */}
        {!isSignUp && (
          <form onSubmit={handleLoginSubmit}>
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
            
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>PASSWORD</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={inputStyle} 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: '#818cf8', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* --- MULTI-STEP SIGN UP FORM --- */}
        {isSignUp && (
          <>
            {step === 1 && (
              <form onSubmit={handleStepOneSubmit}>
                <div>
                  <label style={labelStyle}>CHOOSE USERNAME</label>
                  <input 
                    type="text" 
                    placeholder="e.g. tarun1" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                    style={inputStyle} 
                  />
                </div>
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
                <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#818cf8', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                  Next Step
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStepTwoSubmit}>
                <div>
                  <label style={labelStyle}>FULL NAME</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    required 
                    style={inputStyle} 
                  />
                </div>

                <label style={labelStyle}>SELECT SUBSCRIPTION TIER</label>
                <div style={{ marginTop: '8px', marginBottom: '24px' }}>
                  
                  <div 
                    onClick={() => { setSelectedPlan('Basic'); setPlanId(1); }}
                    style={{ padding: '20px', backgroundColor: selectedPlan === 'Basic' ? '#1e293b' : '#0f172a', border: selectedPlan === 'Basic' ? '2px solid #818cf8' : '1px solid #334155', borderRadius: '12px', marginBottom: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: '700' }}>Basic</div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>Standard monitoring modules</div>
                    </div>
                    <div style={{ color: '#818cf8', fontWeight: '700' }}>Custom price package</div>
                  </div>

                  <div 
                    onClick={() => { setSelectedPlan('Pro'); setPlanId(2); }}
                    style={{ padding: '20px', backgroundColor: selectedPlan === 'Pro' ? '#1e293b' : '#0f172a', border: selectedPlan === 'Pro' ? '2px solid #818cf8' : '1px solid #334155', borderRadius: '12px', marginBottom: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: '700' }}>Pro</div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>Advanced stream diagnostics</div>
                    </div>
                    <div style={{ color: '#818cf8', fontWeight: '700' }}>Custom price package</div>
                  </div>

                  <div 
                    onClick={() => { setSelectedPlan('Enterprise'); setPlanId(3); }}
                    style={{ padding: '20px', backgroundColor: selectedPlan === 'Enterprise' ? '#1e293b' : '#0f172a', border: selectedPlan === 'Enterprise' ? '2px solid #818cf8' : '1px solid #334155', borderRadius: '12px', marginBottom: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: '700' }}>Enterprise</div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>Uncapped configurations</div>
                    </div>
                    <div style={{ color: '#818cf8', fontWeight: '700' }}>Custom price package</div>
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setStep(1)} style={{ padding: '14px 24px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                    Back
                  </button>
                  <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: '#818cf8', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                    Continue →
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleStepThreeSubmit}>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>CREATE PASSWORD</label>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    style={inputStyle} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <label style={labelStyle}>CONFIRM PASSWORD</label>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    style={inputStyle} 
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeBtnStyle}>
                    {showConfirmPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setStep(2)} style={{ padding: '14px 24px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                    Back
                  </button>
                  <button type="submit" disabled={loading} style={{ flex: 1, padding: '14px', backgroundColor: '#818cf8', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                    {loading ? 'Creating Account...' : 'Complete Sign Up'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '28px', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            {isSignUp ? 'Already have an account?' : 'Need an account?'}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setStep(1);
                setError('');
              }}
              style={linkStyle}
            >
              {isSignUp ? 'Sign In' : 'Create One'}
            </button>
          </span>
        </div>

      </div>
    </div>
  );
}