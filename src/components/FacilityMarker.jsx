import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Typography, Divider, Button, Chip, Box, Stack } from '@mui/material';
import DirectionsIcon from '@mui/icons-material/Directions';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import AccessibleIcon from '@mui/icons-material/Accessible';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import L from 'leaflet';

// Create marker icons for each facility type
const createFacilityIcon = (type) => {
  // Define colors based on facility type
  const colors = {
    'Primary': '#4caf50',    // Green
    'Secondary': '#2196f3',  // Blue
    'Tertiary': '#f44336'    // Red
  };

  const color = colors[type] || colors['Primary'];

  return L.divIcon({
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      "></div>
    `,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export function FacilityMarker({ facility, position, onCalculateRoute, selectedPoint }) {
  console.log('[FacilityMarker] Rendering facility:', {
    id: facility.id,
    name: facility.name,
    type: facility.type,
    position
  });

  if (!position || !Array.isArray(position) || position.length !== 2) {
    console.error('[FacilityMarker] Invalid position:', {
      position,
      facility: {
        id: facility.id,
        name: facility.name,
        lat: facility.lat,
        lng: facility.lng
      }
    });
    return null;
  }

  const [lat, lng] = position;
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    console.error('[FacilityMarker] Invalid coordinates:', {
      lat,
      lng,
      facility: {
        id: facility.id,
        name: facility.name,
        originalLat: facility.lat,
        originalLng: facility.lng
      }
    });
    return null;
  }

  // Check for extreme values
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    console.error('[FacilityMarker] ❌ Facility coordinates out of bounds:', lat, lng);
    return null;
  }
  
  // Helper function to get color based on facility type - for chips
  const getFacilityColor = (type) => {
    switch(type) {
      case 'Primary': return 'success';
      case 'Secondary': return 'primary';
      case 'Tertiary': return 'error';
      default: return 'default';
    }
  };
  
  const handleCalculateRoute = (e) => {
    e.preventDefault(); // Prevent the popup from closing
    if (onCalculateRoute) {
      onCalculateRoute(facility);
    }
  };
  
  // Safe function to create marker (wrapped in try/catch)
  try {
    return (
      <Marker
        position={position}
        icon={createFacilityIcon(facility.type)}
      >
        <Popup maxWidth={300} minWidth={250}>
          <Box sx={{ padding: '4px' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {facility.name}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip 
                label={`${facility.type}`}
                size="small" 
                color={getFacilityColor(facility.type)}
                sx={{ height: 24 }}
              />
              
              {facility.emergency && (
                <Chip 
                  icon={<MedicalServicesIcon sx={{ fontSize: 16 }} />} 
                  label="Emergency" 
                  size="small" 
                  color="error"
                  sx={{ height: 24 }}
                />
              )}
              
              {facility.wheelchair === 'yes' && (
                <Chip 
                  icon={<AccessibleIcon sx={{ fontSize: 16 }} />} 
                  label="Accessible" 
                  size="small" 
                  color="info"
                  sx={{ height: 24 }}
                />
              )}
            </Stack>
            
            <Divider />
            
            <Box sx={{ my: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                {facility.address}
              </Typography>
              
              {facility.phone !== 'N/A' && (
                <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
                  📞 <a href={`tel:${facility.phone}`} style={{ textDecoration: 'none' }}>{facility.phone}</a>
                </Typography>
              )}
            </Box>
            
            {facility.specialties && facility.specialties.length > 0 && (
              <>
                <Divider />
                <Box sx={{ my: 1 }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                    Specialties
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {facility.specialties.map((specialty, index) => (
                      <Chip 
                        key={index}
                        label={specialty} 
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            )}
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedPoint ? (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="medium"
                  startIcon={<LocalHospitalIcon />}
                  onClick={handleCalculateRoute}
                  sx={{ 
                    textTransform: 'none',
                    backgroundColor: '#2196f3',
                    '&:hover': {
                      backgroundColor: '#1976d2'
                    }
                  }}
                >
                  Calculate Ambulance Route
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ 
                  backgroundColor: '#f5f5f5', 
                  p: 1, 
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  Click anywhere on the map to set a starting point for routing
                </Typography>
              )}
              
              <Button
                fullWidth
                variant="outlined"
                size="small" 
                startIcon={<DirectionsIcon />}
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: 'none' }}
              >
                Open in Google Maps
              </Button>
            </Box>
          </Box>
        </Popup>
      </Marker>
    );
  } catch (error) {
    console.error('[FacilityMarker] ❌ Error rendering marker:', error, facility);
    return null;
  }
} 