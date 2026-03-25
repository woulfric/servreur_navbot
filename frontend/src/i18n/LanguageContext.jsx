import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SETTINGS_STORAGE_KEY = 'navbot_settings';

const messages = {
  fr: {
    nav: {
      dashboard: 'Dashboard',
      robots: 'Robots',
      maps: 'Maps',
      teleop: 'Teleop',
      mapping: 'Mapping (SLAM)',
      poi: 'POI',
      missions: 'Missions',
      history: 'History',
      alerts: 'Alerts',
      settings: 'Settings',
      terms: 'Terms',
      privacy: 'Privacy',
      created: 'Cree en 2026'
    },
    topbar: {
      menu: 'Menu',
      openNav: 'Ouvrir le menu de navigation',
      actions: 'Actions',
      lightMode: 'Mode clair',
      darkMode: 'Mode sombre',
      switchLight: 'Passer en mode clair',
      switchDark: 'Passer en mode sombre',
      notifications: 'Notifications',
      openNotifications: 'Afficher les notifications (Esc pour fermer)',
      profile: 'Profil',
      goProfile: 'Aller au profil utilisateur'
    },
    notifications: {
      title: 'Notifications',
      close: 'Fermer les notifications',
      closeEsc: 'Fermer (Esc)',
      none: 'Aucune notification',
      markAllRead: 'Marquer tout comme lu',
      missionCompleted: 'Mission completee',
      missionCompletedMsg: 'La mission M-001 est terminee avec succes',
      lowBattery: 'Batterie faible',
      lowBatteryMsg: 'Le robot R-02 a une batterie a 20%',
      newMap: 'Nouvelle carte',
      newMapMsg: 'Une nouvelle carte a ete ajoutee au systeme',
      connectionError: 'Erreur de connexion',
      connectionErrorMsg: 'Impossible de se connecter au robot R-05',
      sync: 'Synchronisation',
      syncMsg: 'Les donnees ont ete synchronisees',
      min: 'min',
      hour: 'heure',
      hours: 'heures'
    },
    settings: {
      title: 'Parametres',
      visual: 'Preferences Visuelles',
      darkMode: 'Mode Sombre',
      darkModeDesc: 'Utiliser le theme sombre',
      colorTheme: 'Theme de Couleur',
      colorThemeDesc: 'Selectionnez votre theme favori',
      language: 'Langue',
      languageDesc: 'Choisir votre langue preferee',
      blue: 'Bleu',
      green: 'Vert',
      purple: 'Violet',
      orange: 'Orange',
      french: 'Francais',
      english: 'Anglais',
      notifications: 'Notifications et Alertes',
      notificationsEnabled: 'Notifications Activees',
      notificationsEnabledDesc: 'Recevoir les notifications du systeme',
      emailAlerts: 'Alertes par Email',
      emailAlertsDesc: 'Recevoir les alertes par email',
      soundAlerts: 'Alertes Sonores',
      soundAlertsDesc: 'Activer les sons d\'alerte',
      privacy: 'Donnees et Confidentialite',
      autoSave: 'Sauvegarde Automatique',
      autoSaveDesc: 'Sauvegarder automatiquement vos donnees',
      twoFactor: 'Authentification Deux Facteurs',
      twoFactorDesc: 'Securiser votre compte',
      dataCollection: 'Collecte de Donnees Anonymes',
      dataCollectionDesc: 'Nous aider a ameliorer l\'application',
      reset: 'Reinitialiser',
      save: 'Enregistrer les Parametres',
      saved: 'Parametres sauvegardes avec succes!'
    },
    common: {
      selectRobot: 'Veuillez selectionner un robot',
      none: 'Aucun',
      connected: 'Connecte',
      operational: 'Operationnel',
      online: 'En ligne',
      offline: 'Hors ligne',
      idle: 'En attente'
    }
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      robots: 'Robots',
      maps: 'Maps',
      teleop: 'Teleop',
      mapping: 'Mapping (SLAM)',
      poi: 'POI',
      missions: 'Missions',
      history: 'History',
      alerts: 'Alerts',
      settings: 'Settings',
      terms: 'Terms',
      privacy: 'Privacy',
      created: 'Created in 2026'
    },
    topbar: {
      menu: 'Menu',
      openNav: 'Open navigation menu',
      actions: 'Actions',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
      switchLight: 'Switch to light mode',
      switchDark: 'Switch to dark mode',
      notifications: 'Notifications',
      openNotifications: 'Show notifications (Esc to close)',
      profile: 'Profile',
      goProfile: 'Go to user profile'
    },
    notifications: {
      title: 'Notifications',
      close: 'Close notifications',
      closeEsc: 'Close (Esc)',
      none: 'No notifications',
      markAllRead: 'Mark all as read',
      missionCompleted: 'Mission completed',
      missionCompletedMsg: 'Mission M-001 has completed successfully',
      lowBattery: 'Low battery',
      lowBatteryMsg: 'Robot R-02 battery is at 20%',
      newMap: 'New map',
      newMapMsg: 'A new map was added to the system',
      connectionError: 'Connection error',
      connectionErrorMsg: 'Unable to connect to robot R-05',
      sync: 'Synchronization',
      syncMsg: 'Data has been synchronized',
      min: 'min',
      hour: 'hour',
      hours: 'hours'
    },
    settings: {
      title: 'Settings',
      visual: 'Visual Preferences',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Use dark theme',
      colorTheme: 'Color Theme',
      colorThemeDesc: 'Choose your favorite theme',
      language: 'Language',
      languageDesc: 'Choose your preferred language',
      blue: 'Blue',
      green: 'Green',
      purple: 'Purple',
      orange: 'Orange',
      french: 'French',
      english: 'English',
      notifications: 'Notifications and Alerts',
      notificationsEnabled: 'Notifications Enabled',
      notificationsEnabledDesc: 'Receive system notifications',
      emailAlerts: 'Email Alerts',
      emailAlertsDesc: 'Receive alerts by email',
      soundAlerts: 'Sound Alerts',
      soundAlertsDesc: 'Enable alert sounds',
      privacy: 'Data and Privacy',
      autoSave: 'Auto Save',
      autoSaveDesc: 'Automatically save your data',
      twoFactor: 'Two-Factor Authentication',
      twoFactorDesc: 'Secure your account',
      dataCollection: 'Anonymous Data Collection',
      dataCollectionDesc: 'Help us improve the app',
      reset: 'Reset',
      save: 'Save Settings',
      saved: 'Settings saved successfully!'
    },
    common: {
      selectRobot: 'Please select a robot',
      none: 'None',
      connected: 'Connected',
      operational: 'Operational',
      online: 'Online',
      offline: 'Offline',
      idle: 'Idle'
    }
  }
};

const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.language === 'fr' || parsed?.language === 'en') {
        return parsed.language;
      }
    }
  } catch (error) {
    console.error('Unable to read saved language', error);
  }

  return 'fr';
}

function getByPath(object, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const setLanguage = (nextLanguage) => {
    if (nextLanguage !== 'fr' && nextLanguage !== 'en') return;

    setLanguageState(nextLanguage);

    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...parsed, language: nextLanguage })
      );
    } catch (error) {
      console.error('Unable to persist language setting', error);
    }
  };

  const t = (key) => {
    const found = getByPath(messages[language], key);
    return found !== undefined ? found : key;
  };

  const value = useMemo(
    () => ({ language, setLanguage, t, isEnglish: language === 'en' }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return context;
}
