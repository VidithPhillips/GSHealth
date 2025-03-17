import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Button, 
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  Chip,
  Card,
  LinearProgress
} from '@mui/material';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DeleteIcon from '@mui/icons-material/Delete';
import StraightIcon from '@mui/icons-material/Straight';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import { GeoJSON, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { calculateRoute, findNearestFacilities, createDirectRoute, getRouteDetails } from '../services/routingService';
import { useMap } from 'react-leaflet';
import 'leaflet-routing-machine';
import { initializeOSRM } from '../services/osrmService';
import '../styles/routing.css';

// Custom icon for snapped points
const snappedPointIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="#4caf50"/>
          <circle cx="12" cy="12" r="6" fill="white"/>
        </svg>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Error boundary component
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route calculation error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Snackbar open={true} autoHideDuration={6000}>
          <Alert severity="error">
            Error calculating route. Please try again.
          </Alert>
        </Snackbar>
      );
    }

    return this.props.children;
  }
}

// Loading indicator component
function LoadingOverlay() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        p: 2,
        borderRadius: 2,
      }}
    >
      <CircularProgress />
    </Box>
  );
}

// This component renders the route visuals on the map and must be inside MapContainer
export function RouteMapLayer({ selectedRoute, routeDetails, snappedPoints }) {
  if (!selectedRoute || !routeDetails) return null;
  
  return (
    <>
      <Polyline
        positions={selectedRoute}
        color="#FF4081"
        weight={6}
        opacity={0.7}
        dashArray={routeDetails.directRoute ? "10, 10" : null}
      />
      {routeDetails.directRoute && (
        <Alert 
          severity="warning" 
          sx={{ 
            position: 'absolute', 
            bottom: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1000,
            maxWidth: '80%'
          }}
        >
          Showing direct route (as the crow flies). Actual road route could not be calculated.
        </Alert>
      )}
    </>
  );
}

