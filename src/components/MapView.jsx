import React, { useEffect, useState, useRef, useCallback, useReducer } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Box, Typography, Paper, CircularProgress, TextField, Button, Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LayersIcon from '@mui/icons-material/Layers';
import { fetchHealthcareFacilities } from '../services/osm';
import { fetchMajorRoads } from '../services/routing';
import AmbulanceRouting, { RouteMapLayer } from './AmbulanceRouting';
import { FacilityMarker } from './FacilityMarker';

// Coordinates for Himachal Pradesh
const HP_CENTER = [31.1048, 77.1734]; // Coordinates for Shimla, capital of Himachal Pradesh
const DEFAULT_ZOOM = 8;

// Custom icons for different facility types
const createFacilityIcon = (type) => {
  let color;
  switch(type) {
    case 'Primary':
      color = '#4caf50'; // Green
      break;
    case 'Secondary':
      color = '#2196f3'; // Blue
      break;
    case 'Tertiary':
      color = '#f44336'; // Red
      break;
    default:
      color = '#9c27b0'; // Purple for others
  }
  
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${color}">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            <circle cx="12" cy="9.5" r="1.5" fill="white"/>
          </svg>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// Custom icon for selected point
const selectedPointIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="#e53935"/>
          <circle cx="12" cy="12" r="6" fill="white"/>
        </svg>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Map center updater component
function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

// Component to handle map click events
function MapClickHandler({ setSelectedPoint }) {
  const mapEvents = useMapEvents({
    click: (e) => {
      console.log('Map clicked at', e.latlng);
      // Convert to array format [lat, lng] for consistency
      const point = [e.latlng.lat, e.latlng.lng];
      console.log('Setting selected point to:', point);
      setSelectedPoint(point);
    }
  });
  
  console.log('MapClickHandler mounted on map instance:', mapEvents);
  return null;
}

// Custom road styles based on type
const getRoadStyle = (feature) => {
  const isNationalHighway = feature.properties.type === 'national_highway';
  const importance = feature.properties.importance || 4;
  
  return {
    color: isNationalHighway ? '#ff4444' : '#ff8800',
    weight: 5 - importance,
    opacity: isNationalHighway ? 0.8 : 0.6,
    dashArray: isNationalHighway ? null : '5, 10'
  };
};

// Create a wrapper component for AmbulanceRouting that uses useMap hook
function AmbulanceRoutingLayer({ facilities, selectedPoint, targetFacility, onRouteCalculated }) {
  const map = useMap();
  
  if (!selectedPoint) return null;
  
  return (
    <AmbulanceRouting
      map={map}
      facilities={facilities}
      selectedPoint={selectedPoint}
      targetFacility={targetFacility}
      onRouteCalculated={onRouteCalculated}
    />
  );
}

// Action types
const MAP_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_FACILITIES: 'SET_FACILITIES',
  SET_SELECTED_POINT: 'SET_SELECTED_POINT',
  SET_MAJOR_ROADS: 'SET_MAJOR_ROADS',
  SET_ROUTE_INFO: 'SET_ROUTE_INFO',
  SET_FILTERS: 'SET_FILTERS',
  RESET_STATE: 'RESET_STATE'
};

// Initial state
const initialState = {
  loading: true,
  error: null,
  facilities: [],
  selectedPoint: null,
  majorRoads: null,
  routeInfo: {
    route: null,
    details: null,
    snappedPoints: null
  },
  filters: {
    searchTerm: '',
    facilityType: 'All'
  }
};

// Reducer function
function mapReducer(state, action) {
  switch (action.type) {
    case MAP_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case MAP_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case MAP_ACTIONS.SET_FACILITIES:
      return { ...state, facilities: action.payload };
    case MAP_ACTIONS.SET_SELECTED_POINT:
      return { ...state, selectedPoint: action.payload };
    case MAP_ACTIONS.SET_MAJOR_ROADS:
      return { ...state, majorRoads: action.payload };
    case MAP_ACTIONS.SET_ROUTE_INFO:
      return { ...state, routeInfo: action.payload };
    case MAP_ACTIONS.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case MAP_ACTIONS.RESET_STATE:
      return { ...initialState };
    default:
      return state;
  }
}

