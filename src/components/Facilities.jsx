import { useState, useEffect } from 'react';
import { 
  Container, 
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
  InputAdornment,
  CircularProgress,
  Chip,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsIcon from '@mui/icons-material/Directions';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import FilterListIcon from '@mui/icons-material/FilterList';

// Sample data - this would be fetched from an API in a real application
const SAMPLE_FACILITIES = [
  {
    id: 1,
    name: "Indira Gandhi Medical College and Hospital",
    type: "Tertiary",
    address: "Ridge, Shimla, Himachal Pradesh 171001",
    phone: "+91 177 280 4251",
    specialties: ["Cardiology", "Neurology", "Orthopedics"],
    lat: 31.1040,
    lng: 77.1725
  },
  {
    id: 2,
    name: "Deen Dayal Upadhyay Hospital",
    type: "Secondary",
    address: "Sanjauli, Shimla, Himachal Pradesh 171006",
    phone: "+91 177 280 5777",
    specialties: ["General Medicine", "Pediatrics"],
    lat: 31.1080,
    lng: 77.1690
  },
  {
    id: 3,
    name: "Community Health Centre Dhalli",
    type: "Primary",
    address: "Dhalli, Shimla, Himachal Pradesh 171012",
    phone: "+91 177 279 0025",
    specialties: ["General Medicine", "Basic Emergency Care"],
    lat: 31.1215,
    lng: 77.1963
  },
  {
    id: 4, 
    name: "Primary Health Centre New Shimla",
    type: "Primary",
    address: "New Shimla, Himachal Pradesh 171009",
    phone: "+91 177 279 2144",
    specialties: ["General Medicine", "Maternal Care"],
    lat: 31.0910,
    lng: 77.1510
  },
  {
    id: 5,
    name: "Dr. Rajendra Prasad Government Medical College",
    type: "Tertiary",
    address: "Tanda, Kangra, Himachal Pradesh 176001",
    phone: "+91 1892 267115",
    specialties: ["Cardiology", "Neurology", "Oncology"],
    lat: 32.0998,
    lng: 76.2691
  },
  {
    id: 6,
    name: "Regional Hospital Kullu",
    type: "Secondary",
    address: "Dhalpur, Kullu, Himachal Pradesh 175101",
    phone: "+91 1902 222361",
    specialties: ["General Medicine", "Orthopedics", "Gynecology"],
    lat: 31.9604, 
    lng: 77.1088
  },
  {
    id: 7,
    name: "Civil Hospital Mandi",
    type: "Secondary",
    address: "Hospital Road, Mandi, Himachal Pradesh 175001",
    phone: "+91 1905 223220",
    specialties: ["General Medicine", "Surgery", "Pediatrics"],
    lat: 31.7072,
    lng: 76.9322
  },
  {
    id: 8,
    name: "ESIC Hospital Parwanoo",
    type: "Secondary",
    address: "Sector 4, Parwanoo, Himachal Pradesh 173220",
    phone: "+91 1792 232041",
    specialties: ["General Medicine", "Occupational Health"],
    lat: 30.8370,
    lng: 76.9613
  },
  {
    id: 9,
    name: "Primary Health Centre Dhanakar",
    type: "Primary",
    address: "Dhanakar, Solan, Himachal Pradesh 173212",
    phone: "+91 1792 264783",
    specialties: ["General Medicine", "Maternal Care"],
    lat: 30.8960,
    lng: 77.0967
  },
  {
    id: 10,
    name: "Civil Hospital Jwalamukhi",
    type: "Primary",
    address: "Jwalamukhi, Kangra, Himachal Pradesh 176031",
    phone: "+91 1972 226022",
    specialties: ["General Medicine"],
    lat: 31.8768, 
    lng: 76.3201
  }
];

// Chip colors by facility type
const getChipColor = (type) => {
  switch (type) {
    case 'Primary':
      return 'success';
    case 'Secondary':
      return 'primary';
    case 'Tertiary':
      return 'error';
    default:
      return 'default';
  }
};

function Facilities({ selectedRegion }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterSpecialty, setFilterSpecialty] = useState('All');

  // Simulate loading data from API
  useEffect(() => {
    console.log(`Fetching facilities data for ${selectedRegion}...`);
    
    // Simulating an API call delay
    setTimeout(() => {
      setFacilities(SAMPLE_FACILITIES);
      setLoading(false);
    }, 1000);
  }, [selectedRegion]);

  // Extract all unique specialties for filter dropdown
  const allSpecialties = Array.from(
    new Set(
      facilities.flatMap(facility => facility.specialties)
    )
  ).sort();

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter facilities based on search and filters
  const filteredFacilities = facilities.filter(facility => {
    // Search term filter (name, address, phone)
    const matchesSearch = 
      facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter
    const matchesType = filterType === 'All' || facility.type === filterType;
    
    // Specialty filter
    const matchesSpecialty = 
      filterSpecialty === 'All' || 
      facility.specialties.includes(filterSpecialty);
    
    return matchesSearch && matchesType && matchesSpecialty;
  });

  // Pagination calculation
  const emptyRows = 
    rowsPerPage - Math.min(rowsPerPage, filteredFacilities.length - page * rowsPerPage);

  if (loading) {
    return (
      <Box className="loading-indicator">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <LocalHospitalIcon sx={{ mr: 1, color: 'primary.main' }} />
        Healthcare Facilities in {selectedRegion}
      </Typography>
      
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'flex-start' }}>
          {/* Search bar */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search facilities..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Filters:
              </Typography>
            </Box>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="facility-type-filter-label">Type</InputLabel>
              <Select
                labelId="facility-type-filter-label"
                id="facility-type-filter"
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="All">All Types</MenuItem>
                <MenuItem value="Primary">Primary</MenuItem>
                <MenuItem value="Secondary">Secondary</MenuItem>
                <MenuItem value="Tertiary">Tertiary</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="specialty-filter-label">Specialty</InputLabel>
              <Select
                labelId="specialty-filter-label"
                id="specialty-filter"
                value={filterSpecialty}
                label="Specialty"
                onChange={(e) => setFilterSpecialty(e.target.value)}
              >
                <MenuItem value="All">All Specialties</MenuItem>
                {allSpecialties.map(specialty => (
                  <MenuItem key={specialty} value={specialty}>
                    {specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      
      <Paper elevation={2}>
        <TableContainer>
          <Table aria-label="healthcare facilities table">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Facility Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Specialties</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFacilities
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((facility) => (
                  <TableRow key={facility.id} hover>
                    <TableCell component="th" scope="row">
                      {facility.name}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={facility.type} 
                        size="small" 
                        color={getChipColor(facility.type)} 
                      />
                    </TableCell>
                    <TableCell>{facility.address}</TableCell>
                    <TableCell>{facility.phone}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {facility.specialties.map(specialty => (
                          <Chip 
                            key={specialty} 
                            label={specialty} 
                            size="small" 
                            variant="outlined" 
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<DirectionsIcon />}
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`)}
                      >
                        Directions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredFacilities.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Typography variant="body2" color="text.secondary">
          {filteredFacilities.length} facilities found in {selectedRegion}
        </Typography>
      </Box>
    </Container>
  );
}

export default Facilities; 