import { jest } from '@jest/globals';
import { calculateRoute, findNearestFacilities, calculateDistance } from './routing';
import axios from 'axios';

// Mock axios
jest.mock('axios');

describe('Routing Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock response for axios
    axios.post.mockResolvedValue({
      data: {
        routes: [{
          segments: [{
            distance: 126200, // 126.2 km in meters
            duration: 7200,   // 2 hours in seconds
            steps: []
          }],
          geometry: {
            coordinates: [
              [77.1734, 31.1048],
              [77.1887, 32.2396]
            ]
          }
        }]
      }
    });

    // Mock fetch for OSRM
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          routes: [{
            distance: 126200, // 126.2 km in meters
            duration: 7200,   // 2 hours in seconds
            geometry: {
              coordinates: [
                [77.1734, 31.1048],
                [77.1887, 32.2396]
              ]
            },
            legs: [{
              distance: 126200,
              duration: 7200,
              steps: []
            }]
          }]
        })
      })
    );
  });

  // Test coordinate calculation
  test('calculateDistance returns correct distance', () => {
    // Shimla to Manali coordinates (approximate)
    const distance = calculateDistance(31.1048, 77.1734, 32.2396, 77.1887);
    expect(distance).toBeCloseTo(126.2, 1); // Should be around 126.2 km
  });

  // Test facility finding
  test('findNearestFacilities returns sorted facilities', () => {
    const point = [31.1048, 77.1734]; // Shimla
    const facilities = [
      { name: 'Hospital A', lat: 31.1050, lng: 77.1736, type: 'hospital' },
      { name: 'Clinic B', lat: 31.1060, lng: 77.1740, type: 'clinic' },
      { name: 'Hospital C', lat: 31.1100, lng: 77.1800, type: 'hospital' }
    ];

    const result = findNearestFacilities(point, facilities, {
      maxDistance: 20,
      limit: 2,
      filterByType: 'hospital'
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Hospital A'); // Closest
    expect(result[0].distance).toBeLessThan(result[1].distance);
  });

  // Test route calculation
  test('calculateRoute returns valid route', async () => {
    const start = [31.1048, 77.1734]; // Shimla
    const end = [32.2396, 77.1887]; // Manali

    const result = await calculateRoute(start, end);

    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('route');
    expect(result).toHaveProperty('distance');
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('routingMethod');

    // Route should be an array of coordinates
    expect(Array.isArray(result.route)).toBe(true);
    expect(result.route.length).toBeGreaterThan(1);

    // First and last points should be close to start and end
    expect(result.route[0][0]).toBeCloseTo(start[0], 4);
    expect(result.route[0][1]).toBeCloseTo(start[1], 4);
    expect(result.route[result.route.length - 1][0]).toBeCloseTo(end[0], 4);
    expect(result.route[result.route.length - 1][1]).toBeCloseTo(end[1], 4);

    // Distance should be reasonable (126.2km +/- 1km)
    expect(result.distance).toBeCloseTo(126.2, 1);
  });

  // Test error handling
  test('calculateRoute handles invalid coordinates', async () => {
    const invalidStart = null;
    const invalidEnd = [32.2396]; // Missing longitude

    const result = await calculateRoute(invalidStart, invalidEnd);

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('error');
    expect(result.routingMethod).toBe('direct');
  });

  // Test API key validation
  test('calculateRoute handles missing API key', async () => {
    // Temporarily remove API key from environment
    const originalKey = process.env.VITE_ORS_API_KEY;
    delete process.env.VITE_ORS_API_KEY;

    // Mock OSRM to fail
    global.fetch = jest.fn(() => Promise.reject(new Error('OSRM Error')));

    const start = [31.1048, 77.1734];
    const end = [32.2396, 77.1887];

    const result = await calculateRoute(start, end);

    expect(result.routingMethod).toBe('direct');

    // Restore API key
    process.env.VITE_ORS_API_KEY = originalKey;
  });

  // Test API error handling
  test('calculateRoute handles API errors', async () => {
    // Mock API errors
    axios.post.mockRejectedValueOnce(new Error('API Error'));
    global.fetch = jest.fn(() => Promise.reject(new Error('OSRM Error')));

    const start = [31.1048, 77.1734];
    const end = [32.2396, 77.1887];

    const result = await calculateRoute(start, end);

    expect(result.routingMethod).toBe('direct');
  });
}); 