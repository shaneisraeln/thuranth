import {DeliveryService} from '../DeliveryService';

// Mock the store
jest.mock('@/store', () => ({
  store: {
    getState: jest.fn(() => ({
      auth: {
        token: 'mock-token',
        user: {
          vehicleId: 'vehicle-123',
        },
      },
      offline: {
        isOnline: true,
      },
      delivery: {
        assignedParcels: [],
        completedDeliveries: [],
      },
    })),
    dispatch: jest.fn(),
  },
}));

// Mock the location service
jest.mock('../LocationService', () => ({
  LocationService: {
    getInstance: jest.fn(() => ({
      getCurrentLocation: jest.fn(() => Promise.resolve({
        latitude: 12.9716,
        longitude: 77.5946,
      })),
    })),
  },
}));

describe('DeliveryService', () => {
  let deliveryService: DeliveryService;

  beforeEach(() => {
    deliveryService = DeliveryService.getInstance();
    global.fetch = jest.fn();
    process.env.API_BASE_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateParcelStatus', () => {
    it('should update parcel status successfully when online', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn(() => Promise.resolve({})),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await deliveryService.updateParcelStatus('parcel-123', 'picked_up');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/parcels/parcel-123/status',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(deliveryService.updateParcelStatus('parcel-123', 'picked_up')).resolves.not.toThrow();
    });
  });

  describe('completeDelivery', () => {
    it('should complete delivery with proof of delivery', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn(() => Promise.resolve({})),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const completionData = {
        parcelId: 'parcel-123',
        signature: 'signature-data',
        recipientName: 'John Doe',
        notes: 'Delivered successfully',
      };

      await deliveryService.completeDelivery(completionData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/parcels/parcel-123/complete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('failDelivery', () => {
    it('should record delivery failure', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn(() => Promise.resolve({})),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const failureData = {
        parcelId: 'parcel-123',
        reason: 'recipient_unavailable',
        notes: 'No one at home',
        attemptedAt: new Date().toISOString(),
      };

      await deliveryService.failDelivery(failureData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/parcels/parcel-123/fail',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});