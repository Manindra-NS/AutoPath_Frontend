import React, { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * ContributeMap — Interactive map for selecting route coordinates.
 *
 * Renders a Leaflet map that allows users to:
 * - Click to place start, destination, and intermediate points
 * - Drag markers to adjust positions
 * - Display a polyline connecting all points in order
 *
 * Props:
 *   selectionMode   — 'start' | 'end' | 'waypoint' | null
 *   startPoint      — { lat, lng } | null
 *   endPoint        — { lat, lng } | null
 *   waypoints       — [{ lat, lng }, ...]
 *   onMapClick      — (latlng: { lat, lng }) => void
 *   onMarkerDrag    — (type: 'start'|'end'|'waypoint', index: number|null, latlng: { lat, lng }) => void
 *   readOnly        — disables click interaction (preview mode)
 */

const KOLKATA_CENTER = [22.5726, 88.3639];
const DEFAULT_ZOOM = 13;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Marker icon factories ─── */
function createStartIcon() {
  return L.divIcon({
    className: 'contribute-marker',
    html: `
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: #16a34a; border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-weight: 800; font-size: 14px;
      ">A</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createEndIcon() {
  return L.divIcon({
    className: 'contribute-marker',
    html: `
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: #dc2626; border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-weight: 800; font-size: 14px;
      ">B</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createStoppageIcon(pointNumber) {
  return L.divIcon({
    className: 'contribute-marker contribute-stoppage-marker',
    html: `
      <div style="
        width: 30px; height: 30px; border-radius: 50%;
        background: #2563eb; border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-weight: 800; font-size: 12px;
      ">${pointNumber}</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function createGeometryIcon() {
  return L.divIcon({
    className: 'contribute-marker contribute-geometry-marker',
    html: `
      <div style="
        width: 14px; height: 14px; border-radius: 50%;
        background: #475569; border: 2.5px solid #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function ContributeMap({
  selectionMode,
  startPoint,
  endPoint,
  startName,
  endName,
  waypoints = [],
  onMapClick,
  onMarkerDrag,
  readOnly = false,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({ start: null, end: null, waypoints: [] });
  const polylineRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  /* ─── Initialize Leaflet map ─── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: KOLKATA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    // Tile layer: Google Maps tiles if API key available, else CartoDB
    if (GOOGLE_MAPS_API_KEY) {
      const GoogleTiles = L.GridLayer.extend({
        createTile(coords) {
          const tile = document.createElement('img');
          tile.style.width = '256px';
          tile.style.height = '256px';
          tile.src = `https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i${coords.z}!2i${coords.x}!3i${coords.y}!4i256!2m3!1e0!2sm!3i${Date.now()}&key=${GOOGLE_MAPS_API_KEY}`;
          tile.onerror = () => {
            // Fallback to CartoDB on tile error
            L.tileLayer(
              'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
              { subdomains: 'abcd', maxZoom: 19 }
            ).addTo(map);
          };
          return tile;
        },
      });
      new GoogleTiles({ tileSize: 256, maxZoom: 20 }).addTo(map);
    } else {
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 19 }
      ).addTo(map);
    }

    // Zoom controls
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    // Ensure map tiles render properly when container size is initialized
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  /* ─── Invalidate map size on container resize ─── */
  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [mapReady]);

  /* ─── Handle map clicks ─── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || readOnly) return;

    const handleClick = (e) => {
      if (selectionMode && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [selectionMode, onMapClick, readOnly, mapReady]);

  /* ─── Update cursor style based on selection mode ─── */
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    if (selectionMode && !readOnly) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [selectionMode, readOnly]);

  /* ─── Sync markers and polyline with props ─── */
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;

    // --- Start marker ---
    if (startPoint) {
      const startTooltip = startName ? `Start: ${startName}` : 'Starting Point';
      const startPopup = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 140px;">
          <div style="font-weight: 700; color: #16A34A;">🟢 Starting Point</div>
          ${startName ? `<div style="font-weight: 600; color: #1E293B; margin: 3px 0;">${escapeHtml(startName)}</div>` : ''}
          <div style="color: #64748B; font-size: 11px; font-family: monospace; margin-top: 3px;">
            ${startPoint.lat.toFixed(5)}, ${startPoint.lng.toFixed(5)}
          </div>
        </div>
      `;

      if (markers.start) {
        markers.start.setLatLng([startPoint.lat, startPoint.lng]);
        markers.start.setTooltipContent(startTooltip);
        markers.start.setPopupContent(startPopup);
      } else {
        const m = L.marker([startPoint.lat, startPoint.lng], {
          icon: createStartIcon(),
          draggable: !readOnly,
          zIndexOffset: 1000,
        }).addTo(map);
        m.bindTooltip(startTooltip, { direction: 'top', offset: [0, -16] });
        m.bindPopup(startPopup);
        if (!readOnly) {
          m.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            onMarkerDrag?.('start', null, { lat: pos.lat, lng: pos.lng });
          });
        }
        markers.start = m;
      }
    } else if (markers.start) {
      map.removeLayer(markers.start);
      markers.start = null;
    }

    // --- End marker ---
    if (endPoint) {
      const endTooltip = endName ? `Destination: ${endName}` : 'Destination';
      const endPopup = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 140px;">
          <div style="font-weight: 700; color: #DC2626;">🔴 Destination</div>
          ${endName ? `<div style="font-weight: 600; color: #1E293B; margin: 3px 0;">${escapeHtml(endName)}</div>` : ''}
          <div style="color: #64748B; font-size: 11px; font-family: monospace; margin-top: 3px;">
            ${endPoint.lat.toFixed(5)}, ${endPoint.lng.toFixed(5)}
          </div>
        </div>
      `;

      if (markers.end) {
        markers.end.setLatLng([endPoint.lat, endPoint.lng]);
        markers.end.setTooltipContent(endTooltip);
        markers.end.setPopupContent(endPopup);
      } else {
        const m = L.marker([endPoint.lat, endPoint.lng], {
          icon: createEndIcon(),
          draggable: !readOnly,
          zIndexOffset: 1000,
        }).addTo(map);
        m.bindTooltip(endTooltip, { direction: 'top', offset: [0, -16] });
        m.bindPopup(endPopup);
        if (!readOnly) {
          m.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            onMarkerDrag?.('end', null, { lat: pos.lat, lng: pos.lng });
          });
        }
        markers.end = m;
      }
    } else if (markers.end) {
      map.removeLayer(markers.end);
      markers.end = null;
    }

    // --- Waypoint markers ---
    // Remove excess markers
    while (markers.waypoints.length > waypoints.length) {
      const old = markers.waypoints.pop();
      map.removeLayer(old);
    }

    waypoints.forEach((wp, i) => {
      const isStoppage = Boolean(wp.is_intermediate_stoppage);
      const pointNum = i + 2;
      const cleanName = (wp.stoppage_name || wp.name || '').trim();

      const icon = isStoppage ? createStoppageIcon(pointNum) : createGeometryIcon();
      const zIndex = isStoppage ? 600 : 400;

      const tooltipText = isStoppage
        ? `🚏 Stoppage: ${cleanName || `Point ${pointNum}`}`
        : `Point ${pointNum} (Geometry only)`;

      const popupHtml = isStoppage
        ? `
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 160px;">
            <div style="font-weight: 700; color: #2563EB;">🚏 Intermediate Passenger Stoppage</div>
            <div style="font-size: 11px; color: #64748B;">Point ${pointNum}</div>
            ${cleanName ? `<div style="font-size: 13px; font-weight: 600; color: #0D5C3A; margin: 3px 0;">📍 ${escapeHtml(cleanName)}</div>` : ''}
            <div style="color: #64748B; font-size: 11px; font-family: monospace; margin-top: 3px;">
              ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}
            </div>
          </div>
        `
        : `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 150px;">
            <div style="font-weight: 700; color: #475569;">📐 Route Geometry Point</div>
            <div style="font-size: 11px; color: #64748B; margin: 2px 0;">Point ${pointNum} • Route path alignment (Not a passenger stoppage)</div>
            <div style="color: #64748B; font-size: 11px; font-family: monospace; margin-top: 4px;">
              ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}
            </div>
          </div>
        `;

      if (markers.waypoints[i]) {
        markers.waypoints[i].setLatLng([wp.lat, wp.lng]);
        markers.waypoints[i].setIcon(icon);
        markers.waypoints[i].setZIndexOffset(zIndex);
        markers.waypoints[i].setTooltipContent(tooltipText);
        markers.waypoints[i].setPopupContent(popupHtml);
      } else {
        const m = L.marker([wp.lat, wp.lng], {
          icon,
          draggable: !readOnly,
          zIndexOffset: zIndex,
        }).addTo(map);
        m.bindTooltip(tooltipText, {
          direction: 'top',
          offset: [0, isStoppage ? -15 : -7]
        });
        m.bindPopup(popupHtml);
        if (!readOnly) {
          m.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            onMarkerDrag?.('waypoint', i, { lat: pos.lat, lng: pos.lng });
          });
        }
        markers.waypoints[i] = m;
      }
    });

    // --- Polyline ---
    const allCoords = [];
    if (startPoint) allCoords.push([startPoint.lat, startPoint.lng]);
    waypoints.forEach((wp) => allCoords.push([wp.lat, wp.lng]));
    if (endPoint) allCoords.push([endPoint.lat, endPoint.lng]);

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (allCoords.length >= 2) {
      polylineRef.current = L.polyline(allCoords, {
        color: '#0D5C3A',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }
  }, [startPoint, endPoint, startName, endName, waypoints, readOnly, onMarkerDrag]);

  useEffect(() => {
    if (mapReady) updateMarkers();
  }, [mapReady, updateMarkers]);

  /* ─── Fit map bounds to show all points ─── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const allCoords = [];
    if (startPoint) allCoords.push([startPoint.lat, startPoint.lng]);
    waypoints.forEach((wp) => allCoords.push([wp.lat, wp.lng]));
    if (endPoint) allCoords.push([endPoint.lat, endPoint.lng]);

    if (allCoords.length >= 2) {
      map.fitBounds(L.latLngBounds(allCoords), {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
      });
    } else if (allCoords.length === 1) {
      map.setView(allCoords[0], 15, { animate: true });
    }
  }, [startPoint, endPoint, waypoints.length, mapReady]);

  /* ─── Selection mode indicator ─── */
  const modeLabel = selectionMode === 'start'
    ? '🟢 Click on the map to place the starting point'
    : selectionMode === 'end'
      ? '🔴 Click on the map to place the destination'
      : selectionMode === 'waypoint'
        ? '🔵 Click on the map to add an intermediate point'
        : null;

  return (
    <div className="contribute-map-container">
      {modeLabel && (
        <div className="contribute-map-mode-banner">
          {modeLabel}
        </div>
      )}
      <div ref={mapContainerRef} className="contribute-map-canvas" />
    </div>
  );
}

