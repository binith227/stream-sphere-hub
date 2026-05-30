'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// Step out of login, out of app, and directly into your lib folder
import { supabase } from '../../lib/supabase'; 

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false); // 🚀 Set to false so "Sign In" is your starting screen
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    if (!email.trim() || !username.trim() || !firstName.trim() || !lastName.trim()) {
      setError('All fields are required to proceed.');
      return;
    }
    setStep(2);
  };

  const handleStepTwoSubmit = async (e: React.FormEvent) => {
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
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData?.user) {
        const combinedFullName = `${firstName.trim()} ${lastName.trim()}`;
        const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';

        // 2. Insert record into profiles table cleanly using .insert()
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id, 
              username: username.toLowerCase().trim(),
              full_name: combinedFullName,
              email: email.toLowerCase().trim(),
              password: password,
              avatar_url: defaultAvatar,
              subscription_tier: 'none'
            }
          ]);

        if (profileError) throw profileError;

        // 3. Smooth routing update
        router.push('/dashboard');
        router.refresh();
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

      // Smooth routing update
      router.push('/dashboard');
      router.refresh();
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
              STEP {step} OF 2 — {step === 1 ? 'REGISTRATION' : 'SECURITY'}
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
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>FIRST NAME</label>
                    <input 
                      type="text" 
                      placeholder="John" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      required 
                      style={inputStyle} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>LAST NAME</label>
                    <input 
                      type="text" 
                      placeholder="Doe" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      required 
                      style={inputStyle} 
                    />
                  </div>
                </div>

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
                  <button type="button" onClick={() => setStep(1)} style={{ padding: '14px 24px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
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