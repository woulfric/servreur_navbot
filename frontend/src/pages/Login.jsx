import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Check } from 'lucide-react';
import './login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation simple
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Veuillez entrer un email valide');
      setLoading(false);
      return;
    }

    // Simulation de login
    try {
      setTimeout(() => {
        // Optionnel: Sauvegarder le choix "Remember Me"
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        } else {
          localStorage.removeItem('rememberEmail');
        }
        setLoading(false);
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError('Erreur lors de la connexion');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background decorative */}
      <div className="login-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="logo">🤖</div>
            <h1>NavBot</h1>
            <p className="subtitle">Plateforme de Supervision Robotique</p>
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Form */}
          <form onSubmit={handleLogin} className="login-form">
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={18} /></span>
                <input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Se souvenir de moi</span>
              </label>
              <a href="#" className="forgot-password">
                Mot de passe oublié?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Connexion en cours...
                </>
              ) : (
                'Se Connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>Ou continuer avec</span>
          </div>

          {/* Social Login */}
          <div className="social-login">
            <button type="button" className="social-btn google">
              Google
            </button>
            <button type="button" className="social-btn microsoft">
              Microsoft
            </button>
          </div>

          {/* Footer */}
          <p className="login-footer">
            Pas encore de compte? <a href="#">Créer un compte</a>
          </p>
        </div>

        {/* Info Section */}
        <div className="login-info">
          <h3>Bienvenue sur NavBot</h3>
          <ul className="info-list">
            <li><Check size={18} /> Supervision complète de vos robots</li>
            <li><Check size={18} /> Gestion centralisée des missions</li>
            <li><Check size={18} /> Analyse en temps réel</li>
            <li><Check size={18} /> Alertes et notifications instantanées</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
