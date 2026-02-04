import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricsCalculatorService } from './metrics-calculator.service';
import { AnalyticsMetricEntity } from '../entities/analytics-metric.entity';
import { DailyMetricsSummaryEntity } from '../entities/daily-metrics-summary.entity';
import { 
  ConsolidationEvent, 
  VehicleUtilizationData, 
  SLAPerformanceData,
  DecisionPerformanceData,
  EmissionsCalculationParams,
} from '../interfaces/analytics.interfaces';

describe('MetricsCalculatorService', () => {
  let service: MetricsCalculatorService;
  let metricsRepository: Repository<AnalyticsMetricEntity>;
  let summaryRepository: Repository<DailyMetricsSummaryEntity>;

  const mockMetricsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSummaryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsCalculatorService,
        {
          provide: getRepositoryToken(AnalyticsMetricEntity),
          useValue: mockMetricsRepository,
        },
        {
          provide: getRepositoryToken(DailyMetricsSummaryEntity),
          useValue: mockSummaryRepository,
        },
      ],
    }).compile();

    service = module.get<MetricsCalculatorService>(MetricsCalculatorService);
    metricsRepository = module.get<Repository<AnalyticsMetricEntity>>(getRepositoryToken(AnalyticsMetricEntity));
    summaryRepository = module.get<Repository<DailyMetricsSummaryEntity>>(getRepositoryToken(DailyMetricsSummaryEntity));

    mockMetricsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordConsolidationEvent', () => {
    it('should record all consolidation metrics', async () => {
      const event: ConsolidationEvent = {
        parcelId: 'parcel-123',
        originalVehicleId: 'vehicle-456',
        consolidatedVehicleId: 'vehicle-789',
        distanceSaved: 15.5,
        fuelSaved: 2.3,
        co2Saved: 5.4,
        timestamp: new Date(),
      };

      const savedMetric = new AnalyticsMetricEntity();
      savedMetric.id = 'metric-id';

      mockMetricsRepository.create.mockReturnValue(savedMetric);
      mockMetricsRepository.save.mockResolvedValue(savedMetric);

      await service.recordConsolidationEvent(event);

      // Should create 4 metrics: vehicles_avoided, distance_saved, fuel_saved, co2_emissions_saved
      expect(mockMetricsRepository.save).toHaveBeenCalledTimes(4);
      
      // Verify vehicles_avoided metric
      expect(mockMetricsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'vehicles_avoided',
          metricType: 'counter',
          value: 1,
          unit: 'count',
          dimensions: { parcelId: event.parcelId },
        })
      );

      // Verify distance_saved metric
      expect(mockMetricsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'distance_saved',
          metricType: 'gauge',
          value: event.distanceSaved,
          unit: 'km',
        })
      );
    });
  });

  describe('recordVehicleUtilization', () => {
    it('should record vehicle utilization metric', async () => {
      const data: VehicleUtilizationData = {
        vehicleId: 'vehicle-123',
        vehicleType: '4W',
        utilizationPercentage: 75.5,
        timestamp: new Date(),
      };

      const savedMetric = new AnalyticsMetricEntity();
      mockMetricsRepository.create.mockReturnValue(savedMetric);
      mockMetricsRepository.save.mockResolvedValue(savedMetric);

      await service.recordVehicleUtilization(data);

      expect(mockMetricsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'vehicle_utilization',
          metricType: 'gauge',
          value: data.utilizationPercentage,
          unit: 'percentage',
          dimensions: {
            vehicleId: data.vehicleId,
            vehicleType: data.vehicleType,
          },
        })
      );
    });
  });

  describe('recordSLAPerformance', () => {
    it('should record SLA adherence and delivery time metrics', async () => {
      const slaDeadline = new Date('2024-01-01T12:00:00Z');
      const actualDeliveryTime = new Date('2024-01-01T11:30:00Z'); // 30 minutes early

      const data: SLAPerformanceData = {
        parcelId: 'parcel-123',
        slaDeadline,
        actualDeliveryTime,
        adherenceStatus: 'met',
        marginMinutes: 30,
      };

      const savedMetric = new AnalyticsMetricEntity();
      mockMetricsRepository.create.mockReturnValue(savedMetric);
      mockMetricsRepository.save.mockResolvedValue(savedMetric);

      await service.recordSLAPerformance(data);

      expect(mockMetricsRepository.save).toHaveBeenCalledTimes(2);

      // Verify SLA adherence metric (1 for met, 0 for missed)
      expect(mockMetricsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'sla_adherence',
          metricType: 'counter',
          value: 1, // met = 1
          dimensions: {
            parcelId: data.parcelId,
            status: 'met',
          },
        })
      );

      // Verify delivery time metric (negative means early)
      expect(mockMetricsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'delivery_time',
          metricType: 'gauge',
          value: -30, // 30 minutes early
          unit: 'minutes',
        })
      );
    });
  });

  describe('recordDecisionPerformance', () => {
    it('should record decision processing time and overrides', async () => {
      const data: DecisionPerformanceData = {
        decisionId: 'decision-123',
        processingTimeMs: 250,
        shadowMode: false,
        executed: true,
        overridden: true,
        timestamp: new Date(),
      };

      const savedMetric = new AnalyticsMetricEntity();
      mockMetricsRepository.create.mockReturnValue(savedMetric);
      mockMetricsRepository.save.mockResolvedValue(savedMetric);

      await service.recordDecisionPerformance(data);

      expect(mockMetricsRepository.save).toHaveBeenCalledTimes(2); // processing time + override

      // Verify processing time metric
      expect(mockMetricsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'decision_processing_time',
          metricType: 'gauge',
          value: data.processingTimeMs,
          unit: 'milliseconds',
        })
      );

      // Verify manual override metric
      expect(mockMetricsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'manual_overrides',
          metricType: 'counter',
          value: 1,
          unit: 'count',
        })
      );
    });

    it('should not record override metric when not overridden', async () => {
      const data: DecisionPerformanceData = {
        decisionId: 'decision-123',
        processingTimeMs: 150,
        shadowMode: false,
        executed: true,
        overridden: false, // Not overridden
        timestamp: new Date(),
      };

      const savedMetric = new AnalyticsMetricEntity();
      mockMetricsRepository.create.mockReturnValue(savedMetric);
      mockMetricsRepository.save.mockResolvedValue(savedMetric);

      await service.recordDecisionPerformance(data);

      expect(mockMetricsRepository.save).toHaveBeenCalledTimes(1); // Only processing time
    });
  });

  describe('calculateEmissions', () => {
    it('should calculate emissions for 2W petrol vehicle', () => {
      const params: EmissionsCalculationParams = {
        vehicleType: '2W',
        distanceKm: 100,
        fuelType: 'petrol',
      };

      const result = service.calculateEmissions(params);

      // 2W petrol: 2.5L/100km * 100km = 2.5L
      // CO2: 2.5L * 2.31 kg/L = 5.775 kg
      expect(result.fuelLiters).toBe(2.5);
      expect(result.co2Kg).toBe(5.78); // Rounded to 2 decimal places
      expect(result.calculationMethod).toBe('2W_petrol_standard');
    });

    it('should calculate emissions for 4W diesel vehicle', () => {
      const params: EmissionsCalculationParams = {
        vehicleType: '4W',
        distanceKm: 50,
        fuelType: 'diesel',
      };

      const result = service.calculateEmissions(params);

      // 4W diesel: 6.5L/100km * 50km = 3.25L
      // CO2: 3.25L * 2.68 kg/L = 8.71 kg
      expect(result.fuelLiters).toBe(3.25);
      expect(result.co2Kg).toBe(8.71);
      expect(result.calculationMethod).toBe('4W_diesel_standard');
    });
  });

  describe('calculateDailySummary', () => {
    it('should calculate and save daily summary', async () => {
      const date = new Date('2024-01-15');
      
      // Mock query results
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '5' }); // vehicles_avoided
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ count: '20' }); // unique parcels
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ avg: '75.5' }); // avg utilization
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '150.5' }); // distance saved
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '25.3' }); // fuel saved
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '58.4' }); // co2 saved
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ avg: '95.2' }); // sla adherence rate
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ avg: '45.8' }); // avg delivery time
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ avg: '180.5' }); // avg decision time
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ avg: '5.2' }); // manual override rate

      const savedSummary = new DailyMetricsSummaryEntity();
      savedSummary.id = 'summary-id';
      savedSummary.date = date;

      mockSummaryRepository.findOne.mockResolvedValue(null); // No existing summary
      mockSummaryRepository.create.mockReturnValue(savedSummary);
      mockSummaryRepository.save.mockResolvedValue(savedSummary);

      const result = await service.calculateDailySummary(date);

      expect(mockSummaryRepository.create).toHaveBeenCalledWith({ date: expect.any(Date) });
      expect(mockSummaryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vehiclesAvoided: 5,
          totalParcelsProcessed: 20,
          consolidationRate: 25, // 5/20 * 100
          avgVehicleUtilization: 75.5,
          totalDistanceSaved: 150.5,
          totalFuelSaved: 25.3,
          co2EmissionsSaved: 58.4,
        })
      );
    });

    it('should update existing daily summary', async () => {
      const date = new Date('2024-01-15');
      
      const existingSummary = new DailyMetricsSummaryEntity();
      existingSummary.id = 'existing-id';
      existingSummary.date = date;

      mockSummaryRepository.findOne.mockResolvedValue(existingSummary);
      mockSummaryRepository.save.mockResolvedValue(existingSummary);

      // Mock minimal query results
      mockQueryBuilder.getRawOne.mockResolvedValue({ sum: '0', avg: '0', count: '0' });

      const result = await service.calculateDailySummary(date);

      expect(mockSummaryRepository.create).not.toHaveBeenCalled();
      expect(mockSummaryRepository.save).toHaveBeenCalledWith(existingSummary);
    });
  });
});