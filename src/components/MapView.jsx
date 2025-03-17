import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box, Typography, Paper, CircularProgress, TextField, Button, Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LayersIcon from '@mui/icons-material/Layers';
import { fetchHealthcareFacilities } from '../services/osm';
import AmbulanceRouting from './AmbulanceRouting';

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

// Map center updater component
function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

function MapView({ selectedRegion }) {
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState([]);
  const [center, setCenter] = useState(HP_CENTER);
  const [searchTerm, setSearchTerm] = useState('');
  const [facilityType, setFacilityType] = useState('All');
  const [error, setError] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const mapRef = useRef(null);
  
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHealthcareFacilities();
        setFacilities(data);
      } catch (err) {
        console.error('Error loading facilities:', err);
        setError('Failed to load healthcare facilities. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadFacilities();
  }, [selectedRegion]);

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          facility.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = facilityType === 'All' || facility.type === facilityType;
    return matchesSearch && matchesType;
  });

  const handleMapClick = (e) => {
    setSelectedPoint([e.latlng.lat, e.latlng.lng]);
  };

  // Custom marker for selected point
  const startPointIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="10" fill="#e53935"/>
            <circle cx="12" cy="12" r="6" fill="white"/>
          </svg>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const MapLegend = () => (
    <Paper elevation={3} className="legend" sx={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Legend</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#4caf50', mr: 1 }}></Box>
        <Typography variant="body2">Primary Healthcare</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#2196f3', mr: 1 }}></Box>
        <Typography variant="body2">Secondary Healthcare</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#f44336', mr: 1 }}></Box>
        <Typography variant="body2">Tertiary Healthcare</Typography>
      </Box>
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2" color="text.secondary">
        Data from OpenStreetMap
      </Typography>
    </Paper>
  );

  if (loading) {
    return (
      <Box className="loading-indicator">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 2, bgcolor: '#ffebee' }}>
          <Typography color="error">{error}</Typography>
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
        </form>
        <FormControl fullWidth size="small">
          <InputLabel>Facility Type</InputLabel>
          <Select
            value={facilityType}
            label="Facility Type"
            onChange={(e) => setFacilityType(e.target.value)}
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
      </Paper>

      <MapContainer 
        center={center} 
        zoom={DEFAULT_ZOOM} 
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        onClick={handleMapClick}
      >
        <MapCenterUpdater center={center} zoom={DEFAULT_ZOOM} />
        
        {/* Map click handler */}
        <MapClickHandler onMapClick={handleMapClick} />
        
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
        </LayersControl>

        {/* Facility markers */}
        {filteredFacilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.lat, facility.lng]}
            icon={createFacilityIcon(facility.type)}
          >
            <Popup>
              <Typography variant="subtitle1" fontWeight="bold">
                {facility.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {facility.type} Healthcare Facility
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                {facility.address}
              </Typography>
              {facility.phone !== 'N/A' && (
                <Typography variant="body2">
                  📞 {facility.phone}
                </Typography>
              )}
              {facility.specialties.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" fontWeight="bold">
                    Specialties:
                  </Typography>
                  <Typography variant="body2">
                    {facility.specialties.join(', ')}
                  </Typography>
                </>
              )}
              <Box sx={{ mt: 1 }}>
                <Button 
                  size="small" 
                  startIcon={<DirectionsIcon />}
                  href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions
                </Button>
              </Box>
            </Popup>
          </Marker>
        ))}

        {/* Selected point marker */}
        {selectedPoint && (
          <Marker
            position={selectedPoint}
            icon={startPointIcon}
          >
            <Popup>
              <Typography variant="body2">Starting Point</Typography>
              <Typography variant="caption" color="text.secondary">
                Click on a facility to calculate route
              </Typography>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <MapLegend />
      
      {/* Ambulance routing component */}
      <AmbulanceRouting 
        map={mapRef.current}
        facilities={filteredFacilities}
        selectedPoint={selectedPoint}
      />
    </Box>
  );
}

// Map click handler component
function MapClickHandler({ onMapClick }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    map.on('click', onMapClick);
    
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, onMapClick]);
  
  return null;
}

export default MapView; 