import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { Bell, Lock } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import './settings.css';

const SETTINGS_STORAGE_KEY = 'navbot_settings';

const DEFAULT_SETTINGS = {
  darkMode: false,
  notifications: true,
  emailAlerts: true,
  soundAlerts: false,
  language: 'fr',
  theme: 'blue',
  autoSave: true,
  dataCollection: true,
  twoFactor: false,
};

export default function Settings() {
  const { isDarkMode, setThemeMode } = useTheme();
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, darkMode: isDarkMode });

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) {
      setSettings((prev) => ({ ...prev, darkMode: isDarkMode }));
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setSettings({ ...DEFAULT_SETTINGS, ...parsed, darkMode: isDarkMode });
      if (parsed.theme) {
        applyThemeVariant(parsed.theme);
      }
    } catch (error) {
      console.error('Impossible de lire les paramètres sauvegardés', error);
    }
  }, [isDarkMode]);

  const applyThemeVariant = (themeName) => {
    const root = document.documentElement;
    const variants = {
      blue: { primary: '#546FA8', secondary: '#24386E' },
      green: { primary: '#22C55E', secondary: '#081F5C' },
      purple: { primary: '#546FA8', secondary: '#081F5C' },
      orange: { primary: '#FF9800', secondary: '#24386E' },
    };

    const chosen = variants[themeName] || variants.blue;
    root.style.setProperty('--accent-primary', chosen.primary);
    root.style.setProperty('--accent-secondary', chosen.secondary);
  };

  const handleToggle = (key) => {
    const nextValue = !settings[key];

    if (key === 'darkMode') {
      setThemeMode(nextValue);
    }

    setSettings((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  };

  const handleSelectChange = (key, value) => {
    if (key === 'theme') {
      applyThemeVariant(value);
    }

    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    console.log('Settings saved:', settings);
    alert('Paramètres sauvegardés avec succès!');
  };

  const handleReset = () => {
    setThemeMode(false);
    applyThemeVariant(DEFAULT_SETTINGS.theme);
    setSettings({ ...DEFAULT_SETTINGS, darkMode: false });
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  };

  return (
    <DashboardLayout contentClassName="settings-layout">
      <div className="settings-container">
        <h1>Paramètres</h1>
        <div className="settings-grid">
          <Card title="🎨 Préférences Visuelles">
            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-label">
                  <span>Mode Sombre</span>
                  <span className="setting-description">Utiliser le thème sombre</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.darkMode}
                    onChange={() => handleToggle('darkMode')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <span>Thème de Couleur</span>
                  <span className="setting-description">Sélectionnez votre thème favori</span>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSelectChange('theme', e.target.value)}
                  className="settings-select"
                >
                  <option value="blue">Bleu</option>
                  <option value="green">Vert</option>
                  <option value="purple">Violet</option>
                  <option value="orange">Orange</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <span>Langue</span>
                  <span className="setting-description">Choisir votre langue préférée</span>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => handleSelectChange('language', e.target.value)}
                  className="settings-select"
                >
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="de">Allemand</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title={<><Bell size={18} /> Notifications et Alertes</>}>
            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-label">
                  <span>Notifications Activées</span>
                  <span className="setting-description">Recevoir les notifications du système</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={() => handleToggle('notifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <span>Alertes par Email</span>
                  <span className="setting-description">Recevoir les alertes par email</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.emailAlerts}
                    onChange={() => handleToggle('emailAlerts')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <span>Alertes Sonores</span>
                  <span className="setting-description">Activer les sons d'alerte</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.soundAlerts}
                    onChange={() => handleToggle('soundAlerts')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </Card>

          <Card title={<><Lock size={18} /> Données et Confidentialité</>}>
            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-label">
                  <span>Sauvegarde Automatique</span>
                  <span className="setting-description">Sauvegarder automatiquement vos données</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={() => handleToggle('autoSave')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <span>Authentification Deux Facteurs</span>
                  <span className="setting-description">Sécuriser votre compte</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.twoFactor}
                    onChange={() => handleToggle('twoFactor')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <span>Collecte de Données Anonymes</span>
                  <span className="setting-description">Nous aider à améliorer l'application</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.dataCollection}
                    onChange={() => handleToggle('dataCollection')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </Card>
        </div>

        {/* Boutons d'Action */}
        <div className="settings-actions">
          <button className="btn-reset" onClick={handleReset}>
            Réinitialiser
          </button>
          <button className="btn-save" onClick={handleSave}>
            Enregistrer les Paramètres
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
