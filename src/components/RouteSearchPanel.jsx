import React, { useState } from 'react';
import { useTransit } from '../context/TransitContext';
import { popularStandSuggestions } from '../data/searchSuggestions';
import {
  Search,
  ArrowDownUp,
  MapPin,
  CheckCircle2,
  X,
  Compass,
  AlertTriangle,
  WifiOff,
  Navigation,
  Train,
  Building,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function RouteSearchPanel() {
  const {
    t,
    searchFrom,
    setSearchFrom,
    searchTo,
    setSearchTo,
    handleSwapStands,
    searchResults,
    executeSearch,
    isLoadingRoutes,
    apiError,
    systemState,
    setSystemState,
    setSelectedRouteId,
    setActiveTab,
    setShowStandModal
  } = useTransit();

  const [fareModalOpen, setFareModalOpen] = useState(false);

  // Filter suggestions based on searchTo
  const suggestions = popularStandSuggestions.filter((item) => {
    if (!searchTo) return true;
    const q = searchTo.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.bengaliName.includes(q) ||
      item.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleSelectSuggestion = (stand) => {
    setSearchTo(stand.name);
    executeSearch(searchFrom, stand.name);
  };

  const handleFindRoutesClick = () => {
    setSystemState('A');
    executeSearch(searchFrom, searchTo);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFindRoutesClick();
    }
  };

  const handleVisualizeOnMap = (routeId) => {
    setSelectedRouteId(routeId);
    setActiveTab('map');
  };

  const handleViewStandDetails = () => {
    setShowStandModal(true);
  };

  return (
    <aside className="search-sidebar" aria-label="Route Search and Planner">
      {/* Top Banner */}
      <div className="kma-certified-banner">
        <span className="kma-badge">
          <CheckCircle2 size={12} />
          {t.routePlanner} • {t.kmaCertified}
        </span>
        <span className="kma-zone">{t.suburbanZone}</span>
      </div>

      {/* From / To Search Input Box */}
      <div className="search-inputs-box">
        {/* From Field */}
        <div className="search-field-row">
          <div className="search-field-content">
            <span className="search-field-label">From (উৎপত্তিস্থল)</span>
            <input
              type="text"
              className="search-field-input"
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Origin stand..."
            />
          </div>
          <span className="gps-located-badge" title="Location verified via GPS">
            <MapPin size={10} />
            GPS Located
          </span>
        </div>

        {/* Swap Floating Button */}
        <button
          className="swap-btn-floating"
          onClick={handleSwapStands}
          title="Swap Locations"
          aria-label="Swap Locations"
        >
          <ArrowDownUp size={16} />
        </button>

        {/* To Field */}
        <div className="search-field-row">
          <div className="search-field-content">
            <span className="search-field-label">To (গন্তব্যস্থল)</span>
            <input
              type="text"
              className="search-field-input"
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Destination stand..."
            />
          </div>
          {searchTo && (
            <button
              onClick={() => {
                setSearchTo('');
                executeSearch(searchFrom, '');
              }}
              style={{ color: '#94A3B8' }}
              title="Clear destination"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="search-actions-row">
          <button
            className="btn-find-routes"
            onClick={handleFindRoutesClick}
            id="btn-find-routes"
            disabled={isLoadingRoutes}
          >
            {isLoadingRoutes ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
            <span>{isLoadingRoutes ? 'Searching Corridors...' : t.findRoutesBtn}</span>
          </button>
          <button
            className="btn-fare-estimator"
            onClick={() => setFareModalOpen(!fareModalOpen)}
            id="btn-fare-estimator"
          >
            <span>₹</span>
            <span>{t.fareEstimatorBtn}</span>
          </button>
        </div>
      </div>

      {/* Backend API Error Banner */}
      {apiError && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
              Backend Connection Notice
            </div>
            <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
              {apiError}
            </div>
            <button
              onClick={() => executeSearch(searchFrom, searchTo)}
              style={{
                marginTop: '8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#991B1B',
                background: '#FEE2E2',
                padding: '4px 10px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={12} />
              Retry Search
            </button>
          </div>
        </div>
      )}

      {/* Fare Estimator Quick Calculator Drawer if toggled */}
      {fareModalOpen && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '12px'
          }}
        >
          <div style={{ fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
            Kolkata Shared Auto Fare Formula (Govt Gazetted)
          </div>
          <p style={{ color: '#374151', marginBottom: '6px' }}>
            Base fare: ₹12 for first 2 km, then ₹2.50 per km. Fixed union stops may have
            standard rounded brackets (e.g. Ruby to Gariahat is ₹16 - ₹18 fixed per passenger).
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Single Seat Share: ₹16</span>
            <span style={{ color: '#15803d' }}>Full Auto Reserve (4 seats): ~₹64 - ₹70</span>
          </div>
        </div>
      )}

      {/* Recognized Stands Dropdown / Suggestions */}
      {(systemState === 'C' || (!searchTo || searchTo.toLowerCase().includes('gar'))) && (
        <div className="suggestions-panel">
          <div className="suggestions-header">
            <span>
              {t.recognizedStands} "{searchTo || 'GARIA...'}"
            </span>
            <span>{t.autoHubNetwork}</span>
          </div>

          <div className="suggestions-list">
            {suggestions.slice(0, 4).map((stand) => (
              <div
                key={stand.id}
                className="suggestion-item"
                onClick={() => handleSelectSuggestion(stand)}
              >
                <div className="suggestion-left">
                  <div className="suggestion-icon-wrap">
                    {stand.iconType === 'tram' ? (
                      <Train size={16} />
                    ) : stand.iconType === 'metro' ? (
                      <Building size={16} />
                    ) : (
                      <Navigation size={16} />
                    )}
                  </div>
                  <div className="suggestion-titles">
                    <div className="suggestion-name-row">
                      <span className="suggestion-name">{stand.name}</span>
                      {stand.tag && <span className="suggestion-tag">{stand.tag}</span>}
                    </div>
                    <span className="suggestion-desc">{stand.description}</span>
                  </div>
                </div>
                <div className="suggestion-right">
                  <div className="suggestion-dist">{stand.distance}</div>
                  <div className="suggestion-routes-count">{stand.routesCount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System State Switcher (Screen 7 Explorations) */}
      <div className="state-switcher-box">
        <div className="state-switcher-title">
          <span>{t.systemStateSwitcher}</span>
          <span style={{ color: '#0D5C3A' }}>{t.interactivePreviewMode}</span>
        </div>
        <div className="state-buttons-row">
          <button
            className={`state-btn ${systemState === 'A' ? 'active' : ''}`}
            onClick={() => setSystemState('A')}
            title="Active 3 Matching Routes"
          >
            {t.stateActive}
          </button>
          <button
            className={`state-btn ${systemState === 'B' ? 'active' : ''}`}
            onClick={() => setSystemState('B')}
            title="Empty state: No direct route"
          >
            {t.stateNoDirect}
          </button>
          <button
            className={`state-btn ${systemState === 'C' ? 'active' : ''}`}
            onClick={() => setSystemState('C')}
            title="Autocomplete suggestions"
          >
            {t.stateAutocomplete}
          </button>
          <button
            className={`state-btn ${systemState === 'D' ? 'active' : ''}`}
            onClick={() => setSystemState('D')}
            title="GPS Location notice"
          >
            {t.stateNotice}
          </button>
          <button
            className={`state-btn ${systemState === 'E' ? 'active' : ''}`}
            onClick={() => setSystemState('E')}
            title="Offline cached fallback"
          >
            {t.stateOffline}
          </button>
        </div>
      </div>

      {/* State D: Location Notice */}
      {systemState === 'D' && (
        <div
          style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          <Compass size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#1E40AF' }}>
              GPS Location Calibrated (EM Bypass Zone)
            </div>
            <p style={{ fontSize: '12px', color: '#3B82F6', marginTop: '2px' }}>
              Your current device location is at <strong>Ruby More Junction</strong> (±6m accuracy).
              Found 4 registered auto bays within 400m radius.
            </p>
          </div>
        </div>
      )}

      {/* State E: Offline Cached Notice */}
      {systemState === 'E' && (
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          <WifiOff size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#92400E' }}>
              Offline Mode Active (Offline Cached Corridors)
            </div>
            <p style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
              {t.offlineNotice} Showing pre-loaded corridor guides for Ruby More, Gariahat, Jadavpur
              8B, and Garia Metro.
            </p>
          </div>
        </div>
      )}

      {/* State B or Empty Results: Empty / No Direct Route State */}
      {(systemState === 'B' || (searchResults.length === 0 && !isLoadingRoutes && !apiError)) && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {t.noRoutesFound}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {t.suggestAlternative}
            </p>
          </div>
          <button
            className="btn-card-primary"
            style={{ width: 'auto', padding: '8px 20px' }}
            onClick={() => {
              setSearchTo('Gariahat');
              setSystemState('A');
              executeSearch('Ruby More', 'Gariahat');
            }}
          >
            Show Connecting Corridors via Jadavpur 8B
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoadingRoutes && (
        <div
          style={{
            padding: '30px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Loader2 size={26} className="animate-spin" color="var(--brand-green)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Querying Kolkata transit corridors...</span>
        </div>
      )}

      {/* State A / Normal Results Mode: Found Matching Auto Corridors */}
      {systemState !== 'B' && searchResults.length > 0 && !isLoadingRoutes && (
        <>
          <div className="results-header-row">
            <div className="results-count-title">
              <span style={{ color: '#22c55e' }}>●</span>
              <span>Found {searchResults.length} Matching Auto Corridors</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ({searchFrom} ⇄ {searchTo})
              </span>
            </div>
            <span className="live-data-pill">{t.liveDataBadge}</span>
          </div>

          {/* Dynamic Result Cards */}
          {searchResults.map((route, idx) => {
            const isDirect = route.routeType === 'direct';
            const isConnecting = route.routeType === 'connecting';
            const isBranch = route.routeType === 'branch';

            return (
              <div key={route.id || idx} className="search-result-card">
                <div className="result-badge-row">
                  <div className="card-badges-left">
                    <span className="res-tag-code">{route.code || route.codeAlt || 'CORRIDOR'}</span>
                    {isDirect && (
                      <span className="res-tag-recommended">✓ {t.recommendedDirect}</span>
                    )}
                    {isConnecting && (
                      <span
                        style={{
                          background: '#E0E7FF',
                          color: '#3730A3',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {t.connectingRoute}
                      </span>
                    )}
                    {isBranch && (
                      <span
                        style={{
                          background: '#FEE2E2',
                          color: '#991B1B',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {t.branchRun}
                      </span>
                    )}
                    <span className="res-tag-freq">{route.category || 'High Frequency'}</span>
                  </div>
                  <div className="fare-block">
                    <span className="fare-amount">{route.fareRange || route.fareFixed}</span>
                    <span className="fare-note">{route.fareType || 'Govt Share Fare'}</span>
                  </div>
                </div>

                <div>
                  <h3 className="route-title" style={{ fontSize: '16px' }}>
                    {route.name}
                  </h3>
                  <p className="route-subtitle">
                    {route.bengaliSubtitle || route.subtitle}
                  </p>
                </div>

                {/* Horizontal Corridor Flow Line (for direct route) */}
                {route.stops && route.stops.length > 0 && (
                  <div className="horizontal-corridor-flow">
                    <div className="flow-header">
                      <span>FULL CORRIDOR FLOW ({route.stops.length} STOPPAGES • {route.distance})</span>
                      <span>Average Run: {route.estTravelMin || 18} mins</span>
                    </div>
                    <div className="flow-steps-track">
                      <div className="flow-connecting-line" />
                      {route.stops.map((st, sIdx) => {
                        const isTerminal = sIdx === 0 || sIdx === route.stops.length - 1;
                        return (
                          <div key={st.id || sIdx} className="flow-step-node">
                            <span className={`node-dot ${isTerminal ? 'terminal' : ''}`} />
                            <span className="node-name">{st.name.split('/')[0].split('(')[0].trim()}</span>
                            <span className="node-km">{st.distance}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Transfer Note for Connecting Routes */}
                {route.transferDetails && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#475569',
                      background: '#F8FAFC',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🚶</span>
                    <span>{route.transferDetails}</span>
                  </div>
                )}

                <div className="result-card-actions">
                  <button
                    className="btn-card-primary"
                    onClick={handleViewStandDetails}
                    id={`btn-details-${route.id}`}
                  >
                    <span>🚖</span>
                    <span>{t.viewDetailedStops}</span>
                  </button>
                  <button
                    className="btn-card-outline"
                    onClick={() => handleVisualizeOnMap(route.id)}
                    id={`btn-vis-${route.id}`}
                  >
                    <span>🗺</span>
                    <span>{t.visualizeOnMap}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Footer Operating Notice */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <span>Registered Shared Auto Network • KMA</span>
        <span>Operating: 06:00 – 23:30</span>
      </div>
    </aside>
  );
}
