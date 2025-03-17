import axios from 'axios';

/**
 * Finds the nearest node in the road network to a given point
 * @param {Array} point [lat, lon] coordinates
 * @param {Object} options Optional parameters
 * @returns {Object} Nearest node with its coordinates and metadata
 */
export const findNearestNode = async (point, options = {}) => {
  const [lat, lon] = point;
  const maxDistance = options.maxDistance || 10; // km
  const radius = maxDistance * 1000; // Convert to meters

  try {
    const query = `
      [out:json][timeout:25];
      (
        way["highway"](around:${radius},${lat},${lon});
      );
      (._;>;);
      out body;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', query);
    const nodes = response.data.elements.filter(el => el.type === 'node');

    if (nodes.length === 0) {
      return {
        success: false,
        error: 'No road nodes found within the specified radius'
      };
    }

    // Find the nearest node
    const nearest = nodes.reduce((closest, node) => {
      const distance = calculateDistance(lat, lon, node.lat, node.lon);
      if (!closest || distance < closest.distance) {
        return { node, distance };
      }
      return closest;
    }, null);

    return {
      success: true,
      node: nearest.node,
      distance: nearest.distance
    };
  } catch (error) {
    console.error('Error finding nearest node:', error);
    return {
      success: false,
      error: 'Failed to find nearest node'
    };
  }
};

/**
 * Calculates the distance between two points using the Haversine formula
 * @param {number} lat1 Latitude of first point
 * @param {number} lon1 Longitude of first point
 * @param {number} lat2 Latitude of second point
 * @param {number} lon2 Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Converts degrees to radians
 * @param {number} degrees Angle in degrees
 * @returns {number} Angle in radians
 */
const toRad = (degrees) => {
  return degrees * Math.PI / 180;
}; 