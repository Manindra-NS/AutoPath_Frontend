import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { transitService } from '../services/transitService';
import { translations } from '../data/translations';

const TransitContext = createContext();

export function TransitProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('autopath_lang') || 'en';
  });

  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'search' | 'stands' | 'preferences'
  
  // Stands & Routes data loaded from service
  const [stands, setStands] = useState([]);
  const [selectedStandId, setSelectedStandIdState] = useState(null);
  const [selectedRouteId, setSelectedRouteIdState] = useState(null);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState(null);
  const [standRoutes, setStandRoutes] = useState([]);
  const [selectedRouteStops, setSelectedRouteStops] = useState([]);
  const [isStandPanelOpen, setIsStandPanelOpen] = useState(false);
  
  // Search parameters & results
  const [searchFrom, setSearchFrom] = useState('Ruby More');
  const [searchTo, setSearchTo] = useState('Gariahat');
  const [searchResults, setSearchResults] = useState([]);
  
  // Stand Popup state (for floating information popup when clicking stand markers)
  const [standPopup, setStandPopup] = useState({
    isOpen: false,
    stand: null,
    routes: []
  });

  // Loading & Error States
  const [isLoadingStands, setIsLoadingStands] = useState(true);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isLoadingRouteDetail, setIsLoadingRouteDetail] = useState(false);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [routeError, setRouteError] = useState(null);

  // Interactive System State Switcher (Screen 7 Explorations: State A-E)
  const [systemState, setSystemState] = useState('A'); 
  
  // Map layers toggle
  const [layers, setLayers] = useState({
    stands: true,
    corridors: true
  });

  const [filterTag, setFilterTag] = useState('direct'); // 'direct' | 'frequent' | 'metro'
  const [showStandModal, setShowStandModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [hoveredStop, setHoveredStop] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // Sync language with localStorage
  useEffect(() => {
    localStorage.setItem('autopath_lang', language);
  }, [language]);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const t = translations[language] || translations.en;

  // 1. Load initial stands from transitService
  const loadStands = useCallback(async () => {
    setIsLoadingStands(true);
    setApiError(null);
    try {
      const res = await transitService.getStands();
      if (res.success && res.data) {
        setStands(res.data);
      } else {
        setApiError(res.error || 'Failed to load auto stands from backend database.');
      }
    } catch (err) {
      setApiError(err.message || 'Error communicating with transit service.');
    } finally {
      setIsLoadingStands(false);
    }
  }, []);

  useEffect(() => {
    loadStands();
  }, [loadStands]);

  // 2. Load routes for selected stand
  const loadStandRoutes = useCallback(async (standId) => {
    if (!standId) {
      setStandRoutes([]);
      return;
    }
    setIsLoadingRoutes(true);
    setApiError(null);
    try {
      const res = await transitService.getRoutesByStand(standId);
      if (res.success && res.data) {
        setStandRoutes(res.data);
      } else {
        setStandRoutes([]);
        if (res.error) setApiError(res.error);
      }
    } catch (err) {
      console.error('Failed to load stand routes:', err);
      setStandRoutes([]);
      setApiError(err.message || 'Failed to retrieve routes from backend database.');
    } finally {
      setIsLoadingRoutes(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStandId) {
      loadStandRoutes(selectedStandId);
    }
  }, [selectedStandId, loadStandRoutes]);

  // 3. Load full route details and road geometry when selectedRouteId changes
  const loadRouteDetail = useCallback(async (routeId) => {
    if (!routeId) {
      setSelectedRouteDetail(null);
      setSelectedRouteStops([]);
      setRouteError(null);
      return;
    }

    setIsLoadingRouteDetail(true);
    setRouteError(null);
    try {
      const res = await transitService.getRouteDetail(routeId);
      if (res.success && res.data) {
        setSelectedRouteDetail(res.data);
        if (res.data.stops?.length) {
          setSelectedRouteStops(res.data.stops);
        }
        if (!res.data.hasValidGeometry) {
          setRouteError(res.data.geometryError || 'No road network geometry available for this route from the backend.');
        }
      } else {
        setSelectedRouteDetail(null);
        setRouteError(res.error || `Failed to fetch route '${routeId}' from backend.`);
      }
    } catch (err) {
      console.error(`Failed to load route detail for '${routeId}':`, err);
      setRouteError(err.message || 'Error retrieving route data.');
    } finally {
      setIsLoadingRouteDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      loadRouteDetail(selectedRouteId);
    } else {
      setSelectedRouteDetail(null);
      setSelectedRouteStops([]);
    }
  }, [selectedRouteId, loadRouteDetail]);

  // 4. Execute route search
  const executeSearch = useCallback(async (from, to, options = {}) => {
    setIsLoadingRoutes(true);
    setApiError(null);
    try {
      const res = await transitService.findRoutes(from, to, options);
      if (res.success && res.data) {
        setSearchResults(res.data);
        if (selectedRouteId && res.data.length > 0) {
          const matchExisting = res.data.find(r => r.id === selectedRouteId);
          if (matchExisting) {
            loadRouteDetail(matchExisting.id);
          }
        }
      } else {
        setSearchResults([]);
        if (res.error) {
          setApiError(res.error);
        }
      }
    } catch (err) {
      setSearchResults([]);
      setApiError(err.message || 'Error finding routes.');
    } finally {
      setIsLoadingRoutes(false);
    }
  }, [selectedRouteId, loadRouteDetail]);

  useEffect(() => {
    executeSearch(searchFrom, searchTo);
  }, []); // Initial search

  // Currently selected stand and route objects
  const selectedStand = selectedStandId
    ? (stands.find(s => s.id === selectedStandId) || null)
    : null;

  // Selected route resolves to full detail from backend
  const fallbackRoute = selectedRouteId
    ? (standRoutes.find(r => r.id === selectedRouteId) || searchResults.find(r => r.id === selectedRouteId) || null)
    : null;

  const selectedRoute = (selectedRouteId && selectedRouteDetail && selectedRouteDetail.id === selectedRouteId)
    ? selectedRouteDetail
    : fallbackRoute;

  // Stand Selection Handler (called when user clicks an auto stand marker on map)
  const handleSelectStand = async (standId) => {
    setSelectedStandIdState(standId);
    setIsStandPanelOpen(true);
    setSelectedRouteIdState(null);
    setSelectedRouteDetail(null);
    setSelectedRouteStops([]);
    
    const stand = stands.find(s => s.id === standId);
    if (stand) {
      setSearchFrom(stand.name);
    }

    setIsLoadingRoutes(true);
    setApiError(null);
    try {
      const res = await transitService.getRoutesByStand(standId);
      if (res.success && res.data) {
        setStandRoutes(res.data);
      } else {
        setStandRoutes([]);
        if (res.error) setApiError(res.error);
      }
    } catch (err) {
      setStandRoutes([]);
      setApiError(err.message || 'Failed to load routes departing from this stand.');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  // Close Stand Panel Handler (dismisses panel and returns to clean map view)
  const closeStandPanel = () => {
    setIsStandPanelOpen(false);
    setSelectedStandIdState(null);
    setSelectedRouteIdState(null);
    setSelectedRouteDetail(null);
    setSelectedRouteStops([]);
    setStandRoutes([]);
  };

  // Route Selection Handler
  const handleSelectRoute = (routeId) => {
    setSelectedRouteIdState(routeId);
    setIsStandPanelOpen(true);
    const route = searchResults.find(r => r.id === routeId) || standRoutes.find(r => r.id === routeId);
    if (route && route.originStandId) {
      setSelectedStandIdState(route.originStandId);
    }
  };

  // Open Stand Information Popup (on clicking a stand marker)
  const openStandPopup = async (standId) => {
    handleSelectStand(standId);
  };

  const closeStandPopup = () => {
    setStandPopup(prev => ({ ...prev, isOpen: false }));
  };

  const handleSwapStands = () => {
    setSearchFrom(searchTo);
    setSearchTo(searchFrom);
    executeSearch(searchTo, searchFrom);
  };

  const toggleLayer = (layerName) => {
    setLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  const effectiveOffline = isOffline || systemState === 'E';

  return (
    <TransitContext.Provider
      value={{
        language,
        setLanguage,
        t,
        activeTab,
        setActiveTab,
        stands,
        selectedStandId,
        setSelectedStandId: handleSelectStand,
        handleSelectStand,
        selectedStand,
        selectedRouteId,
        setSelectedRouteId: handleSelectRoute,
        selectedRoute,
        standRoutes,
        loadStandRoutes,
        isStandPanelOpen,
        setIsStandPanelOpen,
        closeStandPanel,
        selectedRouteStops,
        searchFrom,
        setSearchFrom,
        searchTo,
        setSearchTo,
        searchResults,
        executeSearch,
        handleSwapStands,
        standPopup,
        openStandPopup,
        closeStandPopup,
        isLoadingStands,
        isLoadingRoutes,
        isLoadingRouteDetail,
        isLoadingStops,
        apiError,
        setApiError,
        routeError,
        setRouteError,
        retryLoad: loadStands,
        isMockMode: transitService.isMockMode(),
        systemState,
        setSystemState,
        layers,
        toggleLayer,
        filterTag,
        setFilterTag,
        showStandModal,
        setShowStandModal,
        showWelcomeModal,
        setShowWelcomeModal,
        showPreferencesModal,
        setShowPreferencesModal,
        hoveredStop,
        setHoveredStop,
        isOffline: effectiveOffline,
        setIsOffline
      }}
    >
      {children}
    </TransitContext.Provider>
  );
}

export function useTransit() {
  const context = useContext(TransitContext);
  if (!context) {
    throw new Error('useTransit must be used within a TransitProvider');
  }
  return context;
}
