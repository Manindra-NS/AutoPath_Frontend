import React from 'react';
import { useTransit } from '../context/TransitContext';
import { Globe, Check, Sparkles, X, Shield, MapPin, Milestone } from 'lucide-react';

export default function LanguageModal() {
  const {
    showWelcomeModal,
    setShowWelcomeModal,
    language,
    setLanguage,
    t
  } = useTransit();

  if (!showWelcomeModal) return null;

  const languages = [
    {
      code: 'en',
      name: 'English',
      native: 'English',
      subtitle: t.langEnDesc,
      flagLabel: 'Transit Standard'
    },
    {
      code: 'bn',
      name: 'Bengali',
      native: 'বাংলা',
      subtitle: t.langBnDesc,
      flagLabel: 'Kolkata Native'
    },
    {
      code: 'hi',
      name: 'Hindi',
      native: 'हिन्दी',
      subtitle: t.langHiDesc,
      flagLabel: 'Devanagari'
    }
  ];

  return (
    <div className="modal-backdrop" onClick={() => setShowWelcomeModal(false)}>
      <div
        className="welcome-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        {/* Header */}
        <div className="welcome-header">
          <div className="welcome-logo-badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 8h-1.26a8 8 0 0 0-11.48 0H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1.1a3 3 0 0 0 5.8 0h4.2a3 3 0 0 0 5.8 0H21a1 1 0 0 0 1-1v-5a2 2 0 0 0-2-2zM9 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm10 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3-6H8V7.5A1.5 1.5 0 0 1 9.5 6h5A1.5 1.5 0 0 1 16 7.5V10z" />
            </svg>
          </div>
          <h1 className="welcome-title" id="welcome-title">
            {t.welcomeTitle}
          </h1>
          <p className="welcome-subtitle">{t.welcomeSubtitle}</p>
        </div>

        {/* Language Selection Grid */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '10px',
              letterSpacing: '0.04em'
            }}
          >
            {t.selectLanguage}
          </div>

          <div className="language-cards-grid">
            {languages.map((item) => (
              <div
                key={item.code}
                className={`lang-select-card ${language === item.code ? 'active' : ''}`}
                onClick={() => setLanguage(item.code)}
                id={`lang-choice-${item.code}`}
              >
                <span className="lang-card-code">{item.flagLabel}</span>
                <span className="lang-native-script">{item.native}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {item.subtitle}
                </span>
                {language === item.code && (
                  <span
                    style={{
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--brand-green)'
                    }}
                  >
                    <Check size={14} /> Selected
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* How Kolkata Shared Autos Work Guide */}
        <div className="welcome-guide-box">
          <div className="guide-box-title">{t.guideHeader}</div>
          <div className="guide-points-list">
            <div className="guide-point-row">
              <span className="guide-point-bullet">1</span>
              <div className="guide-point-text">
                <strong>{t.guidePoint1Title}:</strong> {t.guidePoint1Desc}
              </div>
            </div>
            <div className="guide-point-row">
              <span className="guide-point-bullet">2</span>
              <div className="guide-point-text">
                <strong>{t.guidePoint2Title}:</strong> {t.guidePoint2Desc}
              </div>
            </div>
            <div className="guide-point-row">
              <span className="guide-point-bullet">3</span>
              <div className="guide-point-text">
                <strong>{t.guidePoint3Title}:</strong> {t.guidePoint3Desc}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          className="btn-get-started"
          onClick={() => setShowWelcomeModal(false)}
          id="btn-get-started-welcome"
        >
          {t.getStarted} →
        </button>
      </div>
    </div>
  );
}
