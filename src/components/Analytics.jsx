import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Box, 
  CircularProgress,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  Alert
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import RouteIcon from '@mui/icons-material/Route';
import { calculateAnalytics } from '../services/analytics';

// Helper function to determine color based on score
const getColorByScore = (score) => {
  if (score >= 80) return '#4caf50'; // Green
  if (score >= 60) return '#2196f3'; // Blue
  if (score >= 40) return '#ff9800'; // Orange
  return '#f44336'; // Red
};

// Helper component for progress bar with label
const LabeledProgressBar = ({ label, value, color, tooltip }) => (
  <Tooltip title={tooltip || ''} arrow placement="top">
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight="bold">{value}%</Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={value} 
        sx={{ 
          height: 8, 
          borderRadius: 2,
          backgroundColor: 'rgba(0,0,0,0.08)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color || 'primary.main',
            borderRadius: 2,
          }
        }} 
      />
    </Box>
  </Tooltip>
);

function Analytics({ selectedRegion }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await calculateAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedRegion]);

  if (loading) {
    return (
      <Box className="loading-indicator">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
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
        <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
        Healthcare Analytics: {selectedRegion}
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This dashboard provides real-time analytics based on OpenStreetMap data for healthcare facilities in {selectedRegion}.
        Last updated: {new Date().toLocaleString()}
      </Alert>
      
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocalHospitalIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.totalFacilities.primary + analytics.totalFacilities.secondary + analytics.totalFacilities.tertiary}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Total Healthcare Facilities
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Tooltip title="Primary Healthcare Centers" arrow>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Primary</Typography>
                    <Typography variant="h6" color="success.main">{analytics.totalFacilities.primary}</Typography>
                  </Box>
                </Tooltip>
                <Tooltip title="Secondary Healthcare Centers" arrow>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Secondary</Typography>
                    <Typography variant="h6" color="primary.main">{analytics.totalFacilities.secondary}</Typography>
                  </Box>
                </Tooltip>
                <Tooltip title="Tertiary Healthcare Centers" arrow>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Tertiary</Typography>
                    <Typography variant="h6" color="error.main">{analytics.totalFacilities.tertiary}</Typography>
                  </Box>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 48, color: '#ff9800', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.populationCoverage.within10km}%
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Population within 10km
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Tooltip title="Percentage of population within 5km of a healthcare facility" arrow>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Within 5km</Typography>
                    <Typography variant="body2">{analytics.populationCoverage.within5km}%</Typography>
                  </Box>
                </Tooltip>
                <LinearProgress 
                  variant="determinate" 
                  value={analytics.populationCoverage.within5km} 
                  sx={{ height: 8, borderRadius: 2, mb: 1 }} 
                />
                
                <Tooltip title="Percentage of population beyond 20km from any healthcare facility" arrow>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Beyond 20km</Typography>
                    <Typography variant="body2" color="error.main">{analytics.populationCoverage.beyond20km}%</Typography>
                  </Box>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccessTimeIcon sx={{ fontSize: 48, color: '#f44336', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.responseTime.rural}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Avg. Rural Response Time (min)
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Urban</Typography>
                  <Typography variant="body2">{analytics.responseTime.urban} min</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Semi-Urban</Typography>
                  <Typography variant="body2">{analytics.responseTime.semiUrban} min</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Remote</Typography>
                  <Typography variant="body2">{analytics.responseTime.remote} min</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <RouteIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.facilityDensity.overallPerMillion}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Facilities per Million People
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Primary Healthcare</Typography>
                  <Typography variant="body2">{analytics.facilityDensity.primaryPerMillion}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Secondary Healthcare</Typography>
                  <Typography variant="body2">{analytics.facilityDensity.secondaryPerMillion}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Tertiary Healthcare</Typography>
                  <Typography variant="body2">{analytics.facilityDensity.tertiaryPerMillion}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Specialty Coverage */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Medical Specialty Coverage
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Percentage of facilities offering each medical specialty
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {analytics.specialtyCoverage.map((specialty) => (
              <LabeledProgressBar 
                key={specialty.name}
                label={specialty.name}
                value={specialty.coverage}
                color={getColorByScore(specialty.coverage)}
                tooltip={`${specialty.coverage}% of facilities offer ${specialty.name}`}
              />
            ))}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              District-wise Healthcare Accessibility
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Overall healthcare accessibility score by district (0-100)
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              {analytics.regionalAccessibility.map((region) => (
                <Grid item xs={12} sm={6} key={region.district}>
                  <Card variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2">{region.district}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Box
                          sx={{
                            width: '70%',
                            mr: 1,
                          }}
                        >
                          <LinearProgress
                            variant="determinate"
                            value={region.accessScore}
                            sx={{
                              height: 8,
                              borderRadius: 5,
                              backgroundColor: 'rgba(0,0,0,0.08)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getColorByScore(region.accessScore),
                                borderRadius: 5,
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          {region.accessScore}/100
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Data sourced from OpenStreetMap and calculated in real-time. Population estimates based on 2011 census data.
        </Typography>
      </Box>
    </Container>
  );
}

export default Analytics; 