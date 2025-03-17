import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  CircularProgress,
  TextField,
  InputAdornment,
  Alert,
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DirectionsIcon from '@mui/icons-material/Directions';
import EmergencyIcon from '@mui/icons-material/Emergency';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';

const FacilityList = ({ 
  facilities, 
  selectedPoint, 
  onFacilitySelect, 
  loading, 
  selectedFacility,
  routeInfo 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('distance'); // distance, type, emergency
  const [filters, setFilters] = useState({
    types: ['Primary', 'Secondary', 'Tertiary'],
    emergency: null, // true, false, or null (all)
    maxDistance: null
  });

  // Filter and sort facilities
  const filteredFacilities = facilities
    .filter(facility => {
      // Search term filter
      const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          facility.address?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = filters.types.includes(facility.type);
      
      // Emergency filter
      const matchesEmergency = filters.emergency === null || facility.emergency === filters.emergency;
      
      // Distance filter
      const matchesDistance = !filters.maxDistance || facility.distance <= filters.maxDistance;
      
      return matchesSearch && matchesType && matchesEmergency && matchesDistance;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'type':
          return a.type.localeCompare(b.type);
        case 'emergency':
          return (b.emergency ? 1 : 0) - (a.emergency ? 1 : 0);
        default:
          return 0;
      }
    });

  const getResponseTimeIndicator = (distance) => {
    if (distance <= 5) return { color: 'success', text: 'Quick Response' };
    if (distance <= 10) return { color: 'primary', text: 'Standard Response' };
    if (distance <= 20) return { color: 'warning', text: 'Extended Response' };
    return { color: 'error', text: 'Long Response' };
  };

  const formatDistance = (distance) => {
    return distance < 1 
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`;
  };

  const estimateTime = (distance) => {
    // Rough estimate based on 40 km/h average speed
    const hours = distance / 40;
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: 400, 
      bgcolor: 'background.paper',
      borderRadius: 1,
      overflow: 'hidden'
    }}>
      {/* Search and filters */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" gutterBottom>
          Nearest Healthcare Facilities
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search facilities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ 
            bgcolor: 'white',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { border: 'none' }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
        />
        
        {/* Filter chips */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip 
            icon={<SortIcon />}
            label={`Sort: ${sortBy}`}
            onClick={() => {
              const sorts = ['distance', 'type', 'emergency'];
              const currentIndex = sorts.indexOf(sortBy);
              setSortBy(sorts[(currentIndex + 1) % sorts.length]);
            }}
            color="default"
            sx={{ bgcolor: 'white' }}
          />
          <Chip 
            icon={<FilterListIcon />}
            label={`${filters.types.length} Types`}
            onClick={() => {/* Open filter dialog */}}
            color="default"
            sx={{ bgcolor: 'white' }}
          />
          {filters.emergency !== null && (
            <Chip 
              icon={<EmergencyIcon />}
              label="Emergency Only"
              onDelete={() => setFilters(f => ({ ...f, emergency: null }))}
              color="error"
              sx={{ bgcolor: 'white' }}
            />
          )}
        </Stack>
      </Box>

      {/* Facility list */}
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : !selectedPoint ? (
        <Alert severity="info" sx={{ m: 2 }}>
          Click anywhere on the map to set a starting point
        </Alert>
      ) : filteredFacilities.length === 0 ? (
        <Alert severity="warning" sx={{ m: 2 }}>
          No facilities found matching your criteria
        </Alert>
      ) : (
        <List sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
          {filteredFacilities.map((facility) => {
            const responseTime = getResponseTimeIndicator(facility.distance);
            const isSelected = selectedFacility?.id === facility.id;
            
            return (
              <ListItem 
                key={facility.id}
                disablePadding
                sx={{ 
                  borderLeft: 4, 
                  borderLeftColor: isSelected ? 'primary.main' : 'transparent'
                }}
              >
                <Card 
                  elevation={isSelected ? 3 : 1}
                  sx={{ 
                    width: '100%',
                    m: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => onFacilitySelect(facility)}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle1" component="div" fontWeight="medium">
                          {facility.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={facility.type}
                          color={
                            facility.type === 'Tertiary' ? 'error' :
                            facility.type === 'Secondary' ? 'primary' : 'success'
                          }
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        {facility.address}
                      </Typography>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          icon={<AccessTimeIcon />}
                          label={estimateTime(facility.distance)}
                          color={responseTime.color}
                          variant="outlined"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formatDistance(facility.distance)}
                        </Typography>
                        {facility.emergency && (
                          <Chip
                            size="small"
                            icon={<EmergencyIcon />}
                            label="Emergency"
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      {isSelected && routeInfo && (
                        <Alert 
                          severity={routeInfo.directRoute ? 'warning' : 'success'} 
                          icon={routeInfo.directRoute ? <DirectionsIcon /> : <LocalHospitalIcon />}
                        >
                          {routeInfo.directRoute 
                            ? 'Showing direct route - actual road route not available'
                            : `Route calculated - ${Math.round(routeInfo.duration / 60)} min travel time`
                          }
                        </Alert>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default FacilityList; 