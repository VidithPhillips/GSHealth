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
import { fetchHealthcareFacilities, calculateFacilityStats } from '../services/facilities';
import { calculateHaversineDistance } from '../services/routing';

// Helper function to get color based on score
const getColorByScore = (score) => {
  if (score >= 80) return '#4caf50';
  if (score >= 60) return '#8bc34a';
  if (score >= 40) return '#ffeb3b';
  if (score >= 20) return '#ff9800';
  return '#f44336';
};

// Component for labeled progress bars
const LabeledProgressBar = ({ label, value, tooltip }) => (
  <Box sx={{ my: 1 }}>
    <Tooltip title={tooltip}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Tooltip>
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ flexGrow: 1, mr: 1 }}>
        <LinearProgress
          variant="determinate"
          value={parseFloat(value)}
          sx={{
            height: 8,
            borderRadius: 4,
            '& .MuiLinearProgress-bar': {
              backgroundColor: getColorByScore(parseFloat(value))
            }
          }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {Math.round(parseFloat(value))}%
      </Typography>
    </Box>
  </Box>
);

function Analytics({ selectedRegion }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await calculateAnalytics();
        console.log('Analytics data:', data);
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No analytics data available.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Healthcare Analytics Dashboard
      </Typography>
      
      <Grid container spacing={2}>
        {/* Facility Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Facility Distribution
            </Typography>
            <Typography variant="body2" gutterBottom>
              Primary: {analytics.totalFacilities.Primary || 0}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Secondary: {analytics.totalFacilities.Secondary || 0}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Tertiary: {analytics.totalFacilities.Tertiary || 0}
            </Typography>
          </Paper>
        </Grid>

        {/* Coverage Metrics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Coverage Metrics
            </Typography>
            <LabeledProgressBar
              label="Population Coverage (5km)"
              value={analytics.populationCoverage.within5km}
              tooltip="Percentage of population within 5km of a healthcare facility"
            />
            <LabeledProgressBar
              label="Population Coverage (10km)"
              value={analytics.populationCoverage.within10km}
              tooltip="Percentage of population within 10km of a healthcare facility"
            />
            <LabeledProgressBar
              label="Population Coverage (20km)"
              value={analytics.populationCoverage.within20km}
              tooltip="Percentage of population within 20km of a healthcare facility"
            />
          </Paper>
        </Grid>

        {/* Response Times */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Response Times Coverage
            </Typography>
            <LabeledProgressBar
              label="Urban Areas (≤15 min)"
              value={analytics.responseTimes.urban * 100}
              tooltip="Percentage of urban areas covered within 15 minutes"
            />
            <LabeledProgressBar
              label="Suburban Areas (≤25 min)"
              value={analytics.responseTimes.suburban * 100}
              tooltip="Percentage of suburban areas covered within 25 minutes"
            />
            <LabeledProgressBar
              label="Rural Areas (≤40 min)"
              value={analytics.responseTimes.rural * 100}
              tooltip="Percentage of rural areas covered within 40 minutes"
            />
            <LabeledProgressBar
              label="Remote Areas (≤60 min)"
              value={analytics.responseTimes.remote * 100}
              tooltip="Percentage of remote areas covered within 60 minutes"
            />
          </Paper>
        </Grid>

        {/* Specialty Coverage */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Specialty Coverage
            </Typography>
            {analytics.specialtyCoverage && Array.isArray(analytics.specialtyCoverage) ? (
              analytics.specialtyCoverage.map((specialty, index) => (
                <LabeledProgressBar
                  key={index}
                  label={specialty.name}
                  value={specialty.coverage}
                  tooltip={`Percentage of facilities offering ${specialty.name.toLowerCase()} services`}
                />
              ))
            ) : (
              <Alert severity="info">No specialty coverage data available</Alert>
            )}
          </Paper>
        </Grid>

        {/* Facility Density */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Facility Density (per million population)
            </Typography>
            <Typography variant="body2" gutterBottom>
              Overall: {analytics.facilityDensity.overallPerMillion}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Primary Care: {analytics.facilityDensity.primaryPerMillion}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Secondary Care: {analytics.facilityDensity.secondaryPerMillion}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Tertiary Care: {analytics.facilityDensity.tertiaryPerMillion}
            </Typography>
          </Paper>
        </Grid>

        {/* District Accessibility */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              District Accessibility Scores
            </Typography>
            {Array.isArray(analytics.accessibility) && analytics.accessibility.map((district, index) => (
              <LabeledProgressBar
                key={index}
                label={district.district}
                value={district.accessScore}
                tooltip={`Overall healthcare accessibility score for ${district.district}`}
              />
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Data sourced from OpenStreetMap. Population estimates based on 2011 census data.
        Last updated: {new Date().toLocaleString()}
      </Typography>
    </Box>
  );
}

export default Analytics; 