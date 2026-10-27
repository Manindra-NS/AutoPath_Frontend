import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useTransit } from '../context/TransitContext';
import {
  Layers,
  Plus,
  Minus,
  Crosshair,
  Compass,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  Car,
  MapPin,
  CheckCircle2,
  Navigation,
  AlertTriangle,
  Loader,
  Info
} from 'lucide-react';
import OfflineFallbackMap from './OfflineFallbackMap';

// Read Google Maps API key from environment (set in .env, never hardcoded in source)
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef({
    stands: L.layerGroup(),
    corridors: L.layerGroup(),
    stops: L.layerGroup()
  });

  const [tileError, setTileError] = useState(false);
  const [showBottomToast, setShowBottomToast] = useState(true);

  const {
    stands,
    selectedStand,
    setSelectedStandId,
    selectedRoute,
    setSelectedRouteId,
    standRoutes,
    selectedRouteStops,
    layers,
    toggleLayer,
    standPopup,
    openStandPopup,
    closeStandPopup,
    setShowStandModal,
    isOffline,
    hoveredStop,
    language,
    t,
    isLoadingRouteDetail,
    routeError,
    setRouteError
  } = useTransit();

  /**
   * Loads the Google Maps JS SDK script once, then resolves.
   * Safe to call multiple times — only appends the script tag once.
   */
  const loadGoogleMapsScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      if (document.getElementById('gmap-sdk')) {
        const existing = document.getElementById('gmap-sdk');
        existing.addEventListener('load', resolve);
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.id = 'gmap-sdk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        console.warn('[AutoPath] Google Maps script failed to load. Falling back to CartoDB tiles.');
        reject(new Error('Google Maps script load failed'));
      };
      document.head.appendChild(script);
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (isOffline || tileError || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.515, 88.388],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    const createGoogleTileLayer = () => {
      const GoogleTiles = L.GridLayer.extend({
        createTile(coords) {
          const tile = document.createElement('img');
          tile.style.width = '256px';
          tile.style.height = '256px';
          tile.src = `https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i${coords.z}!2i${coords.x}!3i${coords.y}!4i256!2m3!1e0!2sm!3i${Date.now()}&key=${GOOGLE_MAPS_API_KEY}`;
          tile.onerror = () => {
            console.warn('[AutoPath] Google Maps tile error. Falling back to CartoDB.');
            setTileError(true);
          };
          return tile;
        }
      });
      return new GoogleTiles({ tileSize: 256, maxZoom: 20 });
    };

    const initWithGoogleMaps = async () => {
      try {
        await loadGoogleMapsScript();
        const googleLayer = createGoogleTileLayer();
        googleLayer.addTo(map);
        console.info('[AutoPath] Using Google Maps tile layer.');
      } catch {
        addCartoDBFallback(map);
      }
    };

    const addCartoDBFallback = (mapInstance) => {
      console.info('[AutoPath] Using CartoDB Voyager tile layer (fallback).');
      const cartoLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 19 }
      );
      cartoLayer.on('tileerror', () => {
        console.warn('[AutoPath] CartoDB tile error. Switching to offline schematic map.');
        setTileError(true);
      });
      cartoLayer.addTo(mapInstance);
    };

    if (GOOGLE_MAPS_API_KEY) {
      initWithGoogleMaps();
    } else {
      addCartoDBFallback(map);
    }

    // Add overlay layer groups to map
    layersGroupRef.current.corridors.addTo(map);
    layersGroupRef.current.stops.addTo(map);
    layersGroupRef.current.stands.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      // Keep map instance alive; cleanup handled when component unmounts fully
    };
  }, [isOffline, tileError, loadGoogleMapsScript]);

  // Update Layers & Markers when state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isOffline || tileError) return;

    const { stands: standGroup, corridors: corridorGroup, stops: stopGroup } =
      layersGroupRef.current;

    // Clear previous elements
    standGroup.clearLayers();
    corridorGroup.clearLayers();
    stopGroup.clearLayers();

    // 1. Draw Corridors (if layer enabled)
    if (layers.corridors) {
      // Primary selected route:
      // Geometry is provided directly by backend database via centralized transitService.
      // Leaflet expects [latitude, longitude], which is already normalized by routeNormalizer.
      // If road geometry is invalid or missing, do NOT draw misleading straight lines.
      if (selectedRoute && selectedRoute.hasValidGeometry && selectedRoute.pathCoordinates?.length >= 2) {
        // Outer glow / casing — lime-yellow halo for contrast
        L.polyline(selectedRoute.pathCoordinates, {
          color: '#bef264',
          weight: 9,
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(corridorGroup);

        // Core dark-green road-following line
        const mainLine = L.polyline(selectedRoute.pathCoordinates, {
          color: '#0D5C3A',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(corridorGroup);

        mainLine.bindTooltip(
          `<strong>${selectedRoute.name}</strong><br/>` +
          `${selectedRoute.fareRange || selectedRoute.fareFixed}`,
          { sticky: true }
        );
      }

      // Secondary corridors from standRoutes:
      // Only draw if backend provided valid road geometry. Never connect with straight lines.
      standRoutes.forEach((route) => {
        if (
          route.id === selectedRoute?.id || 
          !route.hasValidGeometry || 
          !route.pathCoordinates || 
          route.pathCoordinates.length < 2
        ) {
          return;
        }
        const line = L.polyline(route.pathCoordinates, {
          color: '#94A3B8',
          weight: 3,
          dashArray: '5, 8',
          opacity: 0.55
        }).addTo(corridorGroup);
        line.on('click', () => setSelectedRouteId(route.id));
      });
    }

    // 2. Draw Intermediate Stops in their specified order along the route
    const stopsToDraw = selectedRouteStops?.length > 0 ? selectedRouteStops : selectedRoute?.stops;
    if (layers.corridors && Array.isArray(stopsToDraw)) {
      stopsToDraw.forEach((stop, index) => {
        // Skip terminal stands since they have prominent stand markers
        if (stop.isStand || !stop.coordinates) return;

        const isHovered = hoveredStop === stop.id;
        const stopOrder = stop.order || (index + 1);

        const stopIcon = L.divIcon({
          className: 'custom-stop-marker-wrap',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
              <div class="custom-stop-marker" style="${
                isHovered
                  ? 'transform: scale(1.4); border-color: #0D5C3A; background: #bef264;'
                  : ''
              }">
                <span style="font-size: 8px; font-weight: 800; color: #0D5C3A; display: flex; align-items: center; justify-content: center; height: 100%;">
                  ${stopOrder}
                </span>
              </div>
              <div style="
                position: absolute;
                top: 14px;
                background: rgba(255, 255, 255, 0.96);
                border: 1px solid #CBD5E1;
                border-radius: 4px;
                padding: 1px 5px;
                font-size: 9px;
                font-weight: 700;
                color: #334155;
                white-space: nowrap;
                pointer-events: none;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12);
              ">
                ${language === 'bn' ? (stop.bengaliName || stop.name) : stop.name.split('/')[0].trim()}
              </div>
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        L.marker(stop.coordinates, { icon: stopIcon })
          .bindTooltip(`<strong>Stop #${stopOrder}: ${stop.name}</strong><br/>${stop.distance || ''}`, {
            direction: 'top',
            offset: [0, -8]
          })
          .addTo(stopGroup);
      });
    }

    // 3. Draw Auto Stands (Yellow-Green circular markers)
    if (layers.stands && stands.length > 0) {
      stands.forEach((stand) => {
        if (!stand.coordinates) return;
        const isSelected = stand.id === selectedStand?.id;

        const standIcon = L.divIcon({
          className: 'custom-stand-marker-node',
          html: `
            <div class="custom-stand-marker">
              <div class="stand-marker-outer-ring" style="${
                isSelected
                  ? 'transform: scale(1.18); box-shadow: 0 0 16px rgba(132, 204, 22, 0.9); background: rgba(190, 242, 100, 0.65);'
                  : ''
              }">
                <div class="stand-marker-inner-core"></div>
              </div>
              <div class="stand-marker-label-badge" style="${
                isSelected ? 'background: #0D5C3A; border: 1px solid #BEF264;' : ''
              }">
                ${stand.name.split('(')[0]} (${stand.bengaliName || ''})
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker(stand.coordinates, { icon: standIcon }).addTo(standGroup);

        marker.on('click', () => {
          openStandPopup(stand.id);
          setShowBottomToast(true);
        });
      });
    }
  }, [
    layers,
    selectedStand,
    selectedRoute,
    selectedRouteStops,
    standRoutes,
    hoveredStop,
    stands,
    language,
    isOffline,
    tileError,
    openStandPopup,
    setSelectedRouteId
  ]);

  // Pan/zoom map to fit route geometry or stops
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isOffline || tileError) return;

    if (selectedRoute?.hasValidGeometry && selectedRoute.pathCoordinates?.length >= 2) {
      const bounds = L.latLngBounds(selectedRoute.pathCoordinates);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true });
    } else {
      // If road geometry is unavailable, fit bounds to the route's stops without drawing straight lines
      const stops = selectedRouteStops?.length ? selectedRouteStops : selectedRoute?.stops;
      const validStopCoords = stops?.map(s => s.coordinates).filter(Boolean);
      if (validStopCoords && validStopCoords.length >= 2) {
        map.fitBounds(L.latLngBounds(validStopCoords), { padding: [80, 80], maxZoom: 15, animate: true });
      }
    }
  }, [selectedRoute, selectedRouteStops, isOffline, tileError]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleCenterKolkata = () => {
    mapInstanceRef.current?.setView([22.5134, 88.3995], 14, { animate: true });
  };

  if (isOffline || tileError) {
    return <OfflineFallbackMap />;
  }

  // Geometry status flags
  const isGeometryMissing = selectedRoute && !selectedRoute.hasValidGeometry && !isLoadingRouteDetail;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="leaflet-container" id="kolkata-map-canvas" />

      {/* Route geometry loading badge */}
      {isLoadingRouteDetail && (
        <div
          aria-live="polite"
          aria-label="Loading route data"
          style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(13,92,58,0.92)', color: '#bef264',
            borderRadius: 24, padding: '8px 18px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 600, zIndex: 1200,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
          Fetching route road geometry from backend…
        </div>
      )}

      {/* Geometry unavailable warning banner (Never draw straight lines!) */}
      {isGeometryMissing && (
        <div
          role="status"
          style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(30, 41, 59, 0.92)', color: '#f1f5f9',
            borderRadius: 12, padding: '10px 18px',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 12, fontWeight: 500, zIndex: 1200,
            maxWidth: 420, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(6px)', border: '1px solid #475569'
          }}
        >
          <Info size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <span>
            <strong>Road geometry unavailable:</strong> Backend has not registered road-network coordinates for this route yet. Straight-line representation is disabled.
          </span>
        </div>
      )}

      {/* Route error toast */}
      {routeError && !isLoadingRouteDetail && (
        <div
          role="alert"
          style={{
            position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(220,38,38,0.93)', color: '#fff',
            borderRadius: 12, padding: '10px 18px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: 12, fontWeight: 500, zIndex: 1200,
            maxWidth: 380, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Route error:</strong> {routeError}
          </span>
          <button
            onClick={() => setRouteError(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: 6 }}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Right Floating Controls (Map Layers & Zoom) */}
      <div className="map-floating-controls">
        {/* Map Layers Card */}
        <div className="map-layers-card">
          <div className="map-layers-title-row">
            <span>{t.mapLayers}</span>
            <Layers size={14} />
          </div>

          <label className="layer-checkbox-row">
            <span className="layer-indicator">
              <span className="dot-yellow-green" />
              <span>{t.layerAutoStands}</span>
            </span>
            <input
              type="checkbox"
              checked={layers.stands}
              onChange={() => toggleLayer('stands')}
              style={{ accentColor: 'var(--brand-green)' }}
            />
          </label>

          <label className="layer-checkbox-row">
            <span className="layer-indicator">
              <span className="dot-dark-green" />
              <span>{t.layerRouteCorridors}</span>
            </span>
            <input
              type="checkbox"
              checked={layers.corridors}
              onChange={() => toggleLayer('corridors')}
              style={{ accentColor: 'var(--brand-green)' }}
            />
          </label>
        </div>

        {/* Zoom & Navigation Buttons */}
        <div className="zoom-controls-stack">
          <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In" aria-label="Zoom In">
            <Plus size={18} />
          </button>
          <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom Out">
            <Minus size={18} />
          </button>
          <button
            className="zoom-btn"
            onClick={handleCenterKolkata}
            title="Center on Ruby More Hub"
            aria-label="Center on Ruby More Hub"
          >
            <Crosshair size={18} />
          </button>
          <button
            className="zoom-btn"
            onClick={() => setShowStandModal(true)}
            title="View Stand Details"
            aria-label="View Stand Details"
          >
            <Compass size={18} />
          </button>
        </div>
      </div>

      {/* Floating Stand Information Popup (Opened on Stand Marker Click) */}
      {standPopup.isOpen && standPopup.stand && (
        <div className="floating-stand-popup-card">
          {/* Header */}
          <div className="stand-popup-header">
            <div className="stand-popup-title-col">
              <div className="stand-badge-pill">
                <span>{standPopup.stand.tier || 'AUTO STAND HUB'}</span>
              </div>
              <h3 className="stand-popup-name">
                {language === 'bn' ? standPopup.stand.bengaliName : standPopup.stand.name}
              </h3>
              <p className="stand-popup-sub">
                {standPopup.stand.coordsDescription || 'Kolkata Transit Corridor'}
              </p>
            </div>
            <button
              onClick={closeStandPopup}
              className="stand-popup-close-btn"
              title="Close Popup"
              aria-label="Close Stand Popup"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Meta Stats */}
          <div className="stand-popup-stats-grid">
            <div className="stand-popup-stat-item">
              <span className="stat-label">Active Routes</span>
              <span className="stat-val">{standPopup.routes.length || 4} Corridors</span>
            </div>
            <div className="stand-popup-stat-item">
              <span className="stat-label">Queue Format</span>
              <span className="stat-val">{standPopup.stand.queueSystem || 'Union Regulated'}</span>
            </div>
            <div className="stand-popup-stat-item">
              <span className="stat-label">Operating Hours</span>
              <span className="stat-val">{standPopup.stand.serviceSpan || '06:00 - 23:00'}</span>
            </div>
            <div className="stand-popup-stat-item">
              <span className="stat-label">Dispatch Status</span>
              <span className="stat-val" style={{ color: '#16a34a', fontWeight: 800 }}>
                ● Active Dispatch
              </span>
            </div>
          </div>

          {/* Available Routes List departing from this stand */}
          <div className="stand-popup-routes-sec">
            <div className="stand-popup-routes-hdr">
              <span>Departing Routes ({standPopup.routes.length})</span>
            </div>

            {standPopup.routes.length > 0 ? (
              <div className="stand-popup-route-items">
                {standPopup.routes.map((route) => {
                  const isCurrent = route.id === selectedRoute?.id;
                  return (
                    <div
                      key={route.id}
                      className={`stand-popup-route-row ${isCurrent ? 'selected-corridor' : ''}`}
                      onClick={() => setSelectedRouteId(route.id)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              background: isCurrent ? '#0D5C3A' : '#F1F5F9',
                              color: isCurrent ? '#FFFFFF' : '#475569',
                              padding: '2px 5px',
                              borderRadius: '4px'
                            }}
                          >
                            {route.code}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>
                            {language === 'bn' ? route.bengaliName : route.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                          {route.subtitle || route.category}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803d' }}>
                          {route.fareRange || route.fareFixed}
                        </div>
                        <span style={{ fontSize: '9px', color: '#166534', fontWeight: 700 }}>
                          {isCurrent ? '● Active' : 'Highlight →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                No active routes registered for this stand.
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div
            style={{
              padding: '8px 14px',
              background: '#FFFFFF',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <button
              onClick={() => {
                closeStandPopup();
                setShowStandModal(true);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>View Full Hub Details</span>
              <ChevronRight size={14} />
            </button>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Union Regulated</span>
          </div>
        </div>
      )}

      {/* Floating Bottom Stand Badge (matching Image 1) */}
      {showBottomToast && selectedStand && (
        <div className="stand-bottom-toast">
          <div className="toast-auto-icon-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 8h-1.26a8 8 0 0 0-11.48 0H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1.1a3 3 0 0 0 5.8 0h4.2a3 3 0 0 0 5.8 0H21a1 1 0 0 0 1-1v-5a2 2 0 0 0-2-2zM9 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm10 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3-6H8V7.5A1.5 1.5 0 0 1 9.5 6h5A1.5 1.5 0 0 1 16 7.5V10z" />
            </svg>
          </div>

          <div
            className="toast-text-col"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowStandModal(true)}
          >
            <div className="toast-title-row">
              <span>{selectedStand.fullName || selectedStand.name}</span>
              <span className="toast-green-dot" />
            </div>
            <div className="toast-bengali-desc">
              {language === 'bn' ? selectedStand.taglineBengali : selectedStand.taglineBengali}
            </div>
          </div>

          <button
            className="toast-close-btn"
            onClick={() => setShowBottomToast(false)}
            title="Dismiss Stand Toast"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
