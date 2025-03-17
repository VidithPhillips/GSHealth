import { overpassApi } from './osm';

/**
 * Fetch healthcare facilities from OpenStreetMap
 * @returns {Promise<Array>} Array of healthcare facilities
 */
export const fetchHealthcareFacilities = async () => {
  try {
    // Himachal Pradesh bounding box
    const bbox = {
      south: 30.3868,
      west: 75.5762,
      north: 33.2569,
      east: 79.0538
    };

    // Overpass query for healthcare facilities
    const query = `
      [out:json][timeout:25];
      area["name:en"="Himachal Pradesh"]->.searchArea;
      (
        // Primary Healthcare
        nwr["amenity"="clinic"](area.searchArea);
        nwr["healthcare"="centre"](area.searchArea);
        nwr["healthcare"="health_post"](area.searchArea);
        
        // Secondary Healthcare
        nwr["amenity"="hospital"]["healthcare"!="tertiary"](area.searchArea);
        
        // Tertiary Healthcare
        nwr["amenity"="hospital"]["healthcare"="tertiary"](area.searchArea);
      );
      out body;
      >;
      out skel qt;
    `;

    const response = await overpassApi(query);
    
    if (!response.ok) {
      throw new Error('Failed to fetch healthcare facilities');
    }

    const data = await response.json();
    
    // Process and categorize facilities
    const facilities = data.elements
      .filter(element => element.type === 'node' || element.type === 'way')
      .map(element => {
        const tags = element.tags || {};
        
        // Determine facility type
        let type = 'Primary';
        if (tags.healthcare === 'tertiary' || tags.emergency === 'yes') {
          type = 'Tertiary';
        } else if (tags.amenity === 'hospital') {
          type = 'Secondary';
        }

        // Extract specialties
        const specialties = [];
        if (tags.healthcare_speciality) {
          specialties.push(...tags.healthcare_speciality.split(';'));
        }
        if (tags.emergency === 'yes') specialties.push('Emergency');
        if (tags.surgery === 'yes') specialties.push('Surgery');
        if (tags.maternity === 'yes') specialties.push('Maternity');

        // Get coordinates
        let lat, lng;
        if (element.type === 'node') {
          lat = element.lat;
          lng = element.lon;
        } else if (element.type === 'way' && element.center) {
          lat = element.center.lat;
          lng = element.center.lon;
        }

        // Only include facilities with valid coordinates
        if (!lat || !lng) return null;

        return {
          id: element.id.toString(),
          name: tags.name || tags['name:en'] || 'Unnamed Facility',
          type,
          lat,
          lng,
          specialties: specialties.length > 0 ? specialties : ['General'],
          address: tags['addr:full'] || tags['addr:street'] || '',
          phone: tags.phone || tags['contact:phone'] || '',
          emergency: tags.emergency === 'yes',
          wheelchair: tags.wheelchair === 'yes',
          beds: parseInt(tags.beds) || null,
          opening_hours: tags.opening_hours || '24/7'
        };
      })
      .filter(facility => facility !== null);

    return facilities;
  } catch (error) {
    console.error('Error fetching healthcare facilities:', error);
    throw error;
  }
};

/**
 * Calculate facility statistics
 * @param {Array} facilities List of healthcare facilities
 * @returns {Object} Statistics about the facilities
 */
export const calculateFacilityStats = (facilities) => {
  const stats = {
    total: facilities.length,
    byType: {
      Primary: 0,
      Secondary: 0,
      Tertiary: 0
    },
    specialties: new Set(),
    emergency: 0,
    wheelchair: 0
  };

  facilities.forEach(facility => {
    stats.byType[facility.type]++;
    facility.specialties.forEach(specialty => stats.specialties.add(specialty));
    if (facility.emergency) stats.emergency++;
    if (facility.wheelchair) stats.wheelchair++;
  });

  return {
    ...stats,
    specialties: Array.from(stats.specialties)
  };
};

export default {
  fetchHealthcareFacilities,
  calculateFacilityStats
}; 