function MapView({ selectedRegion }) {
  const [state, dispatch] = useReducer(mapReducer, initialState);
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Debug when state changes
  useEffect(() => {
    console.log('[MapView] State updated:', {
      facilitiesCount: state.facilities.length,
      selectedPoint: state.selectedPoint,
      loading: state.loading,
      error: state.error
    });
  }, [state]);
  
  useEffect(() => {
    const loadData = async () => {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        dispatch({ type: MAP_ACTIONS.SET_LOADING, payload: true });
        dispatch({ type: MAP_ACTIONS.SET_ERROR, payload: null });
        
        console.log('[MapView] Fetching healthcare facilities...');
        const facilitiesData = await fetchHealthcareFacilities(signal);
        
        if (signal.aborted) return;
        
        console.log('[MapView] Received facilities:', {
          count: facilitiesData.length,
          sample: facilitiesData.slice(0, 2)
        });
        
        // Validate facilities before setting state
        const validFacilities = facilitiesData.filter(facility => {
          const isValid = facility && 
                         typeof facility.lat === 'number' && 
                         typeof facility.lng === 'number' && 
                         !isNaN(facility.lat) && 
                         !isNaN(facility.lng);
          
          if (!isValid) {
            console.warn('[MapView] Invalid facility:', facility);
          }
          return isValid;
        });

        console.log('[MapView] Valid facilities:', {
          total: validFacilities.length,
          invalid: facilitiesData.length - validFacilities.length
        });

        dispatch({ type: MAP_ACTIONS.SET_FACILITIES, payload: validFacilities });
        
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('[MapView] Data loading aborted');
          return;
        }
        console.error('[MapView] Error loading data:', err);
        dispatch({ type: MAP_ACTIONS.SET_ERROR, payload: 'Failed to load data. Please try again later.' });
      } finally {
        if (!signal.aborted) {
          dispatch({ type: MAP_ACTIONS.SET_LOADING, payload: false });
        }
      }
    };

    loadData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedRegion]);

  const handleRouteCalculated = useCallback((route, details, snappedPoints) => {
    console.log('[MapView] Route calculated:', { route, details });
    dispatch({ 
      type: MAP_ACTIONS.SET_ROUTE_INFO, 
      payload: { route, details, snappedPoints } 
    });
  }, []);

  const handleSelectedPointChange = useCallback((point) => {
    console.log('handleSelectedPointChange called with point:', point);
    dispatch({ type: MAP_ACTIONS.SET_SELECTED_POINT, payload: point });
  }, []);

  const handleFilterChange = useCallback((newType) => {
    dispatch({ 
      type: MAP_ACTIONS.SET_FILTERS, 
      payload: { facilityType: newType } 
    });
  }, []);

  const handleSearchChange = useCallback((searchTerm) => {
    dispatch({ 
      type: MAP_ACTIONS.SET_FILTERS, 
      payload: { searchTerm } 
    });
  }, []);

  const handleCalculateRoute = useCallback((facility) => {
    if (!state.selectedPoint) {
      console.warn('[MapView] Cannot calculate route: no starting point selected');
      return;
    }

    console.log('[MapView] Calculating route to facility:', {
      facilityName: facility.name,
      facilityPosition: [facility.lat, facility.lng],
      startPoint: state.selectedPoint
    });

    // Pass the facility coordinates to the routing component
    dispatch({
      type: MAP_ACTIONS.SET_ROUTE_INFO,
      payload: {
        targetFacility: facility,
        route: null,
        details: null,
        snappedPoints: null
      }
    });
  }, [state.selectedPoint]);

  // Filter facilities based on current filters
  const filteredFacilities = state.facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(state.filters.searchTerm.toLowerCase()) || 
                         facility.address.toLowerCase().includes(state.filters.searchTerm.toLowerCase());
    const matchesType = state.filters.facilityType === 'All' || facility.type === state.filters.facilityType;
    return matchesSearch && matchesType;
  });
  
  // Debug log for facilities with invalid coordinates
  useEffect(() => {
    const invalidFacilities = filteredFacilities.filter(facility => 
      !facility.lat || !facility.lng || 
      typeof facility.lat !== 'number' || 
      typeof facility.lng !== 'number' || 
      isNaN(facility.lat) || 
      isNaN(facility.lng)
    );
    
    if (invalidFacilities.length > 0) {
      console.warn('[MapView] Facilities with invalid coordinates:', {
        count: invalidFacilities.length,
        facilities: invalidFacilities
      });
    }
  }, [filteredFacilities]);
  
  // Debug filtered facilities
  useEffect(() => {
    console.log('filteredFacilities updated, count:', filteredFacilities.length);
  }, [filteredFacilities]);
  
  if (state.loading) {
    return (
      <Box className="loading-indicator">
        <CircularProgress />
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 2, bgcolor: '#ffebee' }}>
          <Typography color="error">{state.error}</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: 'calc(100vh - 64px)' }}>
      {/* Search and filter controls */}
      <Paper 
        elevation={3} 
        sx={{ 
          position: 'absolute', 
          top: 20, 
          left: 20, 
          zIndex: 1000, 
          p: 2,
          width: 300
        }}
      >
        <Typography variant="h6" gutterBottom>
          Healthcare Facilities
        </Typography>
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search facilities..."
            value={state.filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            sx={{ mb: 2 }}
          />
        </form>
        <FormControl fullWidth size="small">
          <InputLabel>Facility Type</InputLabel>
          <Select
            value={state.filters.facilityType}
            label="Facility Type"
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Primary">Primary Healthcare</MenuItem>
            <MenuItem value="Secondary">Secondary Healthcare</MenuItem>
            <MenuItem value="Tertiary">Tertiary Healthcare</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Showing {filteredFacilities.length} facilities
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Click anywhere on the map to set a starting point for ambulance routing
        </Typography>
        
        {/* Debug Info */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, fontSize: '0.75rem' }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Debug Info:</Typography>
          <Typography variant="caption" component="div">
            Selected Point: {state.selectedPoint ? `[${state.selectedPoint[0].toFixed(4)}, ${state.selectedPoint[1].toFixed(4)}]` : 'None'}
          </Typography>
          <Typography variant="caption" component="div">
            Facilities: {state.facilities.length}, Filtered: {filteredFacilities.length}
          </Typography>
          <Typography variant="caption" component="div">
            Map: {map ? 'Loaded' : 'Not loaded'}
          </Typography>
        </Box>
      </Paper>

      <MapContainer 
        center={HP_CENTER} 
        zoom={DEFAULT_ZOOM} 
        style={{ height: '100%', width: '100%' }}
        whenCreated={setMap}
      >
        <MapCenterUpdater center={HP_CENTER} zoom={DEFAULT_ZOOM} />
        
        {/* Map click handler */}
        <MapClickHandler setSelectedPoint={handleSelectedPointChange} />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Major Roads">
            {state.majorRoads && state.majorRoads.features.length > 0 ? (
              <GeoJSON 
                data={state.majorRoads} 
                style={getRoadStyle}
                onEachFeature={(feature, layer) => {
                  const name = feature.properties.name;
                  const ref = feature.properties.ref;
                  const type = feature.properties.type === 'national_highway' ? 'NH' : 'SH';
                  
                  layer.bindTooltip(
                    `${name}${ref ? ` (${type} ${ref})` : ''}`,
                    { permanent: false, direction: 'auto' }
                  );
                }}
              />
            ) : (
              <Box sx={{ display: 'none' }} />
            )}
          </LayersControl.Overlay>
        </LayersControl>

        {/* Facility markers */}
        {filteredFacilities
          .filter(facility => 
            typeof facility.lat === 'number' && 
            typeof facility.lng === 'number' && 
            !isNaN(facility.lat) && 
            !isNaN(facility.lng)
          )
          .map((facility) => (
            <FacilityMarker
              key={facility.id}
              facility={facility}
              position={[facility.lat, facility.lng]}
              selectedPoint={state.selectedPoint}
              onCalculateRoute={handleCalculateRoute}
            />
          ))}

        {/* Selected point marker */}
        {state.selectedPoint && (
          <Marker
            position={state.selectedPoint}
            icon={selectedPointIcon}
          >
            <Popup>
              <Typography variant="subtitle1" fontWeight="bold">
                Starting Point
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tap a facility to calculate route
              </Typography>
            </Popup>
          </Marker>
        )}

        {/* Route visualization */}
        {state.routeInfo.route && (
          <RouteMapLayer 
            selectedRoute={state.routeInfo.route}
            routeDetails={state.routeInfo.details}
            snappedPoints={state.routeInfo.snappedPoints}
          />
        )}
        
        {/* Ambulance routing layer - now with target facility */}
        <AmbulanceRoutingLayer
          facilities={filteredFacilities}
          selectedPoint={state.selectedPoint}
          targetFacility={state.routeInfo.targetFacility}
          onRouteCalculated={handleRouteCalculated}
        />
      </MapContainer>

      <Paper 
        sx={{ 
          position: 'absolute', 
          bottom: 20, 
          right: 20, 
          zIndex: 1000, 
          p: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Legend
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, backgroundColor: '#4caf50', borderRadius: '50%' }} />
            <Typography variant="body2">Primary Healthcare</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, backgroundColor: '#2196f3', borderRadius: '50%' }} />
            <Typography variant="body2">Secondary Healthcare</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, backgroundColor: '#f44336', borderRadius: '50%' }} />
            <Typography variant="body2">Tertiary Healthcare</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, backgroundColor: '#ff4444' }} />
            <Typography variant="body2">National Highway (NH)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, backgroundColor: '#ff8800', borderStyle: 'dashed' }} />
            <Typography variant="body2">State Highway (SH)</Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Debug output */}
      <div id="debug-info" style={{ 
        position: 'absolute', 
        bottom: 5, 
        left: 5, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        color: 'white', 
        padding: '5px', 
        fontSize: '10px',
        zIndex: 1000
      }}>
        Selected: {state.selectedPoint ? `[${state.selectedPoint[0].toFixed(4)}, ${state.selectedPoint[1].toFixed(4)}]` : 'None'}<br/>
        Facilities: {state.facilities.length}, Filtered: {filteredFacilities.length}<br/>
        Map Instance: {map ? 'Yes' : 'No'}
      </div>
    </Box>
  );
}

export default MapView; 