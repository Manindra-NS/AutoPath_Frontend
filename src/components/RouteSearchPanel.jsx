import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTransit } from '../context/TransitContext';
import {
  Search,
  ArrowDownUp,
  MapPin,
  CheckCircle2,
  X,
  Compass,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';

/**
 * Debounce delay in milliseconds for autocomplete API requests.
 * Prevents sending a request on every keystroke.
 */
const AUTOCOMPLETE_DEBOUNCE_MS = 300;

export default function RouteSearchPanel() {
  const {
    t,
    searchFrom,
    setSearchFrom,
    searchTo,
    setSearchTo,
    handleSwapStands,
    searchResults,
    hasSearched,
    executeSearch,
    searchLocations,
    isLoadingRoutes,
    apiError,
    setSelectedRouteId,
    setActiveTab,
    setShowStandModal
  } = useTransit();

  const [fareModalOpen, setFareModalOpen] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState(null); // 'from' | 'to' | null

  // Autocomplete state for each field
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [isLoadingFromSuggestions, setIsLoadingFromSuggestions] = useState(false);
  const [isLoadingToSuggestions, setIsLoadingToSuggestions] = useState(false);
  const [fromNoResults, setFromNoResults] = useState(false);
  const [toNoResults, setToNoResults] = useState(false);

  // Refs for debounce timers (so we can cancel on unmount or new keystroke)
  const fromDebounceRef = useRef(null);
  const toDebounceRef = useRef(null);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (fromDebounceRef.current) clearTimeout(fromDebounceRef.current);
      if (toDebounceRef.current) clearTimeout(toDebounceRef.current);
    };
  }, []);

  // Close autocomplete dropdown on click outside or escape key
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.search-field-row')) {
        setActiveAutocomplete(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setActiveAutocomplete(null);
    };
    window.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  /**
   * Fetches location suggestions from the backend API with debouncing.
   * @param {'from' | 'to'} field - Which input field triggered the search
   * @param {string} query - The user's current input text
   */
  const fetchSuggestions = useCallback((field, query) => {
    const debounceRef = field === 'from' ? fromDebounceRef : toDebounceRef;
    const setLoading = field === 'from' ? setIsLoadingFromSuggestions : setIsLoadingToSuggestions;
    const setSuggestions = field === 'from' ? setFromSuggestions : setToSuggestions;
    const setNoResults = field === 'from' ? setFromNoResults : setToNoResults;

    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    // If input is empty, fetch default suggestions (popular stands)
    if (!trimmed) {
      setLoading(true);
      setNoResults(false);
      debounceRef.current = setTimeout(async () => {
        const res = await searchLocations('');
        if (res.success) {
          setSuggestions(res.data.slice(0, 6));
          setNoResults(res.data.length === 0);
        } else {
          setSuggestions([]);
          setNoResults(false);
        }
        setLoading(false);
      }, 100);
      return;
    }

    // Debounced fetch for non-empty query
    setLoading(true);
    setNoResults(false);
    debounceRef.current = setTimeout(async () => {
      const res = await searchLocations(trimmed);
      if (res.success) {
        setSuggestions(res.data.slice(0, 8));
        setNoResults(res.data.length === 0);
      } else {
        setSuggestions([]);
        setNoResults(false);
      }
      setLoading(false);
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }, [searchLocations]);

  // Trigger autocomplete fetch when input value changes and field is active
  useEffect(() => {
    if (activeAutocomplete === 'from') {
      fetchSuggestions('from', searchFrom);
    }
  }, [searchFrom, activeAutocomplete, fetchSuggestions]);

  useEffect(() => {
    if (activeAutocomplete === 'to') {
      fetchSuggestions('to', searchTo);
    }
  }, [searchTo, activeAutocomplete, fetchSuggestions]);

  // When a field is focused, trigger initial fetch
  const handleFieldFocus = (field) => {
    setActiveAutocomplete(field);
    fetchSuggestions(field, field === 'from' ? searchFrom : searchTo);
  };

  const handleSelectSuggestion = (field, location) => {
    if (field === 'from') {
      setSearchFrom(location.name);
    } else {
      setSearchTo(location.name);
    }
    setActiveAutocomplete(null);
  };

  const handleFindRoutesClick = () => {
    setActiveAutocomplete(null);
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

  /**
   * Renders the autocomplete dropdown panel for a given field.
   */
  const renderAutocompleteDropdown = (field) => {
    const isActive = activeAutocomplete === field;
    if (!isActive) return null;

    const suggestions = field === 'from' ? fromSuggestions : toSuggestions;
    const isLoading = field === 'from' ? isLoadingFromSuggestions : isLoadingToSuggestions;
    const noResults = field === 'from' ? fromNoResults : toNoResults;
    const queryValue = field === 'from' ? searchFrom : searchTo;

    // Don't show dropdown if nothing to display
    if (!isLoading && suggestions.length === 0 && !noResults) return null;

    return (
      <div
        className="suggestions-panel"
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 60,
          marginTop: '4px',
          maxHeight: '240px',
          overflowY: 'auto',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Loading indicator */}
        {isLoading && (
          <div
            style={{
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}
          >
            <Loader2 size={14} className="animate-spin" />
            <span>Searching locations...</span>
          </div>
        )}

        {/* No results message */}
        {!isLoading && noResults && (
          <div
            style={{
              padding: '14px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px', color: 'var(--text-secondary)' }}>
              No matching locations found
            </div>
            <div>
              No auto-route stops match "{queryValue}". Try a different name.
            </div>
          </div>
        )}

        {/* Suggestions list */}
        {!isLoading && suggestions.length > 0 && (
          <div className="suggestions-list">
            {suggestions.map((loc, idx) => (
              <div
                key={loc.id || `${loc.name}-${idx}`}
                className="suggestion-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(field, loc);
                }}
              >
                <div className="suggestion-left">
                  <div className="suggestion-icon-wrap">
                    <MapPin size={15} />
                  </div>
                  <div className="suggestion-titles">
                    <div className="suggestion-name-row">
                      <span className="suggestion-name">{loc.name}</span>
                      {loc.isStand && (
                        <span className="suggestion-tag">Stand</span>
                      )}
                      {loc.type === 'stop' && !loc.isStand && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          Route Stop
                        </span>
                      )}
                    </div>
                    <span className="suggestion-desc">
                      {loc.bengaliName ? `${loc.bengaliName}` : ''}
                      {loc.bengaliName && loc.description ? ' • ' : ''}
                      {loc.description || ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="search-sidebar" aria-label="Route Search and Planner">
      {/* 1. Top Banner: Route Planner heading & location information */}
      <div className="kma-certified-banner">
        <span className="kma-badge">
          <CheckCircle2 size={12} />
          {t.routePlanner} • {t.kmaCertified}
        </span>
        <span className="kma-zone">{t.suburbanZone}</span>
      </div>

      {/* 2. From / To Search Input Box */}
      <div className="search-inputs-box">
        {/* From Field */}
        <div className="search-field-row" style={{ position: 'relative' }}>
          <div className="search-field-content">
            <span className="search-field-label">From (উৎপত্তিস্থল)</span>
            <input
              type="text"
              className="search-field-input"
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              onFocus={() => handleFieldFocus('from')}
              onKeyDown={handleInputKeyDown}
              placeholder="Type your starting location"
              autoComplete="off"
            />
          </div>
          {searchFrom ? (
            <button
              onClick={() => {
                setSearchFrom('');
                setActiveAutocomplete(null);
              }}
              style={{
                color: '#94A3B8',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear starting location"
              aria-label="Clear starting location"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="gps-located-badge" title="Location verified via GPS">
              <MapPin size={10} />
              GPS Located
            </span>
          )}

          {/* Autocomplete floating dropdown for From field */}
          {renderAutocompleteDropdown('from')}
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
        <div className="search-field-row" style={{ position: 'relative' }}>
          <div className="search-field-content">
            <span className="search-field-label">To (গন্তব্যস্থল)</span>
            <input
              type="text"
              className="search-field-input"
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              onFocus={() => handleFieldFocus('to')}
              onKeyDown={handleInputKeyDown}
              placeholder="Where do you want to go?"
              autoComplete="off"
            />
          </div>
          {searchTo ? (
            <button
              onClick={() => {
                setSearchTo('');
                setActiveAutocomplete(null);
              }}
              style={{
                color: '#94A3B8',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear destination"
              aria-label="Clear destination"
            >
              <X size={16} />
            </button>
          ) : null}

          {/* Autocomplete floating dropdown for To field */}
          {renderAutocompleteDropdown('to')}
        </div>

        {/* Action Buttons: Find Routes & Fare Estimator */}
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

      {/* 3. Route Results Section (Directly below search form) */}

      {/* Loading state indicator */}
      {isLoadingRoutes && (
        <div
          style={{
            padding: '36px 20px',
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

      {/* State 1: When no route has been searched yet */}
      {!hasSearched && !isLoadingRoutes && (
        <div className="routes-empty-card" style={{ padding: '36px 20px', margin: '4px 0' }}>
          <Compass size={36} color="#94A3B8" />
          <div className="empty-title" style={{ fontSize: '14px', marginTop: '6px' }}>
            Plan Your Auto Journey
          </div>
          <p className="empty-desc" style={{ maxWidth: '280px', marginTop: '4px', lineHeight: 1.5 }}>
            Enter your starting location and destination above, then click <strong>Find Routes</strong> to explore verified Kolkata shared auto corridors.
          </p>
        </div>
      )}

      {/* State 2: When no direct auto corridor is found */}
      {hasSearched && !isLoadingRoutes && searchResults.length === 0 && !apiError && (
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
            gap: '12px',
            margin: '4px 0'
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
              No direct auto corridors found
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              {t.suggestAlternative || 'No direct auto corridor operates on this exact path. Try searching with a major nearby junction or check connecting corridors.'}
            </p>
          </div>
          <button
            className="btn-card-primary"
            style={{ width: 'auto', padding: '8px 20px' }}
            onClick={() => {
              setSearchTo('Gariahat');
              executeSearch(searchFrom || 'Ruby More', 'Gariahat');
            }}
          >
            Explore Major Corridors via Nearby Hubs
          </button>
        </div>
      )}

      {/* State 3: When routes are found */}
      {hasSearched && !isLoadingRoutes && searchResults.length > 0 && (
        <>
          <div className="results-header-row">
            <div className="results-count-title">
              <span style={{ color: '#22c55e' }}>●</span>
              <span>Found {searchResults.length} Matching Auto Corridors</span>
              {(searchFrom || searchTo) && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ({searchFrom || 'Origin'} → {searchTo || 'Destination'})
                </span>
              )}
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

                {/* Horizontal Corridor Flow Line */}
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
