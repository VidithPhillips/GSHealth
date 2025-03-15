import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box, Typography, Paper, CircularProgress, TextField, Button, Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LayersIcon from '@mui/icons-material/Layers';

// Coordinates for Himachal Pradesh
const HP_CENTER = [31.1048, 77.1734]; // Coordinates for Shimla, capital of Himachal Pradesh
const DEFAULT_ZOOM = 8;

// Sample data for healthcare facilities - in a real app, this would come from an API
const SAMPLE_FACILITIES = [
  {
    id: 1,
    name: "Indira Gandhi Medical College and Hospital",
    type: "Tertiary",
    lat: 31.1040,
    lng: 77.1725,
    address: "Ridge, Shimla, Himachal Pradesh 171001",
    phone: "+91 177 280 4251",
    specialties: ["Cardiology", "Neurology", "Orthopedics"]
  },
  {
    id: 2,
    name: "Deen Dayal Upadhyay Hospital",
    type: "Secondary",
    lat: 31.1080,
    lng: 77.1690,
    address: "Sanjauli, Shimla, Himachal Pradesh 171006",
    phone: "+91 177 280 5777",
    specialties: ["General Medicine", "Pediatrics"]
  },
  {
    id: 3,
    name: "Community Health Centre Dhalli",
    type: "Primary",
    lat: 31.1215,
    lng: 77.1963,
    address: "Dhalli, Shimla, Himachal Pradesh 171012",
    phone: "+91 177 279 0025",
    specialties: ["General Medicine", "Basic Emergency Care"]
  },
  {
    id: 4, 
    name: "Primary Health Centre New Shimla",
    type: "Primary",
    lat: 31.0910,
    lng: 77.1510,
    address: "New Shimla, Himachal Pradesh 171009",
    phone: "+91 177 279 2144",
    specialties: ["General Medicine", "Maternal Care"]
  },
  {
    id: 5,
    name: "Dr. Rajendra Prasad Government Medical College",
    type: "Tertiary",
    lat: 32.0998,
    lng: 76.2691,
    address: "Tanda, Kangra, Himachal Pradesh 176001",
    phone: "+91 1892 267115",
    specialties: ["Cardiology", "Neurology", "Oncology"]
  }
];

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
  
  // Simulate fetching data
  useEffect(() => {
    // In a real application, this would be a fetch call to an API
    // based on the selected region
    console.log(`Fetching data for ${selectedRegion}...`);
    
    setTimeout(() => {
      setFacilities(SAMPLE_FACILITIES);
      setLoading(false);
    }, 1000);
  }, [selectedRegion]);

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          facility.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = facilityType === 'All' || facility.type === facilityType;
    return matchesSearch && matchesType;
  });

  const handleSearch = (e) => {
    e.preventDefault();
    // Additional search logic could be added here
  };

  const MapLegend = () => (
    <Paper elevation={3} className="legend" sx={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000 }}>
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
    </Paper>
  );

  if (loading) {
    return (
      <Box className="loading-indicator">
        <CircularProgress />
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
          width: { xs: 'calc(100% - 40px)', sm: 350 },
          maxWidth: '90%'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <LocalHospitalIcon sx={{ mr: 1 }} />
          Healthcare Facilities
        </Typography>
        
        <form onSubmit={handleSearch}>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or address"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mr: 1 }}
            />
            <Button 
              variant="contained" 
              type="submit"
              sx={{ minWidth: 'auto' }}
            >
              <SearchIcon />
            </Button>
          </Box>
        </form>
        
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="facility-type-label">Facility Type</InputLabel>
          <Select
            labelId="facility-type-label"
            id="facility-type"
            value={facilityType}
            label="Facility Type"
            onChange={(e) => setFacilityType(e.target.value)}
          >
            <MenuItem value="All">All Types</MenuItem>
            <MenuItem value="Primary">Primary</MenuItem>
            <MenuItem value="Secondary">Secondary</MenuItem>
            <MenuItem value="Tertiary">Tertiary</MenuItem>
          </Select>
        </FormControl>
        
        <Divider sx={{ my: 1 }} />
        
        <Typography variant="body2" color="text.secondary">
          Showing {filteredFacilities.length} of {facilities.length} facilities in {selectedRegion}
        </Typography>
      </Paper>
      
      {/* Map Container */}
      <MapContainer 
        center={center} 
        zoom={DEFAULT_ZOOM} 
        style={{ height: '100%', width: '100%' }}
      >
        <MapCenterUpdater center={center} zoom={DEFAULT_ZOOM} />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        {filteredFacilities.map(facility => (
          <Marker 
            key={facility.id} 
            position={[facility.lat, facility.lng]}
            icon={createFacilityIcon(facility.type)}
          >
            <Popup className="facility-popup">
              <div className="facility-info">
                <h3>{facility.name}</h3>
                <p><strong>Type:</strong> {facility.type} Healthcare</p>
                <p><strong>Address:</strong> {facility.address}</p>
                <p><strong>Phone:</strong> {facility.phone}</p>
                <p><strong>Specialties:</strong> {facility.specialties.join(', ')}</p>
                <Button 
                  variant="contained" 
                  size="small" 
                  startIcon={<DirectionsIcon />} 
                  sx={{ mt: 1 }}
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`)}
                >
                  Get Directions
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapLegend />
      </MapContainer>
    </Box>
  );
}

export default MapView; 