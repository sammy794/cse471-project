import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Building, Radio, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export const Register = ({ onSwitchToLogin }) => {
  const { register, error } = useAuth();
  const [step, setStep] = useState(1); // step 1: choose role, step 2: fill details
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const roles = [
    {
      key: 'single_person',
      label: 'Single Person',
      subtitle: 'Individual Citizen or Donor',
      icon: <User size={28} />,
      accent: '#8b5cf6',
      description: 'Submit emergency aid requests, track real-time deliveries, and donate to disaster relief funds.',
    },
    {
      key: 'organization',
      label: 'Organization / NGO',
      subtitle: 'Company or Relief Organization',
      icon: <Building size={28} />,
      accent: '#10b981',
      description: 'Manage warehouse inventories, fulfill resource requests, and run intelligent delivery logistics.',
    },
    {
      key: 'government',
      label: 'Government Authority',
      subtitle: 'Disaster Management Agency',
      icon: <Radio size={28} />,
      accent: '#3b82f6',
      description: 'Declare national disaster events, broadcast emergency evacuation alerts, and supervise lifecycle.',
    },
    {
      key: 'hospital',
      label: 'Hospital',
      subtitle: 'Emergency Healthcare Provider',
      icon: <span style={{ fontSize: '28px' }}>🏥</span>,
      accent: '#06b6d4',
      description: 'Request emergency medicine and equipment, update patient statistics, report capacity, track supplies and expenditure.',
    },
    {
      key: 'shelter',
      label: 'Disaster Shelter',
      subtitle: 'Shelter for Displaced Citizens',
      icon: <span style={{ fontSize: '28px' }}>🏠</span>,
      accent: '#f97316',
      description: 'Manage shelter capacity, occupancy and resources, request supplies, report shortages and record distributions.',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: selectedRole,
        organization_name: formData.organization_name || null,
        phone: formData.phone || null,
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: step === 1 ? '980px' : '520px' }}>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ef4444, #3b82f6)',
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            marginBottom: '16px',
            boxShadow: '0 8px 30px rgba(239, 68, 68, 0.4)',
          }}>
            <Shield size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white' }}>
            Disaster<span style={{ color: '#ef4444' }}>Net</span>
          </h1>
          <p style={{ color: '#9ca3af', marginTop: '6px' }}>
            {step === 1 ? 'Select your user role to create an account' : 'Complete your registration profile'}
          </p>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <h2 style={{ textAlign: 'center', color: 'white', fontSize: '1.3rem', marginBottom: '24px' }}>
              Choose Your Account Type
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {roles.map((role) => (
                <div
                  key={role.key}
                  onClick={() => setSelectedRole(role.key)}
                  className="glass-card"
                  style={{
                    cursor: 'pointer',
                    border: selectedRole === role.key ? `2px solid ${role.accent}` : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: selectedRole === role.key ? `0 0 20px ${role.accent}50` : '',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {selectedRole === role.key && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <CheckCircle size={20} color={role.accent} />
                    </div>
                  )}
                  <div style={{ color: role.accent, marginBottom: '12px' }}>{role.icon}</div>
                  <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '4px' }}>{role.label}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>{role.subtitle}</div>
                  <p style={{ fontSize: '0.82rem', color: '#d1d5db', lineHeight: 1.5 }}>{role.description}</p>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              disabled={!selectedRole}
              onClick={() => setStep(2)}
            >
              Continue as {roles.find(r => r.key === selectedRole)?.label || '...'} →
            </button>

            <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '20px', fontSize: '0.9rem' }}>
              Already have an account?{' '}
              <span
                onClick={onSwitchToLogin}
                style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign In
              </span>
            </p>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setStep(1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                ← Back
              </button>
              <div>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Create Your Account</h2>
                <span className={`badge badge-${selectedRole === 'single_person' ? 'user' : selectedRole === 'government' ? 'govt' : selectedRole}`}>
                  {roles.find(r => r.key === selectedRole)?.label}
                </span>
              </div>
            </div>

            {(formError || error) && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', color: '#f87171' }}>
                <AlertCircle size={16} /> {formError || error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="input-control"
                  required
                  placeholder={['organization', 'hospital', 'shelter'].includes(selectedRole) ? 'Primary contact person / coordinator' : 'Your full name'}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  className="input-control"
                  required
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-control"
                    required
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  className="input-control"
                  required
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>

              {['organization', 'hospital', 'shelter'].includes(selectedRole) && (
                <div className="form-group">
                  <label>{selectedRole === 'hospital' ? 'Hospital Name *' : selectedRole === 'shelter' ? 'Shelter Name *' : 'Organization Name *'}</label>
                  <input
                    type="text"
                    className="input-control"
                    required
                    placeholder={selectedRole === 'hospital' ? 'e.g. City Emergency Medical College Hospital' : selectedRole === 'shelter' ? 'e.g. Sunamganj Emergency Shelter #4' : 'e.g. BD Red Crescent Society'}
                    value={formData.organization_name}
                    onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Phone Number (Optional)</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="+8801711223344"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '8px' }}
              >
                {loading ? 'Creating Account...' : 'Register & Enter DisasterNet'}
              </button>
            </form>

            <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '20px', fontSize: '0.9rem' }}>
              Already have an account?{' '}
              <span
                onClick={onSwitchToLogin}
                style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign In
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
