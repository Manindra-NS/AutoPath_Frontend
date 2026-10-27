import React from 'react';
import { useTransit } from '../context/TransitContext';
import { WifiOff, Info, Layers, RefreshCw } from 'lucide-react';

export default function OfflineFallbackMap() {
  const {
    selectedRoute,
    setSelectedRouteId,
    selectedStand,
    setSelectedStandId,
    stands,
    t,
    language
  } = useTransit();

  // Schematic coordinate mappings for SVG view (normalized 0-800, 0-600)
  const standSvgPositions = {
    'ruby-more': { x: 620, y: 280, label: 'Ruby More (রুবি মোড়)', code: 'RUBY' },
    'gariahat': { x: 300, y: 280, label: 'Gariahat (গড়িয়াহাট)', code: 'GARIAHAT' },
    'jadavpur-8b': { x: 340, y: 440, label: 'Jadavpur 8B (৮বি)', code: '8B' },
    'garia-metro': { x: 420, y: 550, label: 'Garia Metro (কবি নজরুল)', code: 'GARIA' },
    'chowbaga': { x: 740, y: 240, label: 'Chowbaga (চৌবাগা)', code: 'CHOWBAGA' },
    'ballygunge-phari': { x: 310, y: 180, label: 'Ballygunge Phari', code: 'PHARI' }
  };

  const intermediateStopsSvg = [
    { x: 530, y: 280, name: 'Acropolis Mall', km: '1.1 km' },
    { x: 450, y: 280, name: 'Kasba Thana', km: '2.3 km' },
    { x: 390, y: 280, name: 'Bijan Setu', km: '3.1 km' },
    { x: 340, y: 280, name: 'Ballygunge Stn', km: '3.7 km' }
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Offline Status Top Alert */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#FFFFFF',
          border: '1px solid #FCD34D',
          borderRadius: '20px',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#B45309',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 100
        }}
      >
        <WifiOff size={14} />
        <span>Offline Cached Corridor Schematic Active</span>
      </div>

      {/* SVG Canvas Map */}
      <svg
        viewBox="0 0 900 650"
        style={{ width: '100%', height: '100%', userSelect: 'none' }}
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
          </pattern>
          {/* Neon Route Glow Filter */}
          <filter id="corridor-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#15803d" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Grid Background */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Kolkata Major Arterial Reference Waterways / Bypass */}
        <path
          d="M 640 40 Q 625 280 635 620"
          stroke="#CBD5E1"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        <text x="650" y="80" fill="#94A3B8" fontSize="11" fontWeight="700" letterSpacing="0.1em">
          E.M. BYPASS (EAST METRO CORRIDOR)
        </text>

        {/* East Kolkata Wetlands Ambient Label */}
        <text x="710" y="140" fill="#CBD5E1" fontSize="14" fontWeight="800" letterSpacing="0.15em">
          EAST KOLKATA WETLANDS
        </text>

        {/* South Kolkata Urban Area Label */}
        <text x="180" y="320" fill="#CBD5E1" fontSize="16" fontWeight="800" letterSpacing="0.2em">
          SOUTH KOLKATA
        </text>

        {/* Alternative Route Corridors (Muted / Dashed lines) */}
        {/* Ruby to Jadavpur 8B */}
        <path
          d="M 620 280 L 520 380 L 340 440"
          stroke="#94A3B8"
          strokeWidth="3"
          strokeDasharray="6,6"
          fill="none"
        />
        {/* Ruby to Garia Metro */}
        <path
          d="M 620 280 L 630 460 L 420 550"
          stroke="#94A3B8"
          strokeWidth="3"
          strokeDasharray="6,6"
          fill="none"
        />
        {/* Ruby to Chowbaga */}
        <path
          d="M 620 280 L 740 240"
          stroke="#94A3B8"
          strokeWidth="3"
          strokeDasharray="6,6"
          fill="none"
        />
        {/* Gariahat to Jadavpur 8B */}
        <path
          d="M 300 280 L 340 440"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeDasharray="4,4"
          fill="none"
        />

        {/* PRIMARY HIGHLIGHTED CORRIDOR: Ruby More to Gariahat (AK-14) */}
        <path
          d="M 620 280 L 300 280"
          stroke="#15803d"
          strokeWidth="8"
          strokeLinecap="round"
          filter="url(#corridor-glow)"
          fill="none"
        />
        <path
          d="M 620 280 L 300 280"
          stroke="#bef264"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Intermediate Stop Markers along Ruby - Gariahat */}
        {intermediateStopsSvg.map((st, i) => (
          <g key={i} transform={`translate(${st.x}, ${st.y})`}>
            <circle r="7" fill="#FFFFFF" stroke="#15803d" strokeWidth="2.5" />
            <text
              y="-12"
              textAnchor="middle"
              fill="#334155"
              fontSize="10"
              fontWeight="700"
            >
              {st.name}
            </text>
            <text
              y="18"
              textAnchor="middle"
              fill="#64748B"
              fontSize="9"
              fontWeight="600"
            >
              {st.km}
            </text>
          </g>
        ))}

        {/* Stand Nodes (Yellow-Green interactive circles) */}
        {Object.entries(standSvgPositions).map(([id, pos]) => {
          const isSelected = selectedStand?.id === id;
          return (
            <g
              key={id}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedStandId(id)}
            >
              {/* Outer pulsing ring for selected stand */}
              {isSelected && (
                <circle
                  r="26"
                  fill="none"
                  stroke="#84CC16"
                  strokeWidth="2.5"
                  strokeDasharray="4,3"
                  opacity="0.8"
                />
              )}
              {/* Yellow glow base */}
              <circle r="18" fill="rgba(254, 240, 138, 0.6)" />
              {/* Green Stand Body */}
              <circle
                r="12"
                fill={isSelected ? '#0D5C3A' : '#15803d'}
                stroke="#FEF08A"
                strokeWidth="2.5"
              />
              <circle r="4" fill="#FFFFFF" />

              {/* Stand Name Badge */}
              <rect
                x="-55"
                y="-42"
                width="110"
                height="22"
                rx="6"
                fill="#1E293B"
                opacity="0.9"
              />
              <text
                x="0"
                y="-28"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="700"
              >
                {pos.label.split('(')[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
