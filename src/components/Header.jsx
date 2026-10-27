import React from 'react';
import { useTransit } from '../context/TransitContext';
import { Map, Search, Car, Globe, SlidersHorizontal, User, Menu, X } from 'lucide-react';

export default function Header() {
  const {
    language,
    setLanguage,
    t,
    activeTab,
    setActiveTab,
    setShowStandModal,
    setShowWelcomeModal,
    setShowPreferencesModal
  } = useTransit();

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === 'stands') {
      setShowStandModal(true);
    } else if (tab === 'welcome') {
      setShowWelcomeModal(true);
    } else if (tab === 'preferences') {
      setShowPreferencesModal(true);
    }
  };

  return (
    <>
      <header className="app-header">
        {/* Brand Logo & Subtitle */}
        <div className="header-left">
          <div className="logo-badge" title="AutoPath Kolkata">
            {/* Kolkata 3-wheeler auto rickshaw silhouette */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 8h-1.26a8 8 0 0 0-11.48 0H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1.1a3 3 0 0 0 5.8 0h4.2a3 3 0 0 0 5.8 0H21a1 1 0 0 0 1-1v-5a2 2 0 0 0-2-2zM9 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm10 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3-6H8V7.5A1.5 1.5 0 0 1 9.5 6h5A1.5 1.5 0 0 1 16 7.5V10z" />
            </svg>
          </div>
          <div className="logo-text-block">
            <div className="logo-title-row">
              <span className="logo-brand">{t.appName}</span>
              <span className="logo-bengali">{t.appSubName}</span>
            </div>
            <span className="logo-tagline">{t.appTagline}</span>
          </div>
        </div>

        {/* Center Navigation Tabs - Google Stitch Style */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => handleTabClick('map')}
            id="tab-interactive-map"
          >
            <Map size={15} />
            <span>{t.navMap}</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => handleTabClick('search')}
            id="tab-route-search"
          >
            <Search size={15} />
            <span>{t.navSearch}</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'stands' ? 'active' : ''}`}
            onClick={() => handleTabClick('stands')}
            id="tab-auto-stands"
          >
            <Car size={15} />
            <span>{t.navStands}</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'welcome' ? 'active' : ''}`}
            onClick={() => handleTabClick('welcome')}
            id="tab-welcome-lang"
          >
            <Globe size={15} />
            <span>{t.navWelcome}</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => handleTabClick('preferences')}
            id="tab-preferences"
          >
            <SlidersHorizontal size={15} />
            <span>{t.navPreferences}</span>
          </button>
        </nav>

        {/* Header Right Actions */}
        <div className="header-right">
          {/* Language Switcher Pill */}
          <div className="lang-switcher-pill" role="group" aria-label="Language Selector">
            <button
              className={`lang-pill-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
              title="English"
              id="lang-btn-en"
            >
              EN
            </button>
            <button
              className={`lang-pill-btn ${language === 'bn' ? 'active' : ''}`}
              onClick={() => setLanguage('bn')}
              title="বাংলা (Bengali)"
              id="lang-btn-bn"
            >
              বাংলা
            </button>
            <button
              className={`lang-pill-btn ${language === 'hi' ? 'active' : ''}`}
              onClick={() => setLanguage('hi')}
              title="हिन्दी (Hindi)"
              id="lang-btn-hi"
            >
              হি
            </button>
          </div>

          {/* Profile Circle Button */}
          <button
            className="user-profile-btn"
            title="Transit Profile & Settings"
            onClick={() => setShowPreferencesModal(true)}
            id="btn-profile-preferences"
          >
            <User size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible on mobile screens) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          className={`mobile-nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => handleTabClick('map')}
        >
          <Map size={18} />
          <span>{t.navMap}</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => handleTabClick('search')}
        >
          <Search size={18} />
          <span>{t.navSearch}</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'stands' ? 'active' : ''}`}
          onClick={() => handleTabClick('stands')}
        >
          <Car size={18} />
          <span>{t.navStands}</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'welcome' ? 'active' : ''}`}
          onClick={() => handleTabClick('welcome')}
        >
          <Globe size={18} />
          <span>{t.navWelcome}</span>
        </button>
      </nav>
    </>
  );
}
