import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AccessibleIcon from '@mui/icons-material/Accessible';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsIcon from '@mui/icons-material/Directions';
import { fetchHealthcareFacilities } from '../services/facilities';

// Major areas in Himachal Pradesh
const AREAS = [
  'All',
  'Shimla',
  'Dharamshala',
  'Mandi',
  'Solan',
  'Kullu',
  'Bilaspur',
  'Other'
];

const FACILITY_TYPES = ['All', 'Primary', 'Secondary', 'Tertiary'];

function Facilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching healthcare facilities...');
        const data = await fetchHealthcareFacilities();
        console.log('Fetched facilities:', data);
        setFacilities(data);
      } catch (err) {
        console.error('Error loading facilities:', err);
        setError('Failed to load healthcare facilities. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadFacilities();
  }, []);

  // Function to determine area based on facility coordinates
  const determineArea = (facility) => {
    const areaCoordinates = {
      'Shimla': { lat: 31.1048, lng: 77.1734, radius: 20 },
      'Dharamshala': { lat: 32.2190, lng: 76.3234, radius: 20 },
      'Mandi': { lat: 31.7088, lng: 76.9320, radius: 20 },
      'Solan': { lat: 30.9045, lng: 77.0967, radius: 20 },
      'Kullu': { lat: 31.9579, lng: 77.1091, radius: 20 },
      'Bilaspur': { lat: 31.3397, lng: 76.7567, radius: 20 }
    };

    for (const [area, coords] of Object.entries(areaCoordinates)) {
      const distance = Math.sqrt(
        Math.pow(facility.lat - coords.lat, 2) + 
        Math.pow(facility.lng - coords.lng, 2)
      );
      if (distance <= coords.radius / 111) { // Convert radius from km to degrees
        return area;
      }
    }
    return 'Other';
  };

  // Filter and sort facilities
  const filteredFacilities = useMemo(() => {
    return facilities
      .map(facility => ({
        ...facility,
        area: determineArea(facility)
      }))
      .filter(facility => {
        const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          facility.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          facility.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesArea = selectedArea === 'All' || facility.area === selectedArea;
        const matchesType = selectedType === 'All' || facility.type === selectedType;
        return matchesSearch && matchesArea && matchesType;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [facilities, searchTerm, selectedArea, selectedType]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Primary': return '#4caf50';
      case 'Secondary': return '#2196f3';
      case 'Tertiary': return '#f44336';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!facilities.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No healthcare facilities found in the selected region.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <LocalHospitalIcon sx={{ mr: 1 }} />
        Healthcare Facilities
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Showing {filteredFacilities.length} healthcare facilities in Himachal Pradesh.
        Data sourced from OpenStreetMap, last updated: {new Date().toLocaleString()}
      </Alert>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Area</InputLabel>
          <Select
            value={selectedArea}
            label="Area"
            onChange={(e) => setSelectedArea(e.target.value)}
          >
            {AREAS.map(area => (
              <MenuItem key={area} value={area}>{area}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Facility Type</InputLabel>
          <Select
            value={selectedType}
            label="Facility Type"
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {FACILITY_TYPES.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 650 }} size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Specialties</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFacilities
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" fontWeight="medium">
                      {facility.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={facility.type}
                      size="small"
                      color={
                        facility.type === 'Tertiary' ? 'error' :
                        facility.type === 'Secondary' ? 'primary' :
                        'success'
                      }
                    />
                  </TableCell>
                  <TableCell>{facility.area}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOnIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2">{facility.address || 'N/A'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {facility.phone && facility.phone !== 'N/A' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2">{facility.phone}</Typography>
                      </Box>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {facility.specialties.map((specialty, index) => (
                        <Chip
                          key={index}
                          label={specialty}
                          size="small"
                          sx={{ backgroundColor: '#f5f5f5' }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Get Directions">
                      <IconButton
                        size="small"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <DirectionsIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredFacilities.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}

export default Facilities; 