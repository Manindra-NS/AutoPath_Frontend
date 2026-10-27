import React from 'react';
import { useTransit } from '../context/TransitContext';
import {
  ArrowDownUp,
  Navigation,
  Clock,
  Activity,
  Train,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function InteractiveMapPanel() {
  const {
    t,
    language,
    searchFrom,
    setSearchFrom,
    searchTo,
    setSearchTo,
    executeSearch,
    handleSwapStands,
    filterTag,
    setFilterTag,
    selectedRoute,
    setSelectedRouteId,
    standRoutes,
    selectedRouteStops,
    isLoadingRoutes,
    apiError,
    setHoveredStop,
    hoveredStop
  } = useTransit();

  // Find alternative routes from the same origin stand
  const alternativeRoutes = standRoutes.filter(
    (r) => r.id !== selectedRoute?.id
  );

  const stopsToRender = selectedRouteStops?.length > 0 ? selectedRouteStops : selectedRoute?.stops;

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeSearch(searchFrom, searchTo);
    }
  };

  return (
    <aside className="map-sidebar-overlay" aria-label="Route Corridor Inspector">
      {/* Inputs Card */}
      <div className="inputs-card">
        <div className="input-row-group">
          {/* Starting Stand */}
          <div className="stand-input-box">
            <span className="icon-yellow-circle" />
            <div className="input-text-area">
              <span className="input-label-micro">{t.startingStand}</span>
              <input
                type="text"
                className="input-value-text"
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Enter starting stand..."
              />
            </div>
          </div>

          {/* Floating Swap Button */}
          <button
            className="swap-btn-floating"
            onClick={handleSwapStands}
            title="Swap Origin and Destination"
            aria-label="Swap Stands"
          >
            <ArrowDownUp size={16} />
          </button>

          {/* Destination Stand */}
          <div className="stand-input-box">
            <span className="icon-green-target" />
            <div className="input-text-area">
              <span className="input-label-micro">{t.destinationStand}</span>
              <input
                type="text"
                className="input-value-text"
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Enter destination stand..."
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="filter-pills-row">
          <button
            className={`filter-pill ${filterTag === 'direct' ? 'active' : ''}`}
            onClick={() => setFilterTag('direct')}
          >
            {t.directCorridors}
          </button>
          <button
            className={`filter-pill ${filterTag === 'frequent' ? 'active' : ''}`}
            onClick={() => setFilterTag('frequent')}
          >
            {t.frequentInterval}
          </button>
          <button
            className={`filter-pill ${filterTag === 'metro' ? 'active' : ''}`}
            onClick={() => setFilterTag('metro')}
          >
            {t.metroTransfer}
          </button>
        </div>
      </div>

      {/* Backend API Error Banner (Honest failure reporting, no fabricated results) */}
      {apiError && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#991B1B' }}>
              Backend API Notice
            </div>
            <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
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
              Retry API Request
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingRoutes && !selectedRoute && (
        <div
          className="route-details-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            color: 'var(--text-muted)'
          }}
        >
          <Loader2 size={24} className="animate-spin" color="var(--brand-green)" />
          <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 600 }}>
            Loading route corridor details...
          </span>
        </div>
      )}

      {/* Selected Route Details Card */}
      {selectedRoute && (
        <div className="route-details-card">
          {/* Header & Badges */}
          <div className="route-card-header">
            <div className="route-header-info">
              <div className="route-tag-row">
                <span className="route-code-badge">{selectedRoute.code || 'ROUTE'}</span>
                <span className="active-queue-badge">
                  <span className="status-pulse-dot" />
                  {t.activeQueueNow}
                </span>
              </div>
              <h2 className="route-title">
                {language === 'bn' ? selectedRoute.bengaliName : selectedRoute.name}
              </h2>
              <p className="route-subtitle">
                {language === 'bn' ? selectedRoute.bengaliSubtitle : selectedRoute.subtitle}
              </p>
            </div>

            <div className="fare-block">
              <div className="fare-amount">
                {selectedRoute.fareRange || selectedRoute.fareFixed}
              </div>
              <div className="fare-note">{selectedRoute.fareType || 'Per Seat Share'}</div>
            </div>
          </div>

          {/* 3 Metric Stat Boxes */}
          <div className="stats-grid-3">
            <div className="stat-box">
              <Navigation size={16} className="stat-icon" />
              <div className="stat-val">{selectedRoute.distance}</div>
              <div className="stat-lbl">{t.distance}</div>
            </div>
            <div className="stat-box">
              <Clock size={16} className="stat-icon" />
              <div className="stat-val">{selectedRoute.estTravel}</div>
              <div className="stat-lbl">{t.estTravel}</div>
            </div>
            <div className="stat-box">
              <Activity size={16} className="stat-icon" />
              <div className="stat-val">{selectedRoute.queueFreq}</div>
              <div className="stat-lbl">{t.queueFreq}</div>
            </div>
          </div>

          {/* Stoppage Progression */}
          <div className="timeline-section">
            <div className="timeline-section-header">
              <span className="timeline-title">
                {t.stoppageProgression} ({stopsToRender ? stopsToRender.length : 0} STOPS)
              </span>
              <span className="live-corridor-link">{t.liveCorridor}</span>
            </div>

            <div className="timeline-list">
              <div className="timeline-line" />
              {stopsToRender &&
                stopsToRender.map((stop, index) => {
                  const isOrigin = index === 0;
                  const isTerminus = index === stopsToRender.length - 1;
                  const isHighlighted = hoveredStop === stop.id;

                  return (
                    <div
                      key={stop.id || index}
                      className="timeline-item"
                      onMouseEnter={() => setHoveredStop(stop.id)}
                      onMouseLeave={() => setHoveredStop(null)}
                    >
                      <span
                        className={`timeline-dot ${isOrigin ? 'origin' : ''} ${
                          isTerminus ? 'terminus' : ''
                        } ${isHighlighted ? 'highlighted' : ''}`}
                      />
                      <div className="timeline-content">
                        <div className="timeline-stop-name">
                          {language === 'bn' ? stop.bengaliName : stop.name}
                        </div>
                        <div className="timeline-badges-row">
                          {stop.badge && (
                            <span className="stop-pill-badge">
                              {stop.badgeIcon === 'train' && <Train size={10} />}
                              {stop.badge}
                            </span>
                          )}
                          {stop.subtext && (
                            <span className="stop-pill-subtext">{stop.subtext}</span>
                          )}
                        </div>
                      </div>
                      <div className="timeline-dist">{stop.distance}</div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Other Routes From Origin Stand */}
          {alternativeRoutes.length > 0 && (
            <div className="other-routes-box">
              <div className="other-routes-header">
                <span className="other-routes-title">
                  {t.otherRoutesFrom} {selectedRoute.name.split('⇄')[0].trim()}
                </span>
                <span className="other-routes-count">{alternativeRoutes.length} Alternatives</span>
              </div>

              {alternativeRoutes.map((alt) => (
                <div
                  key={alt.id}
                  className="other-route-item"
                  onClick={() => setSelectedRouteId(alt.id)}
                  title="Click to highlight route on map"
                >
                  <span>{language === 'bn' ? alt.bengaliName : alt.name}</span>
                  <span className="other-route-fare">{alt.fareRange || alt.fareFixed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
