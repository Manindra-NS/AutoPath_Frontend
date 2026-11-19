import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  MapPin, Navigation, Plus, Trash2, RotateCcw, ChevronRight,
  ChevronLeft, Check, Send, Loader, AlertTriangle, Info,
  X, Eye, Crosshair, ArrowLeftRight, ArrowRight
} from 'lucide-react';
import { useTransit } from '../context/TransitContext';
import { apiClient } from '../services/apiClient';
import { ENDPOINTS } from '../services/apiConfig';
import ContributeMap from './ContributeMap';

/**
 * Debounce delay for autocomplete API calls (ms).
 */
const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/**
 * ContributePanel — Multi-step community route contribution interface.
 *
 * Step 1: Route Information (names, description, fare, direction)
 * Step 2: Interactive Map Coordinate Selection (stoppages & geometry)
 * Step 3: Review & Confirm
 * Step 4: Submission Result
 */
export default function ContributePanel() {
  const { searchLocations } = useTransit();

  // ─── Step tracking ───
  const [currentStep, setCurrentStep] = useState(1);

  // ─── Step 1: Route info ───
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const [direction, setDirection] = useState('bidirectional'); // 'bidirectional' | 'one_way'
  const [description, setDescription] = useState('');
  const [fare, setFare] = useState('');
  const [routeName, setRouteName] = useState('');

  // ─── Step 2: Map coordinates ───
  const [startPoint, setStartPoint] = useState(null); // { lat, lng }
  const [endPoint, setEndPoint] = useState(null);
  const [waypoints, setWaypoints] = useState([]); // [{ lat, lng, is_intermediate_stoppage, stoppage_name }, ...]
  const [selectionMode, setSelectionMode] = useState(null); // 'start' | 'end' | 'waypoint' | null
  const [showGuide, setShowGuide] = useState(true);
  const [showMobileWaypointsDrawer, setShowMobileWaypointsDrawer] = useState(false);
  const [attemptedStep2Next, setAttemptedStep2Next] = useState(false);

  // ─── Step 4: Submission ───
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null); // { success, id?, error? }

  // ─── Autocomplete state ───
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [isLoadingStartSuggestions, setIsLoadingStartSuggestions] = useState(false);
  const [isLoadingEndSuggestions, setIsLoadingEndSuggestions] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState(null); // 'start' | 'end' | null
  const startDebounceRef = useRef(null);
  const endDebounceRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (startDebounceRef.current) clearTimeout(startDebounceRef.current);
      if (endDebounceRef.current) clearTimeout(endDebounceRef.current);
    };
  }, []);

  // ─── Autocomplete fetch ───
  const fetchSuggestions = useCallback((field, query) => {
    const debounceRef = field === 'start' ? startDebounceRef : endDebounceRef;
    const setLoading = field === 'start' ? setIsLoadingStartSuggestions : setIsLoadingEndSuggestions;
    const setSuggestions = field === 'start' ? setStartSuggestions : setEndSuggestions;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = (query || '').trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchLocations(trimmed);
        if (res.success && Array.isArray(res.data)) {
          setSuggestions(res.data.slice(0, 8));
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }, [searchLocations]);

  // Trigger autocomplete when input changes
  useEffect(() => {
    if (activeAutocomplete === 'start') {
      fetchSuggestions('start', startName);
    }
  }, [startName, activeAutocomplete, fetchSuggestions]);

  useEffect(() => {
    if (activeAutocomplete === 'end') {
      fetchSuggestions('end', endName);
    }
  }, [endName, activeAutocomplete, fetchSuggestions]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        startInputRef.current && !startInputRef.current.contains(e.target) &&
        endInputRef.current && !endInputRef.current.contains(e.target)
      ) {
        setActiveAutocomplete(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectSuggestion = (field, suggestion) => {
    const name = suggestion.name || suggestion.stop_name || suggestion.label || '';
    if (field === 'start') {
      setStartName(name);
      setStartSuggestions([]);
      // If suggestion has coordinates, set the start point
      const lat = suggestion.latitude || suggestion.lat;
      const lng = suggestion.longitude || suggestion.lng;
      if (lat && lng) {
        setStartPoint({ lat: parseFloat(lat), lng: parseFloat(lng) });
      }
    } else {
      setEndName(name);
      setEndSuggestions([]);
      const lat = suggestion.latitude || suggestion.lat;
      const lng = suggestion.longitude || suggestion.lng;
      if (lat && lng) {
        setEndPoint({ lat: parseFloat(lat), lng: parseFloat(lng) });
      }
    }
    setActiveAutocomplete(null);
  };

  // ─── Map interaction handlers ───
  const handleMapClick = useCallback((latlng) => {
    if (selectionMode === 'start') {
      setStartPoint(latlng);
      if (!startName) setStartName(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setSelectionMode(endPoint ? 'waypoint' : 'end');
    } else if (selectionMode === 'end') {
      setEndPoint(latlng);
      if (!endName) setEndName(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setSelectionMode(null);
    } else if (selectionMode === 'waypoint') {
      setWaypoints(prev => [
        ...prev,
        {
          lat: latlng.lat,
          lng: latlng.lng,
          is_intermediate_stoppage: false,
          stoppage_name: '',
          name: '',
        }
      ]);
      setShowMobileWaypointsDrawer(true);
    }
  }, [selectionMode, startName, endName, endPoint]);

  const handleMarkerDrag = useCallback((type, index, latlng) => {
    if (type === 'start') {
      setStartPoint(latlng);
    } else if (type === 'end') {
      setEndPoint(latlng);
    } else if (type === 'waypoint' && index !== null) {
      setWaypoints(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], lat: latlng.lat, lng: latlng.lng };
        }
        return updated;
      });
    }
  }, []);

  const handleToggleWaypointStoppage = (index, isChecked) => {
    setWaypoints(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          is_intermediate_stoppage: isChecked,
          stoppage_name: isChecked ? (updated[index].stoppage_name || '') : '',
          name: isChecked ? (updated[index].stoppage_name || '') : '',
        };
      }
      return updated;
    });
  };

  const handleUpdateWaypointStoppageName = (index, stoppageName) => {
    setWaypoints(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          stoppage_name: stoppageName,
          name: stoppageName,
        };
      }
      return updated;
    });
  };

  const handleUndoLastPoint = () => {
    if (waypoints.length > 0) {
      setWaypoints(prev => prev.slice(0, -1));
    } else if (endPoint) {
      setEndPoint(null);
    } else if (startPoint) {
      setStartPoint(null);
    }
  };

  const handleRemoveWaypoint = (index) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearWaypoints = () => {
    setWaypoints([]);
  };

  const handleClearAll = () => {
    setStartPoint(null);
    setEndPoint(null);
    setWaypoints([]);
    setSelectionMode('start');
    setAttemptedStep2Next(false);
  };

  // ─── Step navigation & validation ───
  const hasInvalidStoppages = waypoints.some(
    (wp) => wp.is_intermediate_stoppage && (!wp.stoppage_name || !wp.stoppage_name.trim())
  );
  const canProceedStep1 = Boolean(startName.trim() && endName.trim());
  const canProceedStep2 = Boolean(startPoint && endPoint && !hasInvalidStoppages);

  const goToStep = (step) => {
    setCurrentStep(step);
    if (step === 2 && !startPoint && !endPoint) {
      setSelectionMode('start');
      setShowGuide(true);
    }
  };

  const handleProceedToStep3 = () => {
    if (hasInvalidStoppages) {
      setAttemptedStep2Next(true);
      setShowMobileWaypointsDrawer(true);
      return;
    }
    setCurrentStep(3);
    setSelectionMode(null);
  };

  // ─── Build submission payload ───
  const buildPayload = () => {
    const routePoints = [];
    let sequence = 1;

    // Start point
    if (startPoint) {
      routePoints.push({
        sequence: sequence++,
        latitude: startPoint.lat,
        longitude: startPoint.lng,
        is_intermediate_stoppage: false,
        stoppage_name: null,
        name: startName.trim() || null,
      });
    }

    // Intermediate waypoints
    waypoints.forEach((wp) => {
      const isStoppage = Boolean(wp.is_intermediate_stoppage);
      const cleanName = (isStoppage && wp.stoppage_name && wp.stoppage_name.trim())
        ? wp.stoppage_name.trim()
        : null;

      routePoints.push({
        sequence: sequence++,
        latitude: wp.lat,
        longitude: wp.lng,
        is_intermediate_stoppage: isStoppage,
        stoppage_name: cleanName,
        name: cleanName,
      });
    });

    // End point
    if (endPoint) {
      routePoints.push({
        sequence: sequence++,
        latitude: endPoint.lat,
        longitude: endPoint.lng,
        is_intermediate_stoppage: false,
        stoppage_name: null,
        name: endName.trim() || null,
      });
    }

    return {
      start_name: startName.trim(),
      start_latitude: startPoint?.lat,
      start_longitude: startPoint?.lng,
      end_name: endName.trim(),
      end_latitude: endPoint?.lat,
      end_longitude: endPoint?.lng,
      direction: direction, // 'bidirectional' or 'one_way'
      is_bidirectional: direction === 'bidirectional',
      route_points: routePoints,
      description: description.trim() || undefined,
      estimated_fare: fare.trim() || undefined,
      route_name: routeName.trim() || undefined,
    };
  };

  // ─── Submit contribution ───
  const handleSubmit = async () => {
    if (!canProceedStep2) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const payload = buildPayload();

      const response = await apiClient.post(ENDPOINTS.contributions, payload);

      setSubmissionResult({
        success: true,
        id: response?.id || response?.contribution_id || response?.data?.id,
        status: response?.status || 'pending',
      });
      setCurrentStep(4);
    } catch (err) {
      setSubmissionResult({
        success: false,
        error: err.message || 'Failed to submit contribution. Please try again.',
      });
      setCurrentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Reset form ───
  const handleReset = () => {
    setCurrentStep(1);
    setStartName('');
    setEndName('');
    setDirection('bidirectional');
    setDescription('');
    setFare('');
    setRouteName('');
    setStartPoint(null);
    setEndPoint(null);
    setWaypoints([]);
    setSelectionMode(null);
    setShowGuide(true);
    setSubmissionResult(null);
    setAttemptedStep2Next(false);
  };

  // ─── Autocomplete dropdown renderer ───
  const renderAutocomplete = (field) => {
    const suggestions = field === 'start' ? startSuggestions : endSuggestions;
    const isLoading = field === 'start' ? isLoadingStartSuggestions : isLoadingEndSuggestions;

    if (activeAutocomplete !== field) return null;

    return (
      <div className="contribute-autocomplete-dropdown">
        {isLoading ? (
          <div className="contribute-autocomplete-loading">
            <Loader size={14} className="contribute-spinner" />
            <span>Searching locations…</span>
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((s, i) => (
            <button
              key={s.id || s.name || i}
              className="contribute-autocomplete-item"
              onClick={() => handleSelectSuggestion(field, s)}
              type="button"
            >
              <MapPin size={14} />
              <div className="contribute-autocomplete-item-text">
                <span className="contribute-autocomplete-name">
                  {s.name || s.stop_name || s.label}
                </span>
                {s.type && (
                  <span className="contribute-autocomplete-badge">
                    {s.type}
                  </span>
                )}
              </div>
            </button>
          ))
        ) : (field === 'start' ? startName : endName).trim().length >= 2 ? (
          <div className="contribute-autocomplete-empty">
            No matching locations found
          </div>
        ) : null}
      </div>
    );
  };

  // ─── Step progress bar ───
  const renderStepProgress = () => (
    <div className="contribute-step-progress">
      {[1, 2, 3].map((step) => (
        <div key={step} className={`contribute-step-dot ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
          {currentStep > step ? <Check size={12} /> : step}
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════
  //  STEP 1 — Route Information
  // ════════════════════════════════
  const renderStep1 = () => (
    <div className="contribute-step-content contribute-step-info">
      <div className="contribute-form-card">
        <div className="contribute-step-header">
          <div className="contribute-step-number">1</div>
          <div>
            <h3 className="contribute-step-title">Route Information</h3>
            <p className="contribute-step-subtitle">Enter the start, destination, and optional details</p>
          </div>
        </div>

        <div className="contribute-form-grid">
          <div className="contribute-form-group">
            <label className="contribute-label">
              <span className="contribute-label-dot" style={{ background: '#16a34a' }} />
              Starting Location <span className="contribute-required">*</span>
            </label>
            <div className="contribute-input-wrap" ref={startInputRef}>
              <MapPin size={16} className="contribute-input-icon" />
              <input
                type="text"
                className="contribute-input"
                placeholder="Search or type starting location"
                value={startName}
                onChange={(e) => setStartName(e.target.value)}
                onFocus={() => setActiveAutocomplete('start')}
              />
              {startName && (
                <button className="contribute-input-clear" onClick={() => { setStartName(''); setStartPoint(null); }} type="button">
                  <X size={14} />
                </button>
              )}
              {renderAutocomplete('start')}
            </div>
          </div>

          <div className="contribute-form-group">
            <label className="contribute-label">
              <span className="contribute-label-dot" style={{ background: '#dc2626' }} />
              Destination <span className="contribute-required">*</span>
            </label>
            <div className="contribute-input-wrap" ref={endInputRef}>
              <Navigation size={16} className="contribute-input-icon" />
              <input
                type="text"
                className="contribute-input"
                placeholder="Search or type destination"
                value={endName}
                onChange={(e) => setEndName(e.target.value)}
                onFocus={() => setActiveAutocomplete('end')}
              />
              {endName && (
                <button className="contribute-input-clear" onClick={() => { setEndName(''); setEndPoint(null); }} type="button">
                  <X size={14} />
                </button>
              )}
              {renderAutocomplete('end')}
            </div>
          </div>
        </div>

        {/* Route Direction Selector */}
        <div className="contribute-form-group contribute-direction-group">
          <label className="contribute-label">
            Route Direction <span className="contribute-required">*</span>
          </label>
          <div className="contribute-direction-selector" role="radiogroup" aria-label="Route Direction">
            <button
              type="button"
              className={`contribute-direction-btn ${direction === 'bidirectional' ? 'active' : ''}`}
              onClick={() => setDirection('bidirectional')}
              role="radio"
              aria-checked={direction === 'bidirectional'}
            >
              <ArrowLeftRight size={18} className="contribute-direction-icon" />
              <div className="contribute-direction-text">
                <span className="contribute-direction-title">Both ways (Bidirectional)</span>
                <span className="contribute-direction-desc">Auto operates in both directions</span>
              </div>
              {direction === 'bidirectional' && <Check size={16} className="contribute-direction-check" />}
            </button>
            <button
              type="button"
              className={`contribute-direction-btn ${direction === 'one_way' ? 'active' : ''}`}
              onClick={() => setDirection('one_way')}
              role="radio"
              aria-checked={direction === 'one_way'}
            >
              <ArrowRight size={18} className="contribute-direction-icon" />
              <div className="contribute-direction-text">
                <span className="contribute-direction-title">One-way</span>
                <span className="contribute-direction-desc">Auto operates only from start to destination</span>
              </div>
              {direction === 'one_way' && <Check size={16} className="contribute-direction-check" />}
            </button>
          </div>
        </div>

        <div className="contribute-form-grid">
          <div className="contribute-form-group">
            <label className="contribute-label">
              Route Name <span className="contribute-optional">(optional)</span>
            </label>
            <input
              type="text"
              className="contribute-input contribute-input-plain"
              placeholder="e.g. Gariahat to Golpark via Dover Lane"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
            />
          </div>

          <div className="contribute-form-group">
            <label className="contribute-label">
              Estimated Fare <span className="contribute-optional">(optional)</span>
            </label>
            <input
              type="text"
              className="contribute-input contribute-input-plain"
              placeholder="e.g. ₹12 or 10-15"
              value={fare}
              onChange={(e) => setFare(e.target.value)}
            />
          </div>
        </div>

        <div className="contribute-form-group">
          <label className="contribute-label">
            Description <span className="contribute-optional">(optional)</span>
          </label>
          <textarea
            className="contribute-textarea"
            placeholder="Any additional notes about this route (landmarks, timings, etc.)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="contribute-step-actions">
          <div />
          <button
            className="contribute-btn contribute-btn-primary"
            disabled={!canProceedStep1}
            onClick={() => goToStep(2)}
          >
            Next: Select Route on Map
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════
  //  STEP 2 — Map Coordinate Selection
  // ════════════════════════════════
  const renderGuide = () => (
    <div className="contribute-guide-overlay">
      <div className="contribute-guide-card">
        <div className="contribute-guide-header">
          <Info size={18} />
          <h4>How to Map a Route</h4>
          <button className="contribute-guide-close" onClick={() => setShowGuide(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="contribute-guide-body">
          <div className="contribute-guide-step">
            <div className="contribute-guide-marker" style={{ background: '#16a34a' }}>A</div>
            <div>
              <strong>Starting Point</strong>
              <p>Click the map where the auto departs from</p>
            </div>
          </div>
          <div className="contribute-guide-step">
            <div className="contribute-guide-marker" style={{ background: '#2563eb' }}>2</div>
            <div>
              <strong>Intermediate Points</strong>
              <p>Add stops along the auto's actual path</p>
            </div>
          </div>
          <div className="contribute-guide-step">
            <div className="contribute-guide-marker" style={{ background: '#dc2626' }}>B</div>
            <div>
              <strong>Destination</strong>
              <p>Click where the auto route ends</p>
            </div>
          </div>
          <div className="contribute-guide-line-example">
            <div className="contribute-guide-line-dot" style={{ background: '#16a34a' }} />
            <div className="contribute-guide-line-dash" />
            <div className="contribute-guide-line-dot" style={{ background: '#2563eb' }} />
            <div className="contribute-guide-line-dash" />
            <div className="contribute-guide-line-dot" style={{ background: '#2563eb' }} />
            <div className="contribute-guide-line-dash" />
            <div className="contribute-guide-line-dot" style={{ background: '#dc2626' }} />
          </div>
          <p className="contribute-guide-tip">
            💡 Click points in the order the auto travels. You can drag markers to adjust their position.
          </p>
        </div>
        <button className="contribute-btn contribute-btn-primary contribute-guide-start-btn" onClick={() => {
          setShowGuide(false);
          setSelectionMode('start');
        }}>
          Got it — Start Mapping
          <Crosshair size={16} />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="contribute-step-content contribute-step-map">
      <div className="contribute-map-toolbar">
        <button
          className="contribute-btn contribute-btn-back"
          onClick={() => { setCurrentStep(1); setSelectionMode(null); }}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="contribute-map-toolbar-actions">
          {/* Selection mode buttons */}
          <button
            className={`contribute-toolbar-btn ${selectionMode === 'start' ? 'active' : ''}`}
            onClick={() => setSelectionMode('start')}
            title="Set starting point"
          >
            <span className="contribute-toolbar-dot" style={{ background: '#16a34a' }} />
            Start
          </button>
          <button
            className={`contribute-toolbar-btn ${selectionMode === 'end' ? 'active' : ''}`}
            onClick={() => setSelectionMode('end')}
            title="Set destination"
          >
            <span className="contribute-toolbar-dot" style={{ background: '#dc2626' }} />
            End
          </button>
          <button
            className={`contribute-toolbar-btn ${selectionMode === 'waypoint' ? 'active' : ''}`}
            onClick={() => setSelectionMode('waypoint')}
            title="Add intermediate point"
          >
            <Plus size={14} /> Add Point
          </button>

          <div className="contribute-toolbar-separator" />

          <button
            className="contribute-toolbar-btn"
            onClick={handleUndoLastPoint}
            title="Undo last point"
            disabled={!startPoint && !endPoint && waypoints.length === 0}
          >
            <RotateCcw size={14} /> Undo
          </button>
          <button
            className="contribute-toolbar-btn"
            onClick={handleClearWaypoints}
            title="Clear intermediate points"
            disabled={waypoints.length === 0}
          >
            <Trash2 size={14} /> Clear Points
          </button>
          <button
            className="contribute-toolbar-btn danger"
            onClick={handleClearAll}
            title="Clear everything"
            disabled={!startPoint && !endPoint && waypoints.length === 0}
          >
            <X size={14} /> Reset
          </button>
        </div>

        <button
          className="contribute-btn contribute-btn-primary"
          disabled={!startPoint || !endPoint}
          onClick={handleProceedToStep3}
        >
          Preview <Eye size={16} />
        </button>
      </div>

      <div className="contribute-map-area">
        {showGuide && renderGuide()}

        {/* Intermediate Stoppages Panel (Stoppages & Geometry Points) */}
        {waypoints.length > 0 && (
          <div className={`contribute-waypoints-panel ${showMobileWaypointsDrawer ? 'mobile-open' : ''}`}>
            <div className="contribute-waypoints-panel-header">
              <div className="contribute-waypoints-panel-title">
                <MapPin size={16} />
                <span>Intermediate Points ({waypoints.length})</span>
              </div>
              <div className="contribute-waypoints-panel-actions">
                <span className="contribute-waypoints-count-pill stoppage">
                  {waypoints.filter(wp => wp.is_intermediate_stoppage).length} Stops
                </span>
                <span className="contribute-waypoints-count-pill geometry">
                  {waypoints.filter(wp => !wp.is_intermediate_stoppage).length} Geometry
                </span>
                <button
                  type="button"
                  className="contribute-waypoints-close-btn"
                  onClick={() => setShowMobileWaypointsDrawer(false)}
                  title="Close panel"
                  aria-label="Close intermediate points panel"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {attemptedStep2Next && hasInvalidStoppages && (
              <div className="contribute-waypoints-validation-alert">
                <AlertTriangle size={15} />
                <span>Please enter a stoppage name for all checked intermediate stoppages, or uncheck the box.</span>
              </div>
            )}

            <div className="contribute-waypoints-scroll-area">
              {waypoints.map((wp, i) => {
                const isStoppage = Boolean(wp.is_intermediate_stoppage);
                const isMissingName = isStoppage && (!wp.stoppage_name || !wp.stoppage_name.trim());
                const showError = isMissingName && attemptedStep2Next;

                return (
                  <div
                    key={i}
                    className={`contribute-waypoint-card ${isStoppage ? 'is-stoppage' : 'is-geometry'} ${showError ? 'has-error' : ''}`}
                  >
                    <div className="contribute-waypoint-card-top">
                      <div className="contribute-waypoint-label-col">
                        <div className="contribute-waypoint-tag">
                          <span
                            className="contribute-waypoint-dot"
                            style={{ background: isStoppage ? '#2563eb' : '#64748b' }}
                          />
                          <strong>Intermediate Point {i + 1}</strong>
                          <span className="contribute-waypoint-num-sub">(Point {i + 2})</span>
                          <span className={`contribute-waypoint-type-pill ${isStoppage ? 'stoppage' : 'geometry'}`}>
                            {isStoppage ? 'Stoppage' : 'Geometry'}
                          </span>
                        </div>
                        <div className="contribute-waypoint-coords-text">
                          <span>Lat: {wp.lat.toFixed(5)}</span>
                          <span>•</span>
                          <span>Lng: {wp.lng.toFixed(5)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="contribute-waypoint-delete-btn"
                        onClick={() => handleRemoveWaypoint(i)}
                        title={`Remove Intermediate Point ${i + 1}`}
                        aria-label={`Remove Intermediate Point ${i + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Checkbox: Is this point an intermediate stoppage? */}
                    <label className="contribute-waypoint-checkbox-label">
                      <input
                        type="checkbox"
                        className="contribute-waypoint-checkbox"
                        checked={isStoppage}
                        onChange={(e) => handleToggleWaypointStoppage(i, e.target.checked)}
                      />
                      <span className="contribute-waypoint-checkbox-text">
                        Is this point an intermediate stoppage?
                      </span>
                    </label>

                    {/* If checked: Stoppage Name (required) */}
                    {isStoppage ? (
                      <div className="contribute-waypoint-stoppage-field">
                        <label className="contribute-waypoint-field-label">
                          Stoppage Name <span className="contribute-required">*</span>
                        </label>
                        <div className={`contribute-waypoint-input-wrap ${showError ? 'has-error' : ''}`}>
                          <input
                            type="text"
                            className="contribute-waypoint-input"
                            placeholder="Enter intermediate stoppage name"
                            value={wp.stoppage_name || ''}
                            onChange={(e) => handleUpdateWaypointStoppageName(i, e.target.value)}
                          />
                          {wp.stoppage_name && (
                            <button
                              type="button"
                              className="contribute-waypoint-clear-btn"
                              onClick={() => handleUpdateWaypointStoppageName(i, '')}
                              title="Clear name"
                              aria-label="Clear stoppage name"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        {showError && (
                          <span className="contribute-waypoint-error-text">
                            Stoppage name is required when marked as an intermediate stoppage
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="contribute-waypoint-geometry-hint">
                        Route geometry point only (no stoppage name needed)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ContributeMap
          selectionMode={selectionMode}
          startPoint={startPoint}
          endPoint={endPoint}
          startName={startName}
          endName={endName}
          waypoints={waypoints}
          onMapClick={handleMapClick}
          onMarkerDrag={handleMarkerDrag}
          readOnly={false}
        />
      </div>

      {/* Points summary bar */}
      <div className="contribute-points-summary">
        <div className="contribute-points-item">
          <span className="contribute-points-dot" style={{ background: startPoint ? '#16a34a' : '#cbd5e1' }} />
          <span>{startPoint ? `Start: ${startName || `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`}` : 'Start not set'}</span>
        </div>
        {waypoints.length > 0 && (
          <button
            type="button"
            className="contribute-points-item contribute-points-item-btn"
            onClick={() => setShowMobileWaypointsDrawer(prev => !prev)}
            title="Toggle intermediate stoppage names"
          >
            <span className="contribute-points-dot" style={{ background: '#2563eb' }} />
            <span>
              {waypoints.length} intermediate point{waypoints.length !== 1 ? 's' : ''} ({waypoints.filter(wp => wp.is_intermediate_stoppage).length} stop{waypoints.filter(wp => wp.is_intermediate_stoppage).length !== 1 ? 's' : ''}, {waypoints.filter(wp => !wp.is_intermediate_stoppage).length} geometry)
            </span>
            <span className="contribute-points-pill-badge">
              {showMobileWaypointsDrawer ? 'Hide Details ▲' : 'Manage Points ✎'}
            </span>
          </button>
        )}
        <div className="contribute-points-item">
          <span className="contribute-points-dot" style={{ background: endPoint ? '#dc2626' : '#cbd5e1' }} />
          <span>{endPoint ? `End: ${endName || `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`}` : 'Destination not set'}</span>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════
  //  STEP 3 — Review & Confirm
  // ════════════════════════════════
  const renderStep3 = () => {
    const stoppageCount = waypoints.filter(wp => wp.is_intermediate_stoppage).length;
    const geometryCount = waypoints.length - stoppageCount;
    const totalPoints = 2 + waypoints.length;
    const allPoints = [];

    if (startPoint) {
      allPoints.push({
        label: startName ? `Start: ${startName}` : 'Starting Point',
        type: 'start',
        category: 'Origin Stop',
        ...startPoint
      });
    }
    waypoints.forEach((wp, i) => {
      const isStoppage = Boolean(wp.is_intermediate_stoppage);
      const cleanName = (wp.stoppage_name && wp.stoppage_name.trim()) || '';
      allPoints.push({
        label: isStoppage
          ? `Point ${i + 2}: ${cleanName || 'Unnamed Stoppage'}`
          : `Point ${i + 2}: Geometry Point`,
        type: isStoppage ? 'stoppage' : 'geometry',
        category: isStoppage ? 'Passenger Stoppage' : 'Geometry Only',
        name: cleanName,
        ...wp
      });
    });
    if (endPoint) {
      allPoints.push({
        label: endName ? `Destination: ${endName}` : 'Destination',
        type: 'end',
        category: 'Destination Stop',
        ...endPoint
      });
    }

    return (
      <div className="contribute-step-content contribute-step-review">
        <div className="contribute-review-container">
          {/* Left Column – Contribution Details (approx 38% width on desktop) */}
          <div className="contribute-review-left-col">
            <div className="contribute-review-card-wrapper">
              <div className="contribute-step-header">
                <div className="contribute-step-number">3</div>
                <div>
                  <h3 className="contribute-step-title">Review Your Contribution</h3>
                  <p className="contribute-step-subtitle">Verify the route details before submitting</p>
                </div>
              </div>

              {/* Route info summary */}
              <div className="contribute-review-card">
                <div className="contribute-review-row">
                  <span className="contribute-review-label">From</span>
                  <span className="contribute-review-value">{startName}</span>
                </div>

                <div className="contribute-review-row">
                  <span className="contribute-review-label">Direction</span>
                  <span className="contribute-review-value">
                    <span className="contribute-direction-badge">
                      {direction === 'bidirectional' ? '↔ Both ways (Bidirectional)' : '→ One-way'}
                    </span>
                  </span>
                </div>

                {waypoints.length > 0 && (
                  <div className="contribute-review-row contribute-review-waypoints-row">
                    <span className="contribute-review-label">Intermediate Points</span>
                    <div className="contribute-review-waypoints-col">
                      {stoppageCount > 0 ? (
                        <div className="contribute-review-stoppages-group">
                          <span className="contribute-review-subheading">
                            Passenger Stoppages ({stoppageCount}):
                          </span>
                          {waypoints
                            .filter(wp => wp.is_intermediate_stoppage)
                            .map((wp, i) => (
                              <div key={i} className="contribute-review-waypoint-entry">
                                <span className="contribute-review-waypoint-num">🚏</span>
                                <span className="contribute-review-waypoint-text">
                                  {wp.stoppage_name?.trim()}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <span className="contribute-review-waypoint-text unnamed">
                          No intermediate passenger stoppages
                        </span>
                      )}
                      {geometryCount > 0 && (
                        <span className="contribute-review-geometry-note">
                          + {geometryCount} route geometry point{geometryCount !== 1 ? 's' : ''} (path alignment)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="contribute-review-row">
                  <span className="contribute-review-label">To</span>
                  <span className="contribute-review-value">{endName}</span>
                </div>
                {routeName && (
                  <div className="contribute-review-row">
                    <span className="contribute-review-label">Route Name</span>
                    <span className="contribute-review-value">{routeName}</span>
                  </div>
                )}
                {fare && (
                  <div className="contribute-review-row">
                    <span className="contribute-review-label">Estimated Fare</span>
                    <span className="contribute-review-value">{fare}</span>
                  </div>
                )}
                {description && (
                  <div className="contribute-review-row">
                    <span className="contribute-review-label">Description</span>
                    <span className="contribute-review-value">{description}</span>
                  </div>
                )}
                <div className="contribute-review-row">
                  <span className="contribute-review-label">Total Points</span>
                  <span className="contribute-review-value contribute-review-badge">
                    {totalPoints} coordinates ({stoppageCount + 2} stops, {geometryCount} geometry)
                  </span>
                </div>
              </div>

              {/* Ordered points list */}
              <div className="contribute-points-list">
                <h4 className="contribute-points-list-title">Route Coordinates ({allPoints.length})</h4>
                <div className="contribute-points-scroll-list">
                  {allPoints.map((pt, i) => (
                    <div key={i} className="contribute-point-row">
                      <span className="contribute-point-seq">{i + 1}</span>
                      <span
                        className="contribute-point-type-dot"
                        style={{
                          background:
                            pt.type === 'start'
                              ? '#16a34a'
                              : pt.type === 'end'
                                ? '#dc2626'
                                : pt.type === 'stoppage'
                                  ? '#2563eb'
                                  : '#64748b'
                        }}
                      />
                      <div className="contribute-point-details">
                        <div className="contribute-point-details-top">
                          <span className="contribute-point-label">{pt.label}</span>
                          <span className={`contribute-point-type-pill ${pt.type}`}>
                            {pt.category}
                          </span>
                        </div>
                        <span className="contribute-point-coords">{pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="contribute-step-actions contribute-review-actions">
                <button className="contribute-btn contribute-btn-secondary" onClick={() => goToStep(2)}>
                  <ChevronLeft size={16} /> Edit Details
                </button>
                <button
                  className="contribute-btn contribute-btn-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader size={16} className="contribute-spinner" /> Submitting…
                    </>
                  ) : (
                    <>
                      Submit Route <Send size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column – Interactive Map (approx 62% width on desktop) */}
          <div className="contribute-review-right-col">
            <div className="contribute-preview-map">
              <ContributeMap
                selectionMode={null}
                startPoint={startPoint}
                endPoint={endPoint}
                startName={startName}
                endName={endName}
                waypoints={waypoints}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════
  //  STEP 4 — Submission Result
  // ════════════════════════════════
  const renderStep4 = () => (
    <div className="contribute-step-content contribute-step-result">
      {submissionResult?.success ? (
        <div className="contribute-result-card success">
          <div className="contribute-result-icon success">
            <Check size={32} />
          </div>
          <h3>Thank you for contributing to AutoPath!</h3>
          <p>Your auto route has been submitted successfully and is awaiting verification.</p>
          {submissionResult.id && (
            <div className="contribute-result-id">
              <span>Submission ID:</span>
              <code>{submissionResult.id}</code>
            </div>
          )}
          <div className="contribute-result-status">
            <span className="contribute-status-badge pending">⏳ Pending Review</span>
          </div>
          <button className="contribute-btn contribute-btn-primary" onClick={handleReset}>
            Submit Another Route
          </button>
        </div>
      ) : (
        <div className="contribute-result-card error">
          <div className="contribute-result-icon error">
            <AlertTriangle size={32} />
          </div>
          <h3>Submission Failed</h3>
          <p>{submissionResult?.error || 'An unexpected error occurred. Please try again.'}</p>
          <div className="contribute-step-actions">
            <button className="contribute-btn contribute-btn-secondary" onClick={() => setCurrentStep(3)}>
              <ChevronLeft size={16} /> Go Back & Retry
            </button>
            <button className="contribute-btn contribute-btn-primary" onClick={handleSubmit}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="contribute-panel">
      {/* Header */}
      <div className="contribute-header">
        <div className="contribute-header-inner">
          <div className="contribute-header-top">
            <div className="contribute-header-titles">
              <h2 className="contribute-title">
                <MapPin size={22} className="contribute-title-icon" />
                Contribute a Route
              </h2>
              <p className="contribute-subtitle">
                Help grow Kolkata's auto route network by sharing routes you know
              </p>
            </div>
            {currentStep < 4 && renderStepProgress()}
          </div>
        </div>
      </div>

      {/* Step content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
}
