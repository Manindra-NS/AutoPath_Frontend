import React, { useState } from 'react';
import { useTransit } from '../context/TransitContext';
import {
  X,
  Share2,
  MapPin,
  Clock,
  Car,
  ShieldCheck,
  Building,
  Train,
  Check,
  ChevronRight,
  ExternalLink,
  Navigation
} from 'lucide-react';

export default function AutoStandsModal() {
  const {
    showStandModal,
    setShowStandModal,
    selectedStand,
    setSelectedStandId,
    stands,
    standRoutes,
    setSelectedRouteId,
    setActiveTab,
    t,
    language
  } = useTransit();

  const [copied, setCopied] = useState(false);

  if (!showStandModal || !selectedStand) return null;

  // Departing routes for this stand
  const departingRoutes = standRoutes.filter(
    (r) => r.originStandId === selectedStand?.id && r.routeType === 'direct'
  );

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectRouteFromModal = (routeId) => {
    setSelectedRouteId(routeId);
    setShowStandModal(false);
    setActiveTab('map');
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowStandModal(false)}>
      <div
        className="stand-hub-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stand-title"
      >
        {/* Header */}
        <div className="stand-hub-header">
          <div className="stand-header-main">
            <div className="stand-hub-badges">
              <span className="hub-tier-badge">{selectedStand.tier}</span>
              <span className="hub-lines-badge">
                {selectedStand.activeLinesCount} High-Volume Lines
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                • Live Dispatch Active
              </span>
            </div>
            <h1 className="hub-title" id="stand-title">
              {selectedStand.fullName}{' '}
              <span style={{ color: '#15803d', fontWeight: 600 }}>
                ({selectedStand.bengaliName} অটো স্ট্যান্ড)
              </span>
            </h1>
            <p className="hub-subtitle">{selectedStand.tagline}</p>
          </div>

          <div className="hub-header-actions">
            <button
              className="icon-btn-circle"
              onClick={handleShare}
              title={copied ? 'Copied link!' : 'Share Stand Info'}
            >
              {copied ? <Check size={18} color="#15803d" /> : <Share2 size={18} />}
            </button>
            <button
              className="icon-btn-circle"
              onClick={() => setShowStandModal(false)}
              title="Close Panel"
              id="close-stands-modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="stand-meta-bar">
          <div className="meta-col">
            <span className="meta-lbl">
              <MapPin size={12} /> {t.coordinates}
            </span>
            <span className="meta-val">{selectedStand.coordsDescription}</span>
          </div>
          <div className="meta-col">
            <span className="meta-lbl">
              <Clock size={12} /> {t.serviceSpan}
            </span>
            <span className="meta-val">{selectedStand.serviceSpan}</span>
          </div>
          <div className="meta-col">
            <span className="meta-lbl">
              <Car size={12} /> {t.standFormat}
            </span>
            <span className="meta-val">{selectedStand.standFormat}</span>
          </div>
          <div className="meta-col">
            <span className="meta-lbl">
              <ShieldCheck size={12} /> {t.queueSystem}
            </span>
            <span className="meta-val">{selectedStand.queueSystem}</span>
          </div>
        </div>

        {/* Jump Hub Quick Selectors */}
        <div className="jump-hub-row">
          <span className="jump-hub-label">{t.jumpHub}</span>
          {stands.map((stand) => (
            <button
              key={stand.id}
              className={`jump-hub-btn ${stand.id === selectedStand.id ? 'active' : ''}`}
              onClick={() => setSelectedStandId(stand.id)}
            >
              {stand.name}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Section: Available Auto Routes Departing From Stand */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px'
              }}
            >
              <h2
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)'
                }}
              >
                {t.availableRoutes}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#F1F5F9',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  color: 'var(--text-muted)'
                }}
              >
                {t.standardSharedFares}
              </span>
            </div>

            {/* 2x2 Grid of Route Cards matching Image 3 */}
            <div className="routes-grid-2x2">
              {departingRoutes.map((route) => (
                <div key={route.id} className="hub-route-card">
                  <div className="hub-route-header">
                    <div className="hub-route-left">
                      <span className="route-index-badge">{route.code}</span>
                      <div>
                        <div className="hub-route-title">{route.name}</div>
                        <div className="hub-route-bengali">{route.bengaliSubtitle}</div>
                      </div>
                    </div>
                    <span className="hub-freq-badge">{route.queueFreq}</span>
                  </div>

                  <div className="hub-route-meta">
                    <span>{route.distance}</span>
                    <span>•</span>
                    <span>Est. {route.estTravelMin} mins</span>
                    <span>•</span>
                    <span className="meta-fixed-fare">{route.fareFixed || route.fareRange}</span>
                  </div>

                  {/* Corridor Sequence tags */}
                  <div className="corridor-sequence-box">
                    <div className="corridor-sequence-title">
                      {t.corridorSequence} ({route.stops?.length || 0} Stops)
                    </div>
                    <div className="sequence-tags-chain">
                      {route.stops?.map((stop, sIdx) => (
                        <React.Fragment key={stop.id || sIdx}>
                          <span className="sequence-stop-pill">
                            {language === 'bn' ? stop.bengaliName : stop.name.split('(')[0]}
                          </span>
                          {sIdx < route.stops.length - 1 && (
                            <span style={{ color: '#94A3B8' }}>&gt;</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="hub-card-footer">
                    <span className="hub-card-category">{route.category}</span>
                    <button
                      className="btn-select-view-route"
                      onClick={() => handleSelectRouteFromModal(route.id)}
                    >
                      <span>{t.selectViewRoute}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Key Multimodal Connectors & Landmarks Nearby */}
          <div>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-secondary)',
                marginBottom: '12px'
              }}
            >
              {t.multimodalConnectors}
            </h2>

            <div className="landmarks-grid">
              {selectedStand.landmarks?.map((lm, idx) => (
                <div key={idx} className="landmark-card">
                  <div className="landmark-icon">
                    {lm.type === 'hospital' ? (
                      <ShieldCheck size={18} />
                    ) : lm.type === 'metro' || lm.type === 'rail' ? (
                      <Train size={18} />
                    ) : lm.type === 'bus' ? (
                      <Car size={18} />
                    ) : (
                      <Building size={18} />
                    )}
                  </div>
                  <div>
                    <div className="landmark-name">{lm.name}</div>
                    <div className="landmark-type">{lm.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="modal-bottom-bar">
          <div className="verified-stamp">
            <Check size={16} />
            <span>{t.verifiedData}</span>
          </div>
          <button
            className="btn-return-map"
            onClick={() => setShowStandModal(false)}
            id="btn-return-map"
          >
            {t.returnToMap}
          </button>
        </div>
      </div>
    </div>
  );
}
