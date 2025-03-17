// Google Maps routing service
import axios from 'axios';

// Constants
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * Calculate route between two points using Google Maps Directions API
 */
export const calculateRoute = async (start, end, options = {}) => {
  try {
    const {
      mode = 'driving',
      alternatives = true,
      optimize = true,
      region = 'in', // India
      language = 'en',
      units = 'metric'
    } = options;

    // Format coordinates for Google Maps API
    const origin = `${start[0]},${start[1]}`;
    const destination = `${end[0]},${end[1]}`;

    // Build request URL with parameters
    const params = new URLSearchParams({
      origin,
      destination,
      mode,
      alternatives: alternatives.toString(),
      optimize: optimize.toString(),
      region,
      language,
      units,
      key: GOOGLE_MAPS_API_KEY
    });

    // Make request to Google Maps Directions API
    const response = await axios.get(`${BASE_URL}?${params}`);

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API Error: ${response.data.status}`);
    }

    // Process and format the response
    const mainRoute = response.data.routes[0];
    const alternativeRoutes = response.data.routes.slice(1);

    // Extract route coordinates from encoded polyline
    const decodePath = (encoded) => {
      const poly = require('@mapbox/polyline');
      return poly.decode(encoded).map(([lat, lng]) => [lat, lng]);
    };

    // Process main route
    const route = {
      success: true,
      route: decodePath(mainRoute.overview_polyline.points),
      distance: mainRoute.legs[0].distance.value / 1000, // Convert to km
      duration: mainRoute.legs[0].duration.value, // Seconds
      legs: mainRoute.legs.map(leg => ({
        distance: leg.distance.value,
        duration: leg.duration.value,
        steps: leg.steps.map(step => ({
          distance: step.distance.value,
          duration: step.duration.value,
          instruction: step.html_instructions,
          maneuver: step.maneuver || ''
        }))
      })),
      alternatives: alternativeRoutes.map(route => ({
        route: decodePath(route.overview_polyline.points),
        distance: route.legs[0].distance.value / 1000,
        duration: route.legs[0].duration.value
      }))
    };

    return route;

  } catch (error) {
    console.error('[GoogleMaps] Route calculation failed:', error);
    
    if (error.response?.status === 403 || error.response?.status === 401) {
      throw new Error('Invalid or missing Google Maps API key');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get route instructions with traffic and ETA
 */
export const getRouteDetails = async (start, end) => {
  try {
    const response = await calculateRoute(start, end, {
      alternatives: false,
      optimize: true
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return {
      route: response.route,
      distance: response.distance,
      duration: response.duration,
      steps: response.legs[0].steps,
      bounds: {
        northeast: response.bounds?.northeast,
        southwest: response.bounds?.southwest
      }
    };

  } catch (error) {
    console.error('[GoogleMaps] Failed to get route details:', error);
    throw error;
  }
};

/**
 * Calculate ETA with traffic
 */
export const calculateETA = async (start, end) => {
  try {
    const response = await calculateRoute(start, end, {
      alternatives: false,
      optimize: true,
      departure_time: 'now'
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return {
      duration: response.duration,
      durationInTraffic: response.duration_in_traffic || response.duration,
      distance: response.distance
    };

  } catch (error) {
    console.error('[GoogleMaps] Failed to calculate ETA:', error);
    throw error;
  }
};

export default {
  calculateRoute,
  getRouteDetails,
  calculateETA
}; 