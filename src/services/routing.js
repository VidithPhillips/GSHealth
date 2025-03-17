// OpenRouteService API for routing
import { findNearestNode, calculateDistance as calcLocalDistance } from './localRouting';
import axios from 'axios';

// Get API key from environment, supporting both Vite and Jest environments
const getApiKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_ORS_API_KEY;
  }
  return process.env.VITE_ORS_API_KEY;
};

const ORS_API_KEY = getApiKey();
const ORS_BASE_URL = 'https://api.openrouteservice.org';
const OSRM_SERVERS = [
  'https://routing.openstreetmap.de',
  'https://osrm.server2.com',  // Add your fallback servers
];
const DEFAULT_TIMEOUT = 10000; // 10 seconds

// Cache for road network data
let cachedRoadData = null;

// Validate API key format and presence
const validateApiKey = () => {
  if (!ORS_API_KEY) {
    console.error('OpenRouteService API key is missing. Please add it to your .env file.');
    return false;
  }
  if (ORS_API_KEY === 'your_api_key_here') {
    console.error('Please replace the placeholder API key in .env with your actual OpenRouteService API key.');
    return false;
  }
  return true;
};

/**
 * Convert coordinates from [lat, lng] to [lng, lat] format
 * @param {Array} coords [lat, lng]
 * @returns {Array} [lng, lat]
 */
const toORSFormat = (coords) => {
  console.log('Converting coordinates to ORS format:', { input: coords, output: [coords[1], coords[0]] });
  return [coords[1], coords[0]];
};

/**
 * Convert coordinates from [lng, lat] to [lat, lng] format
 * @param {Array} coords [lng, lat]
 * @returns {Array} [lat, lng]
 */
