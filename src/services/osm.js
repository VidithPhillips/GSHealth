// OpenStreetMap data fetching service using Overpass API
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Bounding box for Himachal Pradesh
const HP_BOUNDS = {
  south: 30.3868,
  north: 33.2569,
  west: 75.5762,
  east: 79.0787
};

// Enable this to use default facilities instead of actual API data (for debugging)
const USE_DEFAULT_FACILITIES = false;

/**
 * Fetch healthcare facilities from OpenStreetMap
 * @returns {Promise} Array of healthcare facilities
 */
export const fetchHealthcareFacilities = async () => {
  console.log('[OSM] Starting fetchHealthcareFacilities');
  
  if (USE_DEFAULT_FACILITIES) {
    console.log('[OSM] Using default facilities (debug mode)');
    return getDefaultFacilities();
  }
  
  try {
    // Updated query to ensure we get facilities
    const query = `
      [out:json][timeout:60];
      area["name"="Himachal Pradesh"]["admin_level"="4"]->.searchArea;
      (
        // Hospitals and clinics
        nwr["amenity"="hospital"](area.searchArea);
        nwr["healthcare"="hospital"](area.searchArea);
        nwr["amenity"="clinic"](area.searchArea);
        nwr["healthcare"="clinic"](area.searchArea);
        
        // Doctors and medical centers
        nwr["healthcare"="doctor"](area.searchArea);
        nwr["amenity"="doctors"](area.searchArea);
        nwr["healthcare"="centre"](area.searchArea);
        
        // Pharmacies
        nwr["amenity"="pharmacy"](area.searchArea);
        nwr["healthcare"="pharmacy"](area.searchArea);
      );
      out body center qt;
    `;

    console.log('[OSM] Sending query to Overpass API');

    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      console.error('[OSM] API response not OK:', response.status, response.statusText);
      throw new Error(`Failed to fetch facilities: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`[OSM] Received ${data?.elements?.length || 0} raw elements from API`);
    
    if (!data.elements || data.elements.length === 0) {
      console.warn('[OSM] No facilities found in API response');
      return getDefaultFacilities();
    }

    // Process and validate facilities
    const facilitiesMap = new Map();
    
    data.elements.forEach(element => {
      try {
        const tags = element.tags || {};
        
        // Skip elements without essential data
        if (!tags.name && !tags.operator && !tags.amenity && !tags.healthcare) {
          console.log(`[OSM] Skipping unnamed element:`, element.id);
          return;
        }

        // Get coordinates
        const lat = element.type === 'node' ? element.lat : element.center?.lat;
        const lon = element.type === 'node' ? element.lon : element.center?.lon;

        if (!isValidCoordinate(lat, lon)) {
          console.warn(`[OSM] Invalid coordinates for element ${element.id}:`, { lat, lon });
          return;
        }

        // Create facility object
        const name = tags.name || tags.operator || `${tags.amenity || tags.healthcare} ${element.id}`;
        const type = determineFacilityType(tags);
        
        if (!type) {
          console.log(`[OSM] Could not determine type for:`, name);
          return;
        }

        const facility = {
          id: element.id,
          name: name,
          type: type,
          lat: lat,
          lng: lon,
          address: formatAddress(tags),
          phone: tags.phone || tags['contact:phone'] || 'N/A',
          emergency: tags.emergency === 'yes',
          wheelchair: tags.wheelchair,
          specialties: determineSpecialties(tags),
          originalTags: tags
        };

        facilitiesMap.set(element.id, facility);
        console.log(`[OSM] Added facility: ${name} (${type}) at [${lat}, ${lon}]`);

      } catch (err) {
        console.error(`[OSM] Error processing element ${element.id}:`, err);
      }
    });

    const facilities = Array.from(facilitiesMap.values());
    
    console.log('[OSM] Facility statistics:', {
      total: facilities.length,
      byType: facilities.reduce((acc, f) => {
        acc[f.type] = (acc[f.type] || 0) + 1;
        return acc;
      }, {}),
      sample: facilities.slice(0, 2)
    });

    if (facilities.length === 0) {
      console.warn('[OSM] No valid facilities found, using defaults');
      return getDefaultFacilities();
    }

    return facilities;

  } catch (error) {
    console.error('[OSM] Error fetching facilities:', error);
    return getDefaultFacilities();
  }
};

/**
 * Generate a default name based on facility type
 */
const getDefaultName = (tags = {}) => {
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'Unnamed Hospital';
  if (tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'Unnamed Clinic';
  if (tags.amenity === 'pharmacy' || tags.healthcare === 'pharmacy') return 'Unnamed Pharmacy';
  if (tags.healthcare === 'dentist' || tags.amenity === 'dentist') return 'Unnamed Dental Clinic';
  if (tags.healthcare === 'doctor') return 'Unnamed Doctor\'s Office';
  return 'Unnamed Healthcare Facility';
};

/**
 * Determine the type of healthcare facility based on OSM tags
 */
const determineFacilityType = (tags = {}) => {
  try {
    // Emergency hospitals are always tertiary
    if (tags.emergency === 'yes' && 
        (tags.healthcare === 'hospital' || tags.amenity === 'hospital')) {
      return 'Tertiary';
    }

    // Classify hospitals
    if (tags.healthcare === 'hospital' || tags.amenity === 'hospital') {
      // Check for secondary indicators
      if (tags.beds && parseInt(tags.beds) > 50) return 'Secondary';
      if (tags.facility_type === 'secondary') return 'Secondary';
      return 'Primary';
    }

    // All other healthcare facilities are primary
    if (tags.healthcare || 
        tags.amenity === 'clinic' || 
        tags.amenity === 'doctors' ||
        tags.amenity === 'pharmacy') {
      return 'Primary';
    }

    // If no clear type can be determined, return null
    return null;
  } catch (err) {
    console.error('Error determining facility type:', err);
    return null;
  }
};

/**
 * Format the address from OSM tags
 */
const formatAddress = (tags = {}) => {
  try {
    const parts = [];
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:state']) parts.push(tags['addr:state']);
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  } catch (err) {
    console.error('Error formatting address:', err);
    return 'Address not available';
  }
};

/**
 * Determine specialties based on OSM tags
 */
const determineSpecialties = (tags = {}) => {
  try {
    const specialties = [];
    if (tags.emergency === 'yes') specialties.push('Emergency');
    if (tags.healthcare_speciality) specialties.push(...tags.healthcare_speciality.split(';'));
    return specialties;
  } catch (err) {
    console.error('Error determining specialties:', err);
    return ['General Medicine'];
  }
};

/**
 * Provide default facilities for testing and fallback
 */
const getDefaultFacilities = () => {
  console.log('[OSM] Using default facilities as fallback');
  return [
    {
      id: 'default1',
      name: 'Regional Hospital Shimla',
      type: 'Tertiary',
      lat: 31.1048,
      lng: 77.1734,
      address: 'Shimla, Himachal Pradesh',
      phone: '+91 123-456-7890',
      emergency: true,
      wheelchair: 'yes',
      specialties: ['Emergency Care', 'Surgery', 'Cardiology', 'Pediatrics']
    },
    {
      id: 'default2',
      name: 'District Clinic Dharamshala',
      type: 'Secondary',
      lat: 32.2143,
      lng: 76.3196,
      address: 'Dharamshala, Himachal Pradesh',
      phone: '+91 123-456-7891',
      emergency: false,
      wheelchair: 'limited',
      specialties: ['General Medicine', 'Orthopedics']
    },
    {
      id: 'default3',
      name: 'Community Health Center Manali',
      type: 'Primary',
      lat: 32.2396,
      lng: 77.1887,
      address: 'Manali, Himachal Pradesh',
      phone: '+91 123-456-7892',
      emergency: false,
      wheelchair: 'no',
      specialties: ['General Medicine', 'Vaccination']
    },
    {
      id: 'default4',
      name: 'Hill View Pharmacy',
      type: 'Primary',
      lat: 31.0893,
      lng: 77.1835,
      address: 'Shimla, Himachal Pradesh',
      phone: '+91 123-456-7893',
      emergency: false,
      wheelchair: 'yes',
      specialties: ['Pharmacy', 'General Medicine']
    },
    {
      id: 'default5',
      name: 'Mountain Emergency Hospital',
      type: 'Tertiary',
      lat: 31.6340,
      lng: 77.1166,
      address: 'Rampur, Himachal Pradesh',
      phone: '+91 123-456-7894',
      emergency: true,
      wheelchair: 'yes',
      specialties: ['Emergency Care', 'Trauma Care', 'Surgery']
    }
  ];
};

/**
 * Make a request to the Overpass API
 * @param {string} query - Overpass QL query
 * @returns {Promise} - Response from the Overpass API
 */
export const overpassApi = async (query) => {
  try {
    return await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });
  } catch (error) {
    console.error('[OSM] Overpass API error:', error);
    throw error;
  }
};

// Helper function to validate coordinates
function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' && 
    typeof lon === 'number' && 
    !isNaN(lat) && 
    !isNaN(lon) && 
    lat >= -90 && 
    lat <= 90 && 
    lon >= -180 && 
    lon <= 180
  );
}

// Helper function to validate facility object
function isValidFacility(facility) {
  return facility && 
         isValidCoordinate(facility.lat, facility.lng) &&
         facility.name && 
         facility.type && 
         ['Primary', 'Secondary', 'Tertiary'].includes(facility.type);
}

export default {
  fetchHealthcareFacilities,
  overpassApi
}; 