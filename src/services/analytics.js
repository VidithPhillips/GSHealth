import { fetchHealthcareFacilities } from './osm';

// Population data for Himachal Pradesh districts (2011 census, in millions)
const DISTRICT_POPULATION = {
  'Shimla': 0.814,
  'Kangra': 1.510,
  'Mandi': 0.999,
  'Solan': 0.580,
  'Kullu': 0.438,
  'Una': 0.521,
  'Sirmaur': 0.529,
  'Bilaspur': 0.382,
  'Hamirpur': 0.454,
  'Chamba': 0.519,
  'Kinnaur': 0.084,
  'Lahaul and Spiti': 0.031,
};

const TOTAL_POPULATION = Object.values(DISTRICT_POPULATION).reduce((a, b) => a + b, 0);

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
 * Calculate analytics based on real facility data
 */
export const calculateAnalytics = async () => {
  const facilities = await fetchHealthcareFacilities();
  
  // Count facilities by type
  const totalFacilities = {
    primary: facilities.filter(f => f.type === 'Primary').length,
    secondary: facilities.filter(f => f.type === 'Secondary').length,
    tertiary: facilities.filter(f => f.type === 'Tertiary').length,
  };

  // Calculate facility density
  const totalFacilitiesCount = Object.values(totalFacilities).reduce((a, b) => a + b, 0);
  const facilityDensity = {
    overallPerMillion: (totalFacilitiesCount / TOTAL_POPULATION).toFixed(1),
    primaryPerMillion: (totalFacilities.primary / TOTAL_POPULATION).toFixed(1),
    secondaryPerMillion: (totalFacilities.secondary / TOTAL_POPULATION).toFixed(1),
    tertiaryPerMillion: (totalFacilities.tertiary / TOTAL_POPULATION).toFixed(1),
  };

  // Collect all specialties
  const allSpecialties = new Set();
  facilities.forEach(facility => {
    facility.specialties.forEach(specialty => allSpecialties.add(specialty));
  });

  // Calculate specialty coverage
  const specialtyCoverage = Array.from(allSpecialties).map(specialty => {
    const facilitiesWithSpecialty = facilities.filter(f => 
      f.specialties.includes(specialty)
    ).length;
    return {
      name: specialty,
      coverage: Math.round((facilitiesWithSpecialty / totalFacilitiesCount) * 100)
    };
  }).sort((a, b) => b.coverage - a.coverage);

  // Calculate district-wise accessibility scores
  const regionalAccessibility = Object.keys(DISTRICT_POPULATION).map(district => {
    // Simple scoring based on facilities per capita and distribution
    const districtFacilities = facilities.filter(f => 
      f.address.toLowerCase().includes(district.toLowerCase())
    );
    
    const facilitiesPerCapita = districtFacilities.length / DISTRICT_POPULATION[district];
    const hasEmergencyCare = districtFacilities.some(f => 
      f.specialties.includes('Emergency Care')
    );
    const hasTertiaryCare = districtFacilities.some(f => f.type === 'Tertiary');
    
    let accessScore = Math.min(
      Math.round(
        (facilitiesPerCapita * 50) + // Facilities per capita (50% weight)
        (hasEmergencyCare ? 25 : 0) + // Emergency care availability (25% weight)
        (hasTertiaryCare ? 25 : 0)    // Tertiary care availability (25% weight)
      ),
      100
    );

    return {
      district,
      accessScore
    };
  }).sort((a, b) => b.accessScore - a.accessScore);

  // Estimate population coverage based on facility distribution
  const populationCoverage = {
    within5km: 0,
    within10km: 0,
    within20km: 0,
    beyond20km: 0
  };

  // Simple estimation based on facility distribution and population density
  const coverageEstimate = Math.min(
    Math.round((totalFacilitiesCount / TOTAL_POPULATION) * 100),
    100
  );
  populationCoverage.within5km = Math.round(coverageEstimate * 0.4);
  populationCoverage.within10km = Math.round(coverageEstimate * 0.7);
  populationCoverage.within20km = Math.round(coverageEstimate * 0.9);
  populationCoverage.beyond20km = 100 - populationCoverage.within20km;

  // Estimate response times based on facility distribution
  const responseTime = {
    urban: Math.round(30 / (totalFacilities.tertiary + 1) + 10),
    semiUrban: Math.round(45 / (totalFacilities.secondary + 1) + 20),
    rural: Math.round(60 / (totalFacilities.primary + 1) + 30),
    remote: Math.round(90 / (totalFacilitiesCount + 1) + 45)
  };

  return {
    totalFacilities,
    populationCoverage,
    responseTime,
    facilityDensity,
    specialtyCoverage,
    regionalAccessibility
  };
};

export default {
  calculateAnalytics
}; 