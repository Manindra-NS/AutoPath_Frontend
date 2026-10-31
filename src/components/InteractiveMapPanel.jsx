import React from 'react';
import { useTransit } from '../context/TransitContext';
import {
  X,
  MapPin,
  Clock,
  Car,
  ShieldCheck,
  Navigation,
  Activity,
  Train,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  Check
} from 'lucide-react';

export default function InteractiveMapPanel() {
  const {
    t,
    language,
    isStandPanelOpen,
    closeStandPanel,
    selectedStand,
    standRoutes,
    loadStandRoutes,
    selectedRoute,
    setSelectedRouteId,
    selectedRouteStops,
    isLoadingRoutes,
    apiError,
    hoveredStop,
    setHoveredStop
  } = useTransit();

  // If panel is not open or no stand is selected, do NOT render any panel
  // Initial map view stays clean with all auto stand markers visible
  if (!isStandPanelOpen || !selectedStand) {
    return null;
  }

  const stopsToRender = selectedRouteStops?.length > 0 ? selectedRouteStops : selectedRoute?.stops;

  return (
    <aside className="map-sidebar-overlay" aria-label="Auto Stand Details & Departing Routes">
      {/* 1. AUTO STAND INFORMATION HEADER CARD */}
      <div className="stand-hub-panel-card">
        {/* Top Badges & Close Button */}
        <div className="stand-panel-top-row">
          <div className="stand-panel-badges">
            <span className="hub-tier-badge">{selectedStand.tier || 'AUTO STAND HUB'}</span>
            <span className="hub-lines-badge">
              {standRoutes.length || selectedStand.activeLinesCount || 0} Lines
            </span>
            <span className="live-dispatch-badge">
              <span className="status-pulse-dot" />
              Live Dispatch Active
            </span>
          </div>

          <button
            className="stand-panel-close-btn"
            onClick={closeStandPanel}
            title="Close Panel & Return to Map"
            aria-label="Close Stand Details Panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stand Name in English & Bengali */}
        <div className="stand-panel-title-area">
          <h2 className="stand-panel-title">
            {selectedStand.fullName || selectedStand.name}
            {selectedStand.bengaliName && (
              <span className="stand-panel-bengali-name">
                {' '}({selectedStand.bengaliName} অটো স্ট্যান্ড)
              </span>
            )}
          </h2>
          <p className="stand-panel-tagline">
            {language === 'bn' && selectedStand.taglineBengali
              ? selectedStand.taglineBengali
              : (selectedStand.tagline || selectedStand.coordsDescription || 'Major Kolkata Auto-Rickshaw Corridor Hub')}
          </p>
        </div>

        {/* Stand Metadata Grid */}
        <div className="stand-panel-meta-grid">
          <div className="stand-panel-meta-item">
            <span className="stand-meta-label">
              <MapPin size={11} /> {t.coordinates || 'COORDINATES'}
            </span>
            <span className="stand-meta-value" title={selectedStand.coordsDescription}>
              {selectedStand.coordsDescription || 
                (selectedStand.coordinates ? `${selectedStand.coordinates[0].toFixed(4)}°N, ${selectedStand.coordinates[1].toFixed(4)}°E` : 'Kolkata, WB')}
            </span>
          </div>
          <div className="stand-panel-meta-item">
            <span className="stand-meta-label">
              <Clock size={11} /> {t.serviceSpan || 'OPERATING HOURS'}
            </span>
            <span className="stand-meta-value">{selectedStand.serviceSpan || '06:00 - 23:30'}</span>
          </div>
          <div className="stand-panel-meta-item">
            <span className="stand-meta-label">
              <Car size={11} /> {t.standFormat || 'STAND TYPE'}
            </span>
            <span className="stand-meta-value">{selectedStand.standFormat || 'Dedicated Bay Hub'}</span>
          </div>
          <div className="stand-panel-meta-item">
            <span className="stand-meta-label">
              <ShieldCheck size={11} /> {t.queueSystem || 'QUEUE SYSTEM'}
            </span>
            <span className="stand-meta-value">{selectedStand.queueSystem || 'Union Regulated Queue'}</span>
          </div>
        </div>
      </div>

      {/* 2. BACKEND API ERROR NOTIFICATION BANNER */}
      {apiError && (
        <div className="stand-panel-error-banner">
          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#991B1B' }}>
              Backend API Notice
            </div>
            <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
              {apiError}
            </div>
            <button
              onClick={() => loadStandRoutes(selectedStand.id)}
              className="btn-retry-api"
            >
              <RefreshCw size={12} />
              Retry Fetching Routes
            </button>
          </div>
        </div>
      )}

      {/* 3. AVAILABLE AUTO ROUTES DEPARTING FROM THIS STAND */}
      <div className="departing-routes-section">
        <div className="departing-routes-header">
          <div className="departing-routes-title-group">
            <h3 className="departing-routes-title">
              Available Auto Routes Departing From Stand
            </h3>
            <span className="departing-routes-count">
              {standRoutes.length} Corridors
            </span>
          </div>
          <span className="shared-fare-tag">
            Standard Shared Fares
          </span>
        </div>

        {/* Loading State */}
        {isLoadingRoutes && (
          <div className="routes-loading-card">
            <Loader2 size={24} className="animate-spin" color="var(--brand-green)" />
            <span>Fetching routes departing from {selectedStand.name} from backend...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingRoutes && (!standRoutes || standRoutes.length === 0) && !apiError && (
          <div className="routes-empty-card">
            <Car size={32} color="#94A3B8" />
            <div className="empty-title">No Routes Registered</div>
            <p className="empty-desc">
              No auto routes currently registered from this stand.
            </p>
          </div>
        )}

        {/* Route Cards */}
        {!isLoadingRoutes && standRoutes && standRoutes.length > 0 && (
          <div className="departing-routes-list">
            {standRoutes.map((route) => {
              const isSelected = selectedRoute?.id === route.id;
              const originName = route.originStandName || selectedStand.name;
              const destName = route.destinationStandName || 
                (route.name ? (route.name.includes('⇄') ? route.name.split('⇄')[1]?.trim() : route.name.split('→')[1]?.trim() || route.name) : 'Destination');

              return (
                <div
                  key={route.id}
                  className={`hub-route-card ${isSelected ? 'active-selected-route' : ''}`}
                >
                  {/* Route Header */}
                  <div className="hub-route-header">
                    <div className="hub-route-left">
                      <span className="route-index-badge">{route.code || 'ROUTE'}</span>
                      <div>
                        <div className="hub-route-title">
                          {originName} ⇄ {destName}
                        </div>
                        <div className="hub-route-bengali">
                          {language === 'bn' 
                            ? (route.bengaliSubtitle || route.bengaliName || route.name) 
                            : (route.bengaliSubtitle || route.subtitle || 'Kolkata Shared Auto Corridor')}
                        </div>
                      </div>
                    </div>
                    <span className="hub-freq-badge">{route.queueFreq || '3-5 min'}</span>
                  </div>

                  {/* Route Meta Information */}
                  <div className="hub-route-meta">
                    <span title="Route Distance">
                      <Navigation size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      {route.distance || '–'}
                    </span>
                    <span>•</span>
                    <span title="Estimated Travel Time">
                      <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      {route.estTravel || (route.estTravelMin ? `Est. ${route.estTravelMin} mins` : '–')}
                    </span>
                    <span>•</span>
                    <span className="meta-fixed-fare" title="Fixed Standard Fare">
                      {route.fareFixed || route.fareRange || '₹15 - ₹20'}
                    </span>
                  </div>

                  {/* Intermediate Stops or Corridor Sequence */}
                  {route.stops && route.stops.length > 0 && (
                    <div className="corridor-sequence-box">
                      <div className="corridor-sequence-title">
                        Corridor Sequence ({route.stops.length} Stops)
                      </div>
                      <div className="sequence-tags-chain">
                        {route.stops.map((stop, sIdx) => (
                          <React.Fragment key={stop.id || sIdx}>
                            <span className="sequence-stop-pill" title={stop.name}>
                              {language === 'bn'
                                ? (stop.bengaliName || stop.name)
                                : (stop.name?.split('(')[0]?.trim() || stop.name)}
                            </span>
                            {sIdx < route.stops.length - 1 && (
                              <span style={{ color: '#94A3B8', fontWeight: 800 }}>&gt;</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card Footer: Category & Select & View Route Button */}
                  <div className="hub-card-footer">
                    <span className="hub-card-category">
                      {route.category || 'Direct Corridor'}
                    </span>
                    <button
                      className={`btn-select-view-route ${isSelected ? 'btn-route-selected' : ''}`}
                      onClick={() => setSelectedRouteId(route.id)}
                      title={isSelected ? 'Route is currently drawn on map' : 'Click to draw and inspect route on map'}
                    >
                      {isSelected ? (
                        <>
                          <Check size={14} />
                          <span>Viewing on Map</span>
                        </>
                      ) : (
                        <>
                          <span>Select &amp; View Route</span>
                          <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SELECTED ROUTE PROGRESSION TIMELINE (When a route is actively selected) */}
      {selectedRoute && (
        <div className="route-details-card" style={{ marginTop: '4px' }}>
          <div className="timeline-section">
            <div className="timeline-section-header">
              <span className="timeline-title">
                {t.stoppageProgression || 'Stoppage Progression'} ({stopsToRender ? stopsToRender.length : 0} STOPS)
              </span>
              <span className="live-corridor-link">{t.liveCorridor || 'Live Corridor'}</span>
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
                          {language === 'bn' ? (stop.bengaliName || stop.name) : stop.name}
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
        </div>
      )}
    </aside>
  );
}
