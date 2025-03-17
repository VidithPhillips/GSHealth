import { fetchHealthcareFacilities, calculateFacilityStats } from './facilities';
import { calculateHaversineDistance } from './routing';

/**
 * Calculate analytics based on real facility data
 * @returns {Promise<Object>} Analytics data
 */
export const calculateAnalytics = async () => {
  try {
    // Fetch facilities data
    const facilities = await fetchHealthcareFacilities();
    const stats = calculateFacilityStats(facilities);

    // Population centers in Himachal Pradesh with 2011 census data
    const populationCenters = [
      { name: 'Shimla', lat: 31.1048, lng: 77.1734, population: 169578 },
      { name: 'Dharamshala', lat: 32.2190, lng: 76.3234, population: 136948 },
      { name: 'Mandi', lat: 31.7088, lng: 76.9320, population: 126987 },
      { name: 'Solan', lat: 30.9045, lng: 77.0967, population: 106116 },
      { name: 'Nahan', lat: 30.5623, lng: 77.2956, population: 56000 },
      { name: 'Kullu', lat: 31.9579, lng: 77.1091, population: 18536 },
      { name: 'Bilaspur', lat: 31.3397, lng: 76.7567, population: 13654 }
    ];

    // Calculate population coverage
    const totalPopulation = populationCenters.reduce((sum, center) => sum + center.population, 0);
    let within5km = 0;
    let within10km = 0;
    let within20km = 0;

    populationCenters.forEach(center => {
      const nearestFacility = facilities.reduce((nearest, facility) => {
        const distance = calculateHaversineDistance(
          center.lat,
          center.lng,
          facility.lat,
          facility.lng
        );
        return distance < nearest.distance ? { distance, type: facility.type } : nearest;
      }, { distance: Infinity, type: null });

      if (nearestFacility.distance <= 5) {
        within5km += center.population;
        within10km += center.population;
        within20km += center.population;
      } else if (nearestFacility.distance <= 10) {
        within10km += center.population;
        within20km += center.population;
      } else if (nearestFacility.distance <= 20) {
        within20km += center.population;
      }
    });

    // Calculate response times for different zones
    const zones = [
      { type: 'urban', maxTime: 15 },
      { type: 'suburban', maxTime: 25 },
      { type: 'rural', maxTime: 40 },
      { type: 'remote', maxTime: 60 }
    ];

    const responseTimes = zones.reduce((acc, zone) => {
      const facilitiesInRange = facilities.filter(f => {
        const baseTime = f.emergency ? 0.8 : 1;
        const typeMultiplier = f.type === 'Tertiary' ? 0.9 : f.type === 'Secondary' ? 1 : 1.1;
        return baseTime * typeMultiplier * zone.maxTime <= zone.maxTime;
      }).length;

      acc[zone.type] = facilitiesInRange / facilities.length;
      return acc;
    }, {});

    // Calculate facility density
    const HIMACHAL_AREA = 55673; // Area in sq km
    const HIMACHAL_POPULATION = 7500000; // Approximate population as of 2021

    const facilityDensity = {
      overallPerMillion: (facilities.length / (HIMACHAL_POPULATION / 1000000)).toFixed(2),
      primaryPerMillion: (stats.byType.Primary / (HIMACHAL_POPULATION / 1000000)).toFixed(2),
      secondaryPerMillion: (stats.byType.Secondary / (HIMACHAL_POPULATION / 1000000)).toFixed(2),
      tertiaryPerMillion: (stats.byType.Tertiary / (HIMACHAL_POPULATION / 1000000)).toFixed(2)
    };

    // Calculate specialty coverage
    const ESSENTIAL_SPECIALTIES = [
      'Emergency',
      'Surgery',
      'Maternity',
      'Pediatrics',
      'Internal Medicine',
      'Orthopedics',
      'Cardiology'
    ];

    const specialtyCoverage = ESSENTIAL_SPECIALTIES.map(specialty => {
      const facilitiesWithSpecialty = facilities.filter(f => 
        Array.isArray(f.specialties) && 
        f.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
      ).length;
      
      return {
        name: specialty,
        coverage: ((facilitiesWithSpecialty / (facilities.length || 1)) * 100).toFixed(1)
      };
    });

    // Calculate district-wise accessibility
    const districts = [
      { name: 'Shimla', lat: 31.1048, lng: 77.1734 },
      { name: 'Kangra', lat: 32.2190, lng: 76.3234 },
      { name: 'Mandi', lat: 31.7088, lng: 76.9320 },
      { name: 'Solan', lat: 30.9045, lng: 77.0967 },
      { name: 'Kullu', lat: 31.9579, lng: 77.1091 }
    ];

    const accessibility = districts.map(district => {
      const facilitiesInDistrict = facilities.filter(f => 
        calculateHaversineDistance(district.lat, district.lng, f.lat, f.lng) <= 30
      );

      const score = Math.min(100, Math.round(
        (facilitiesInDistrict.length * 20) +
        (facilitiesInDistrict.filter(f => f.emergency).length * 30) +
        (facilitiesInDistrict.filter(f => f.type === 'Tertiary').length * 25)
      ));

      return {
        district: district.name,
        accessScore: score
      };
    });

    return {
      totalFacilities: stats.byType,
      populationCoverage: {
        within5km: ((within5km / totalPopulation) * 100).toFixed(1),
        within10km: ((within10km / totalPopulation) * 100).toFixed(1),
        within20km: ((within20km / totalPopulation) * 100).toFixed(1),
        beyond20km: (100 - ((within20km / totalPopulation) * 100)).toFixed(1)
      },
      responseTimes,
      facilityDensity,
      specialtyCoverage,
      accessibility
    };
  } catch (error) {
    console.error('Error calculating analytics:', error);
    throw error;
  }
};

export default {
  calculateAnalytics
}; 