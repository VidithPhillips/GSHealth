import { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DeleteIcon from '@mui/icons-material/Delete';
import { GeoJSON, Polyline } from 'react-leaflet';
import { calculateRoute, findNearestFacilities } from '../services/routing';

function AmbulanceRouting({ map, facilities, selectedPoint }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nearestFacilities, setNearestFacilities] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);

  useEffect(() => {
    if (selectedPoint && facilities.length > 0) {
      const nearest = findNearestFacilities(selectedPoint, facilities);
      setNearestFacilities(nearest);
    }
  }, [selectedPoint, facilities]);

  const handleRouteCalculation = async (facility) => {
    if (!selectedPoint) {
      setError('Please select a starting point on the map');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const routeData = await calculateRoute(
        selectedPoint,
        [facility.lat, facility.lng]
      );

      setSelectedRoute(routeData);
      setRouteDetails({
        distance: (routeData.distance / 1000).toFixed(2), // Convert to km
        duration: Math.round(routeData.duration / 60), // Convert to minutes
        facility: facility
      });

      // Center the map to show the entire route
      if (map) {
        const bounds = L.geoJSON(routeData.route).getBounds();
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      setError('Failed to calculate route. Please try again.');
      console.error('Route calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setSelectedRoute(null);
    setRouteDetails(null);
  };

  return (
    <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, width: 300 }}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <DirectionsIcon sx={{ mr: 1 }} />
          Ambulance Routing
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {routeDetails ? (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Route Details
                </Typography>
                <Typography variant="body2">
                  To: {routeDetails.facility.name}
                </Typography>
                <Typography variant="body2">
                  Distance: {routeDetails.distance} km
                </Typography>
                <Typography variant="body2">
                  Estimated Time: {routeDetails.duration} minutes
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={clearRoute}
                  sx={{ mt: 2 }}
                >
                  Clear Route
                </Button>
              </Box>
            ) : (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Nearest Healthcare Facilities
                </Typography>
                {selectedPoint ? (
                  <List dense>
                    {nearestFacilities.map((facility) => (
                      <ListItem
                        key={facility.id}
                        secondaryAction={
                          <Tooltip title="Calculate Route">
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRouteCalculation(facility)}
                            >
                              <DirectionsIcon />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemText
                          primary={facility.name}
                          secondary={`${facility.type} • ${facility.distance.toFixed(2)} km`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Click on the map to set a starting point
                  </Typography>
                )}
              </>
            )}
          </>
        )}
      </Paper>

      {/* Render the route on the map if available */}
      {selectedRoute && (
        <GeoJSON
          data={selectedRoute.route}
          style={{
            color: '#e53935',
            weight: 4,
            opacity: 0.8
          }}
        />
      )}
    </Box>
  );
}

export default AmbulanceRouting; 