import { jest } from '@jest/globals';

// Mock environment variables
process.env.VITE_ORS_API_KEY = 'test_api_key';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      routes: [{
        geometry: {
          coordinates: [[77.1734, 31.1048], [77.1887, 32.2396]]
        },
        legs: [{
          distance: 125000,
          duration: 7200,
          steps: []
        }]
      }]
    })
  })
);

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(() =>
    Promise.resolve({
      data: {
        features: [{
          geometry: {
            coordinates: [[77.1734, 31.1048], [77.1887, 32.2396]]
          },
          properties: {
            segments: [{
              distance: 125000,
              duration: 7200,
              steps: []
            }]
          }
        }]
      }
    })
  )
})); 