// Consolidate route calculation into a custom hook
const useRouteCalculation = (map, onRouteCalculated) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const calculateRoute = async (start, end, facility) => {
    if (!start) {
      setError('Please select a starting point on the map');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Calculating route from", start, "to", [end[0], end[1]]);
      
      const routeData = await calculateRoute(start, end, {
        profile: 'driving-car',
        preference: 'fastest'
      });

      if (!routeData.success) {
        throw new Error(routeData.error || 'Failed to calculate route');
      }

      console.log("Route calculation successful:", routeData);

      const details = {
        distance: routeData.distance.toFixed(2),
        duration: Math.round(routeData.duration / 60),
        facility,
        isDirect: routeData.directRoute === true,
        ascent: routeData.ascent,
        descent: routeData.descent
      };

      setSelectedRoute(routeData.route);
      setRouteDetails(details);

      // Notify parent component
      if (onRouteCalculated) {
        onRouteCalculated(routeData.route, details);
      }

      // Center map on route
      if (map) {
        const bounds = L.latLngBounds(routeData.route);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Show appropriate snackbar
      setSnackbar({
        open: true,
        message: routeData.directRoute 
          ? 'Using direct line route - actual road route could not be calculated. Distance is as the crow flies.'
          : `Route calculated to ${facility.name}`,
        severity: routeData.directRoute ? 'warning' : 'success'
      });

    } catch (err) {
      console.error('Route calculation error:', err);
      setError(err.message);
      setSnackbar({
        open: true,
        message: `Error calculating route: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setSelectedRoute(null);
    setRouteDetails(null);
    if (onRouteCalculated) {
      onRouteCalculated(null, null);
    }
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return {
    loading,
    error,
    selectedRoute,
    routeDetails,
    snackbar,
    calculateRoute,
    clearRoute,
    closeSnackbar
  };
};

// Main component
function AmbulanceRouting({ map, facilities, selectedPoint, targetFacility, onRouteCalculated }) {
  const [nearestFacilities, setNearestFacilities] = useState([]);
  
  const {
    loading,
    error,
    selectedRoute,
    routeDetails,
    snackbar,
    calculateRoute,
    clearRoute,
    closeSnackbar
  } = useRouteCalculation(map, onRouteCalculated);

  // Update nearest facilities when selected point changes
  useEffect(() => {
    if (selectedPoint && facilities.length > 0) {
      try {
        console.log("Finding nearest facilities to:", selectedPoint);
        const nearest = findNearestFacilities(selectedPoint, facilities);
        console.log("Nearest facilities found:", nearest);
        setNearestFacilities(nearest);
        setError(nearest.length === 0 
          ? "No healthcare facilities found near the selected location. Try selecting a different location closer to populated areas."
          : null
        );
      } catch (err) {
        console.error("Error finding nearest facilities:", err);
        setError(`Failed to find nearby facilities: ${err.message}`);
        setNearestFacilities([]);
      }
    } else {
      setNearestFacilities([]);
    }
  }, [selectedPoint, facilities]);

  // Calculate route when target facility is provided
  useEffect(() => {
    if (selectedPoint && targetFacility) {
      calculateRoute(
        selectedPoint,
        [targetFacility.lat, targetFacility.lng],
        targetFacility
      );
    }
  }, [selectedPoint, targetFacility]);

  // Calculate ETA based on travel time
  const getETAText = (minutes) => {
    const now = new Date();
    const eta = new Date(now.getTime() + minutes * 60000);
    return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to determine responce time indicator
  const getResponseTimeIndicator = (minutes) => {
    if (minutes <= 10) return { color: 'success', text: 'Rapid' };
    if (minutes <= 20) return { color: 'primary', text: 'Standard' };
    if (minutes <= 30) return { color: 'warning', text: 'Delayed' };
    return { color: 'error', text: 'Extended' };
  };
  
  // Add some hardcoded facilities when no nearest facilities are found
  // Useful only for testing the UI
  const useFallbackFacilities = () => {
    if (nearestFacilities.length === 0 && selectedPoint) {
      return [
        {
          id: 'fallback1',
          name: 'Sample Hospital',
          type: 'Tertiary',
          lat: selectedPoint[0] + 0.05,
          lng: selectedPoint[1] + 0.05,
          distance: 5.2,
          emergency: true
        },
        {
          id: 'fallback2',
          name: 'Sample Clinic',
          type: 'Primary',
          lat: selectedPoint[0] - 0.03,
          lng: selectedPoint[1] + 0.08,
          distance: 7.8,
          emergency: false
        }
      ];
    }
    return nearestFacilities;
  };
  
  // For testing UI, uncomment this line to use fallback facilities
  // const displayedFacilities = useFallbackFacilities();
  const displayedFacilities = nearestFacilities;

  useEffect(() => {
    // Initialize OSRM service when component mounts
    initializeOSRM().catch(err => {
      console.error('Failed to initialize OSRM:', err);
      setError('Failed to initialize routing service');
    });

    // Cleanup routing control on unmount
    return () => {
      if (routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, []);

  useEffect(() => {
    const calculateAndDisplayRoute = async () => {
      // Clear previous route and error
      if (routingControl) {
        map.removeControl(routingControl);
        setRoutingControl(null);
      }
      setError(null);

      // Check if we have both points
      if (!selectedPoint || !targetFacility) {
        return;
      }

      setIsCalculating(true);

      try {
        // Calculate route using OSRM service
        const result = await calculateRoute(
          selectedPoint,
          [targetFacility.lat, targetFacility.lng],
          {
            profile: 'car',
            alternatives: true,
            steps: true
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to calculate route');
        }

        // Create route line
        const routeLine = L.polyline(result.route, {
          color: '#3388ff',
          weight: 6,
          opacity: 0.6
        });

        // Create alternative routes if available
        const alternativeLines = result.alternatives.map(alt => 
          L.polyline(alt.route, {
            color: '#666',
            weight: 4,
            opacity: 0.4,
            dashArray: '10,10'
          })
        );

        // Create routing control
        const control = L.control({ position: 'topright' });
        
        control.onAdd = () => {
          const div = L.DomUtil.create('div', 'routing-info');
          div.innerHTML = `
            <div class="routing-box">
              <h4>Route Information</h4>
              <p>Distance: ${result.distance.toFixed(1)} km</p>
              <p>Duration: ${Math.round(result.duration / 60)} minutes</p>
              ${result.alternatives.length ? 
                `<p>Alternative routes: ${result.alternatives.length}</p>` : 
                ''}
            </div>
          `;
          return div;
        };

        // Add routes to map
        routeLine.addTo(map);
        alternativeLines.forEach(line => line.addTo(map));
        control.addTo(map);

        // Store control for cleanup
        setRoutingControl(control);

        // Fit map bounds to show entire route
        const bounds = routeLine.getBounds();
        map.fitBounds(bounds, { padding: [50, 50] });

        // Notify parent component
        if (onRouteCalculated) {
          onRouteCalculated({
            route: result.route,
            distance: result.distance,
            duration: result.duration,
            alternatives: result.alternatives
          });
        }

      } catch (err) {
        console.error('Route calculation failed:', err);
        setError(err.message || 'Failed to calculate route');
      } finally {
        setIsCalculating(false);
      }
    };

    calculateAndDisplayRoute();
  }, [selectedPoint, targetFacility, map, onRouteCalculated]);

  return (
    <RouteErrorBoundary>
      {loading && <LoadingOverlay />}
      
      <Box sx={{ 
        position: 'absolute', 
        top: 20, 
        right: 20, 
        zIndex: 1000, 
        width: 320,
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'auto'
      }}>
        <Paper elevation={4} sx={{ 
          p: 2, 
          borderRadius: 2,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(5px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 1.5, 
            display: 'flex', 
            alignItems: 'center',
            color: '#2e3a59',
            fontWeight: 600
          }}>
            <DirectionsIcon sx={{ mr: 1, color: '#e53935' }} />
            Emergency Response Routing
          </Typography>
          
          {/* Debug section */}
          <Box sx={{ 
            mb: 2, 
            p: 1, 
            bgcolor: 'rgba(0,0,0,0.05)', 
            borderRadius: 1, 
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5
          }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Debug Information:</Typography>
            <Typography variant="caption">
              Selected Point: {selectedPoint ? `[${selectedPoint[0].toFixed(4)}, ${selectedPoint[1].toFixed(4)}]` : 'None'}
            </Typography>
            <Typography variant="caption">
              Facilities: {facilities.length}, Nearest: {nearestFacilities.length}
            </Typography>
            <Typography variant="caption">
              Map: {map ? 'Available' : 'Not available'}
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                '& .MuiAlert-icon': { 
                  alignItems: 'center' 
                } 
              }}
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <CircularProgress size={30} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Calculating optimal route...
              </Typography>
              <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />
            </Box>
          ) : (
            <>
              {routeDetails ? (
                <Card variant="outlined" sx={{ mb: 2, p: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} color="primary.dark">
                      {routeDetails.facility.name}
                    </Typography>
                    
                    <Chip 
                      size="small"
                      label={routeDetails.facility.type}
                      color={
                        routeDetails.facility.type === 'Tertiary' ? 'error' :
                        routeDetails.facility.type === 'Secondary' ? 'primary' : 
                        'success'
                      }
                    />
                  </Box>
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SpeedIcon sx={{ mr: 0.5, fontSize: 20, color: '#5c6bc0' }} />
                      <Typography variant="body2">
                        {routeDetails.distance} km
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccessTimeIcon sx={{ mr: 0.5, fontSize: 20, color: '#5c6bc0' }} />
                      <Typography variant="body2">
                        {routeDetails.duration} min
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ my: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        ETA
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {getETAText(routeDetails.duration)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Response time
                      </Typography>
                      <Chip 
                        label={getResponseTimeIndicator(routeDetails.duration).text} 
                        size="small"
                        color={getResponseTimeIndicator(routeDetails.duration).color}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  </Box>
                  
                  {routeDetails.isDirect && (
                    <Alert 
                      severity="warning" 
                      variant="outlined"
                      icon={<StraightIcon />}
                      sx={{ mt: 1.5, py: 0, borderRadius: 1 }}
                    >
                      <Typography variant="caption">
                        Direct route - actual road route unavailable
                      </Typography>
                    </Alert>
                  )}
                  
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<DeleteIcon />}
                    onClick={clearRoute}
                    sx={{ mt: 2, textTransform: 'none' }}
                  >
                    Clear Route
                  </Button>
                </Card>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Nearest Healthcare Facilities
                    </Typography>
                    <Chip 
                      label={`${displayedFacilities.length} found`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  
                  {selectedPoint ? (
                    <Box>
                      {displayedFacilities.length === 0 ? (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          No facilities found near the selected location. Try a different area with more healthcare facilities.
                        </Alert>
                      ) : (
                        <List disablePadding>
                          {displayedFacilities.map((facility) => (
                            <ListItem
                              key={facility.id}
                              disablePadding
                              sx={{ 
                                mb: 1, 
                                p: 1, 
                                bgcolor: 'background.paper', 
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                }
                              }}
                            >
                              <Box sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {facility.name}
                                  </Typography>
                                  <Chip 
                                    label={facility.type} 
                                    size="small"
                                    color={
                                      facility.type === 'Tertiary' ? 'error' :
                                      facility.type === 'Secondary' ? 'primary' : 
                                      'success'
                                    }
                                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                  />
                                </Box>
                                
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  mt: 0.5 
                                }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {facility.distance.toFixed(2)} km away
                                  </Typography>
                                  
                                  <Tooltip title="Calculate Route">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => {
                                        console.log("Calculate route button clicked for:", facility);
                                        calculateRoute(selectedPoint, [facility.lat, facility.lng], facility);
                                      }}
                                      sx={{ 
                                        borderRadius: 1, 
                                        p: 0.5,
                                        '&:hover': { 
                                          bgcolor: 'primary.light',
                                          color: 'white' 
                                        } 
                                      }}
                                    >
                                      <DirectionsIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                                
                                {facility.emergency && (
                                  <Chip 
                                    icon={<LocalHospitalIcon sx={{ fontSize: 14 }} />} 
                                    label="Emergency Services" 
                                    size="small" 
                                    color="error" 
                                    variant="outlined"
                                    sx={{ mt: 1, height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Box>
                  ) : (
                    <Alert 
                      severity="info" 
                      variant="outlined" 
                      sx={{ 
                        mt: 1, 
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Typography variant="body2">
                        Click on the map to set a starting point
                      </Typography>
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </Paper>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </RouteErrorBoundary>
  );
}

export default AmbulanceRouting; 