import React, { useState } from 'react';
import { useTransit } from '../context/TransitContext';
import { X, SlidersHorizontal, Check, RefreshCw, Smartphone, Eye } from 'lucide-react';

export default function PreferencesModal() {
  const { showPreferencesModal, setShowPreferencesModal, t } = useTransit();

  const [fareMode, setFareMode] = useState('per-seat'); // 'per-seat' | 'charter'
  const [showBengaliScript, setShowBengaliScript] = useState(true);
  const [maxWalkingDist, setMaxWalkingDist] = useState(500); // meters
  const [hapticFeedback, setHapticFeedback] = useState(true);

  if (!showPreferencesModal) return null;

  return (
    <div className="modal-backdrop" onClick={() => setShowPreferencesModal(false)}>
      <div
        className="welcome-modal-card"
        style={{ width: '520px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pref-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ECFDF5',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 id="pref-title" style={{ fontSize: '18px', fontWeight: 800 }}>
                {t.navPreferences}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Customize your Kolkata transit discovery experience
              </span>
            </div>
          </div>

          <button
            className="icon-btn-circle"
            onClick={() => setShowPreferencesModal(false)}
            id="close-preferences-modal"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Fare Preference */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Primary Fare Display Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className={`filter-pill ${fareMode === 'per-seat' ? 'active' : ''}`}
                style={{ textAlign: 'center', padding: '10px' }}
                onClick={() => setFareMode('per-seat')}
              >
                Per Seat Shared Fare (₹12 - ₹18)
              </button>
              <button
                type="button"
                className={`filter-pill ${fareMode === 'charter' ? 'active' : ''}`}
                style={{ textAlign: 'center', padding: '10px' }}
                onClick={() => setFareMode('charter')}
              >
                Charter Reserve (4 Seats)
              </button>
            </div>
          </div>

          {/* Bengali Script Transliteration */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Show Dual Bengali Script</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Display stand names in original Bengali script alongside English
              </div>
            </div>
            <input
              type="checkbox"
              checked={showBengaliScript}
              onChange={(e) => setShowBengaliScript(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brand-green)' }}
            />
          </div>

          {/* Walking Distance Tolerance */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
              <span>Max Walking Distance for Transfers</span>
              <span style={{ color: 'var(--brand-green)' }}>{maxWalkingDist} meters</span>
            </div>
            <input
              type="range"
              min="200"
              max="1000"
              step="100"
              value={maxWalkingDist}
              onChange={(e) => setMaxWalkingDist(Number(e.target.value))}
              style={{ width: '100%', marginTop: '8px', accentColor: 'var(--brand-green)' }}
            />
          </div>

          {/* Haptic Cues */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Transit Station Audio / Haptic cues</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Subtle feedback when selecting routes and stops
              </div>
            </div>
            <input
              type="checkbox"
              checked={hapticFeedback}
              onChange={(e) => setHapticFeedback(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brand-green)' }}
            />
          </div>
        </div>

        <button
          className="btn-get-started"
          onClick={() => setShowPreferencesModal(false)}
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
