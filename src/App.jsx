import React from 'react';
import { TransitProvider, useTransit } from './context/TransitContext';
import Header from './components/Header';
import Footer from './components/Footer';
import MapView from './components/MapView';
import InteractiveMapPanel from './components/InteractiveMapPanel';
import RouteSearchPanel from './components/RouteSearchPanel';
import AutoStandsModal from './components/AutoStandsModal';
import LanguageModal from './components/LanguageModal';
import PreferencesModal from './components/PreferencesModal';

function MainApp() {
  const { activeTab } = useTransit();

  return (
    <div className="app-container">
      {/* Top Navigation Header */}
      <Header />

      {/* Main View Area */}
      <main className="main-content">
        {/* If Interactive Map mode (Image 1) */}
        {activeTab === 'map' && (
          <>
            <InteractiveMapPanel />
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <MapView />
            </div>
          </>
        )}

        {/* If Route Search mode */}
        {activeTab === 'search' && (
          <>
            <RouteSearchPanel />
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <MapView />
            </div>
          </>
        )}

        {/* If Preferences active as tab */}
        {activeTab === 'preferences' && (
          <>
            <InteractiveMapPanel />
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <MapView />
            </div>
          </>
        )}
      </main>

      {/* Global Modals */}
      <AutoStandsModal />
      <LanguageModal />
      <PreferencesModal />

      {/* Bottom Legal & Data Source Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <TransitProvider>
      <MainApp />
    </TransitProvider>
  );
}
