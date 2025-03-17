// OpenStreetMap data fetching service using Overpass API
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Bounding box for Himachal Pradesh
const HP_BOUNDS = {
  south: 30.3868,
  north: 33.2489,
  west: 75.5941,
  east: 79.0503
};

/**
 * Fetch healthcare facilities from OpenStreetMap
 * @returns {Promise} Array of healthcare facilities
 */
export const fetchHealthcareFacilities = async () => {
  // Overpass QL query for healthcare facilities
  const query = `
    [out:json][timeout:25];
    area["name:en"="Himachal Pradesh"]->.searchArea;
    (
      // Hospitals
      node["amenity"="hospital"](area.searchArea);
      way["amenity"="hospital"](area.searchArea);
      relation["amenity"="hospital"](area.searchArea);
      
      // Clinics
      node["amenity"="clinic"](area.searchArea);
      way["amenity"="clinic"](area.searchArea);
      
      // Healthcare centres
      node["healthcare"="centre"](area.searchArea);
      way["healthcare"="centre"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OSM data');
    }

    const data = await response.json();
    
    // Transform OSM data to our application format
    return data.elements
      .filter(element => element.type === 'node') // Only use nodes for now
      .map(facility => ({
        id: facility.id,
        name: facility.tags.name || 'Unnamed Facility',
        type: determineType(facility.tags),
        lat: facility.lat,
        lng: facility.lon,
        address: formatAddress(facility.tags),
        phone: facility.tags.phone || 'N/A',
        specialties: determineSpecialties(facility.tags),
        amenity: facility.tags.amenity,
        healthcare: facility.tags.healthcare,
        operator: facility.tags.operator,
        source: 'OpenStreetMap'
      }));
  } catch (error) {
    console.error('Error fetching healthcare facilities:', error);
    return [];
  }
};

/**
 * Determine facility type based on OSM tags
 */
const determineType = (tags) => {
  if (tags.healthcare === 'hospital' || tags.amenity === 'hospital') {
    if (tags.emergency === 'yes') return 'Tertiary';
    return 'Secondary';
  }
  if (tags.healthcare === 'centre' || tags.amenity === 'clinic') {
    return 'Primary';
  }
  return 'Primary'; // Default to primary if unclear
};

/**
 * Format address from OSM tags
 */
const formatAddress = (tags) => {
  const parts = [];
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:district']) parts.push(tags['addr:district']);
  parts.push('Himachal Pradesh');
  return parts.join(', ') || 'Address not available';
};

/**
 * Determine specialties based on OSM tags
 */
const determineSpecialties = (tags) => {
  const specialties = new Set();
  
  // Add specialties based on healthcare:speciality tag
  if (tags['healthcare:speciality']) {
    tags['healthcare:speciality'].split(';').forEach(s => specialties.add(s.trim()));
  }

  // Add emergency if available
  if (tags.emergency === 'yes') {
    specialties.add('Emergency Care');
  }

  // Add basic specialties based on facility type
  if (tags.healthcare === 'hospital' || tags.amenity === 'hospital') {
    specialties.add('General Medicine');
  }

  return Array.from(specialties).length > 0 ? 
    Array.from(specialties) : 
    ['General Medicine'];
};

export default {
  fetchHealthcareFacilities
}; 