const fromORSFormat = (coords) => {
  console.log('Converting coordinates from ORS format:', { input: coords, output: [coords[1], coords[0]] });
  return [coords[1], coords[0]];
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Create a direct (straight-line) route between points
 */
const createDirectRoute = (start, end, isMountainous = false) => {
  // Handle invalid coordinates
  if (!start || !end || !Array.isArray(start) || !Array.isArray(end) ||
      start.length !== 2 || end.length !== 2 ||
      typeof start[0] !== 'number' || typeof start[1] !== 'number' ||
      typeof end[0] !== 'number' || typeof end[1] !== 'number') {
    return {
      success: false,
      error: 'Invalid coordinates provided',
      routingMethod: 'direct'
    };
  }

  const distance = calcLocalDistance(start[0], start[1], end[0], end[1]);
  // Use slower speed estimation for mountainous terrain
  const avgSpeed = isMountainous ? 20 : 30; // km/h
  const duration = (distance / avgSpeed) * 3600; // Convert to seconds

  return {
    success: true,
    route: [start, end],
    distance,
    duration,
    legs: [{
      distance: distance * 1000, // Convert to meters for consistency
      duration,
      steps: [{
        distance: distance * 1000,
        duration,
        instruction: `Follow direct route to destination${isMountainous ? ' (mountainous terrain)' : ''}`,
        name: isMountainous ? 'Direct mountain route' : 'Direct route',
        type: 'direct'
      }]
    }],
    directRoute: true,
    isMountainous,
    routingMethod: 'direct'
  };
};

/**
 * Calculate route using OpenRouteService
 */
const calculateORSRoute = async (start, end, options = {}) => {
  try {
    const {
      profile = 'driving-car',
      preference = 'fastest',
      units = 'km',
      language = 'en'
    } = options;

    // Format coordinates for ORS (needs [lon, lat] format)
    const coordinates = [
      [start[1], start[0]],  // Convert [lat, lon] to [lon, lat]
      [end[1], end[0]]
    ];

    const response = await axios.post(
      `${ORS_BASE_URL}/v2/directions/${profile}/geojson`,
      {
        coordinates,
        preference,
        units,
        language,
        instructions: true,
        elevation: true
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    const route = response.data;
    const coordinates_reversed = route.features[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const properties = route.features[0].properties;

    return {
      success: true,
      route: coordinates_reversed,
      distance: properties.segments[0].distance / 1000,
      duration: properties.segments[0].duration,
      ascent: properties.ascent,
      descent: properties.descent,
      legs: properties.segments.map(segment => ({
        distance: segment.distance,
        duration: segment.duration,
        steps: segment.steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.instruction,
          name: step.name || '',
          type: step.type
        }))
      }))
    };
  } catch (error) {
    console.error('[ORS] Route calculation failed:', error);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
};

/**
 * Calculate route using OSRM
 */
const calculateOSRMRoute = async (start, end, options = {}) => {
  const {
    profile = 'driving',
    alternatives = true,
    steps = true,
    annotations = true,
    geometries = 'geojson',
    overview = 'full',
    radiuses = '2000;2000'
  } = options;

  // Format coordinates for OSRM
  const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const params = new URLSearchParams({
    alternatives: alternatives.toString(),
    steps: steps.toString(),
    annotations: annotations.toString(),
    geometries,
    overview,
    radiuses,
    gaps: 'split'
  });

  for (const server of OSRM_SERVERS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(
        `${server}/route/v1/${profile}/${coordinates}?${params}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const result = await response.json();
      if (!result.routes?.length) continue;

      const mainRoute = result.routes[0];
      return {
        success: true,
        route: mainRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
        distance: mainRoute.distance / 1000,
        duration: mainRoute.duration,
        legs: mainRoute.legs.map(leg => ({
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps.map(step => ({
            distance: step.distance,
            duration: step.duration,
            name: step.name || 'Unnamed road',
            instruction: step.maneuver.instruction
          }))
        })),
        alternatives: result.routes.slice(1).map(alt => ({
          route: alt.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
          distance: alt.distance / 1000,
          duration: alt.duration
        }))
      };
    } catch (error) {
      console.warn(`[OSRM] Failed with server ${server}:`, error);
      continue;
    }
  }

  return { success: false, error: 'All OSRM servers failed' };
};

/**
 * Calculate route between two points with smart fallback strategies
 */
const calculateRoute = async (start, end, options = {}) => {
  try {
    console.log('[Routing] Starting route calculation:', { start, end, options });

    // Input validation
    if (!start || !end || !Array.isArray(start) || !Array.isArray(end) || 
        start.length !== 2 || end.length !== 2 ||
        typeof start[0] !== 'number' || typeof start[1] !== 'number' ||
        typeof end[0] !== 'number' || typeof end[1] !== 'number') {
      throw new Error('Invalid coordinates provided for route calculation');
    }

    // Try OpenRouteService first if API key is available
    if (validateApiKey()) {
      console.log('[Routing] Trying OpenRouteService...');
      try {
        const orsResult = await calculateORSRoute(start, end, options);
        if (orsResult.success) {
          return {
            ...orsResult,
            routingMethod: 'ors'
          };
        }
      } catch (error) {
        console.error('[ORS] Route calculation failed:', error);
      }
    }

    // Try OSRM as a fallback
    console.log('[Routing] Trying OSRM...');
    try {
      const osrmResult = await calculateOSRMRoute(start, end, options);
      if (osrmResult.success) {
        console.log('[Routing] OSRM route found');
        return {
          ...osrmResult,
          routingMethod: 'osrm'
        };
      }
    } catch (error) {
      console.error('[OSRM] Route calculation failed:', error);
    }

    // If both services fail or are unavailable, fall back to direct route
    console.log('[Routing] Falling back to direct route');
    return {
      ...createDirectRoute(start, end, options.isMountainous),
      routingMethod: 'direct'
    };

  } catch (error) {
    console.error('[Routing] Error calculating route:', error);
    return createDirectRoute(start, end, options.isMountainous);
  }
};

/**
 * Find nearest facilities to a point
 */
const findNearestFacilities = (point, facilities, options = {}) => {
  const {
    maxDistance = 20,
    limit = 10,
    filterByType = null,
    sortBy = 'distance'
  } = options;

  let results = facilities
    .map(facility => ({
      ...facility,
      distance: calculateDistance(point[0], point[1], facility.lat, facility.lng)
    }))
    .filter(f => f.distance <= maxDistance);

  // Apply type filter if specified
  if (filterByType) {
    results = results.filter(f => f.type === filterByType);
  }

  // Sort based on criteria
  switch (sortBy) {
    case 'distance':
      results.sort((a, b) => a.distance - b.distance);
      break;
    case 'rating':
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'emergency':
      results.sort((a, b) => {
        if (a.emergency === b.emergency) return a.distance - b.distance;
        return b.emergency ? 1 : -1;
      });
      break;
  }

  return results.slice(0, limit);
};

/**
 * Find the nearest road point using locally cached GeoJSON data
 * @param {Array} point [lat, lng]
 * @param {Object} roadData GeoJSON road data
 * @param {Number} maxDistance Maximum search distance in km
 * @returns {Object} Result with success status and point
 */
const findNearestRoadPointLocally = (point, roadData, maxDistance = 20) => {
  console.log('Trying to find nearest road point locally:', point);
  
  if (!roadData || !roadData.features || roadData.features.length === 0) {
    console.warn('No road data available for local snapping');
    return { success: false, point: point, error: 'No road data available' };
  }
  
  let closestPoint = null;
  let minDistance = Infinity;
  
  // Iterate through all road features
  for (const feature of roadData.features) {
    if (feature.geometry && feature.geometry.type === 'LineString') {
      const { point: nearestOnRoad, distance } = findClosestPointOnLine(point, feature.geometry.coordinates);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = nearestOnRoad;
        
        // If we found a very close point, we can stop early
        if (distance < 0.1) { // 100 meters
          break;
        }
      }
    }
  }
  
  console.log('Local road snapping result:', { 
    original: point, 
    snapped: closestPoint, 
    distance: minDistance 
  });
  
  if (closestPoint && minDistance <= maxDistance) {
    return { 
      success: true, 
      point: closestPoint, 
      radius: minDistance * 1000, // Convert to meters
      localSnapping: true
    };
  } else {
    return { 
      success: false, 
      point: point, 
      error: `No road found within ${maxDistance}km` 
    };
  }
};

/**
 * Find nearest major road or intersection
 * @param {Array} point [lat, lng]
 * @param {Number} radius Search radius in meters
 * @returns {Promise<Object>} Nearest road point
 */
const findNearestMajorRoad = async (point, initialRadius = 1000) => {
  const maxRadius = 20000; // 20km max search radius
  let currentRadius = initialRadius;
  
  while (currentRadius <= maxRadius) {
    try {
      // Overpass query to find nearest major road
      const query = `
        [out:json][timeout:25];
        (
          way(around:${currentRadius},${point[0]},${point[1]})["highway"~"^(motorway|trunk|primary|secondary)$"];
          way(around:${currentRadius},${point[0]},${point[1]})["ref"~"^(NH|SH)"]; // National and State highways
        );
        (._;>;);
        out body;
      `;

      console.log(`Searching for major roads within ${currentRadius}m radius`);
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error('Failed to fetch road data');
      }

      const data = await response.json();
      
      if (data.elements && data.elements.length > 0) {
        // Extract nodes and ways
        const nodes = new Map();
        const ways = [];
        
        data.elements.forEach(element => {
          if (element.type === 'node') {
            nodes.set(element.id, [element.lat, element.lon]);
          } else if (element.type === 'way') {
            ways.push(element);
          }
        });

        // Find the closest point on any of the roads
        let closestPoint = null;
        let minDistance = Infinity;
        
        ways.forEach(way => {
          const wayPoints = way.nodes.map(nodeId => nodes.get(nodeId)).filter(Boolean);
          
          for (let i = 0; i < wayPoints.length - 1; i++) {
            const p1 = wayPoints[i];
            const p2 = wayPoints[i + 1];
            
            const projected = projectPointOnLineSegment(point, p1, p2);
            const distance = calculateDistance(point[0], point[1], projected[0], projected[1]);
            
            if (distance < minDistance) {
              minDistance = distance;
              closestPoint = projected;
            }
          }
        });

        if (closestPoint) {
          return {
            success: true,
            point: closestPoint,
            distance: minDistance * 1000, // Convert to meters
            roadType: 'major'
          };
        }
      }
      
      // If no roads found, increase search radius
      currentRadius *= 2;
      
    } catch (error) {
      console.warn(`Error finding major roads at radius ${currentRadius}m:`, error);
      currentRadius *= 2;
    }
  }
  
  return { success: false };
};

/**
 * Project a point onto a line segment
 * @param {Array} p [lat, lng] - The point to project
 * @param {Array} v [lat, lng] - First endpoint of line segment
 * @param {Array} w [lat, lng] - Second endpoint of line segment
 * @returns {Array} [lat, lng] - Projected point
 */
const projectPointOnLineSegment = (p, v, w) => {
  // Convert to Cartesian for the math (rough approximation)
  const vx = v[1] * Math.cos(v[0] * Math.PI / 180) * 111.32;
  const vy = v[0] * 111.32;
  const wx = w[1] * Math.cos(w[0] * Math.PI / 180) * 111.32;
  const wy = w[0] * 111.32;
  const px = p[1] * Math.cos(p[0] * Math.PI / 180) * 111.32;
  const py = p[0] * 111.32;
  
  // Calculate the line segment length squared
  const l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
  
  // If segment is just a point, return v
  if (l2 === 0) return v;
  
  // Calculate projection ratio (0 to 1 if on segment)
  const t = Math.max(0, Math.min(1, ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2));
  
  // Calculate the projection point
  const projx = vx + t * (wx - vx);
  const projy = vy + t * (wy - vy);
  
  // Convert back to [lat, lng]
  return [
    projy / 111.32,
    projx / (111.32 * Math.cos(projy / 111.32 * Math.PI / 180))
  ];
};

/**
 * Fetch major road networks (National Highways) in the region
 * @param {Array} bounds [[south, west], [north, east]]
 * @returns {Promise} GeoJSON of major roads
 */
const fetchMajorRoads = async (bounds) => {
  try {
    console.log('Fetching major roads within bounds:', bounds);
    
    // Overpass API query for major roads (NH and SH)
    const query = `
      [out:json][timeout:90];
      area["name"="Himachal Pradesh"]["admin_level"="4"]->.hp;
      (
        way(area.hp)["highway"="trunk"];
        way(area.hp)["highway"="primary"];
        way(area.hp)["highway"="secondary"];
        way(area.hp)["highway"="tertiary"];
        way(area.hp)["ref"~"NH.*"];
        way(area.hp)["ref"~"SH.*"];
      );
      (._;>;);
      out body;
    `;

    console.log('Sending Overpass query:', query);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch major roads:', errorText);
      throw new Error('Failed to fetch major roads');
    }

    const data = await response.json();
    console.log('Received road data:', data);
    
    if (!data.elements || data.elements.length === 0) {
      console.warn('No road data found');
      return {
        type: 'FeatureCollection',
        features: []
      };
    }
    
    // Convert OSM data to GeoJSON
    const features = [];
    const nodes = new Map();
    
    // First, collect all nodes
    data.elements.forEach(element => {
      if (element.type === 'node') {
        nodes.set(element.id, [element.lon, element.lat]);
      }
    });
    
    // Then create line features for ways
    data.elements.forEach(element => {
      if (element.type === 'way' && element.tags && element.nodes) {
        const coordinates = element.nodes
          .map(nodeId => nodes.get(nodeId))
          .filter(coord => coord !== undefined);
          
        if (coordinates.length >= 2) {
          const roadType = element.tags.highway || 'unknown';
          const ref = element.tags.ref || '';
          const isNationalHighway = ref.startsWith('NH');
          
          features.push({
            type: 'Feature',
            properties: {
              id: element.id,
              highway: roadType,
              name: element.tags.name || element.tags.ref || 'Unnamed Road',
              ref: ref,
              type: isNationalHighway ? 'national_highway' : 'state_highway',
              importance: roadType === 'trunk' ? 1 : 
                         roadType === 'primary' ? 2 : 
                         roadType === 'secondary' ? 3 : 
                         roadType === 'tertiary' ? 4 : 5
            },
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          });
        }
      }
    });
    
    const geojson = {
      type: 'FeatureCollection',
      features: features.sort((a, b) => a.properties.importance - b.properties.importance)
    };
    
    console.log('Converted to GeoJSON:', geojson);
    
    // Cache the road data for local snapping
    cachedRoadData = geojson;
    
    return geojson;
  } catch (error) {
    console.error('Error fetching major roads:', error);
    // Return empty feature collection instead of throwing
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
};

// Single export statement at the end
export {
  calculateRoute,
  findNearestFacilities,
  calculateDistance,
  fetchMajorRoads,
  findNearestMajorRoad,
  findNearestRoadPointLocally
}; 