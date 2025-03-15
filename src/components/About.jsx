import { Container, Typography, Paper, Box, Grid, Divider, Link } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SourceIcon from '@mui/icons-material/Source';
import DataObjectIcon from '@mui/icons-material/DataObject';
import PersonIcon from '@mui/icons-material/Person';

function About() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
          About GSHealth
        </Typography>
        
        <Typography variant="body1" paragraph>
          GSHealth is a free, open-source web application designed to map healthcare facilities in India and provide optimal ambulance routing to enhance emergency response times, particularly in remote areas.
        </Typography>
        
        <Typography variant="body1" paragraph>
          The project initially focuses on Himachal Pradesh, with plans to expand coverage to other Indian states. It aims to provide valuable insights into healthcare accessibility and support emergency response planning.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SourceIcon sx={{ mr: 1, color: 'primary.main' }} />
          Data Sources
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">OpenStreetMap (OSM)</Typography>
              <Typography variant="body2">
                Healthcare facility and road network data from OSM's open database.
              </Typography>
              <Link href="https://data.humdata.org/dataset/hotosm_ind_health_facilities" target="_blank" rel="noopener">
                View Dataset
              </Link>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">National Health Mission (NHM)</Typography>
              <Typography variant="body2">
                Official data on healthcare centers and facilities in India.
              </Typography>
              <Link href="https://nhsrcindia.org/" target="_blank" rel="noopener">
                View Source
              </Link>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Indian Health Facility Registry (HFR)</Typography>
              <Typography variant="body2">
                Government database of hospitals and clinics across India.
              </Typography>
              <Link href="https://hfr.nhp.gov.in/resources/download-data" target="_blank" rel="noopener">
                View Dataset
              </Link>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">Elevation & Road Data</Typography>
              <Typography variant="body2">
                Terrain and transportation network information from NASA SRTM Digital Elevation Data and Bhuvan.
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <DataObjectIcon sx={{ mr: 1, color: 'primary.main' }} />
          Technical Information
        </Typography>
        
        <Typography variant="body1" paragraph>
          This application is built using modern web technologies:
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold">Frontend</Typography>
            <ul style={{ paddingLeft: '20px' }}>
              <li>React.js - Frontend framework</li>
              <li>Leaflet.js - Interactive mapping</li>
              <li>Material UI - Component library</li>
            </ul>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold">Deployment</Typography>
            <ul style={{ paddingLeft: '20px' }}>
              <li>GitHub Pages - Static web hosting</li>
              <li>Open source under MIT License</li>
              <li>Developed for accessibility on various devices</li>
            </ul>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
          Contribute
        </Typography>
        
        <Typography variant="body1" paragraph>
          This project is open source and welcomes contributions from developers, healthcare professionals, GIS specialists, and anyone interested in improving healthcare accessibility.
        </Typography>
        
        <Typography variant="body1">
          Visit our{' '}
          <Link href="https://github.com/VidithPhillips/GSHealth" target="_blank" rel="noopener">
            GitHub repository
          </Link>{' '}
          to contribute code, report issues, or suggest improvements.
        </Typography>
      </Paper>
    </Container>
  );
}

export default About; 