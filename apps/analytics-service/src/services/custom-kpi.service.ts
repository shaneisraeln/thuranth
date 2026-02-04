import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  CustomKPIDefinition,
  CustomKPIData,
  KPICalculationRequest,
  TimeRange,
  KPICategory,
  UpdateFrequency
} from '../interfaces/advanced-analytics.interfaces';
import { CustomKPIEntity } from '../entities/custom-kpi.entity';
import { AnalyticsMetricEntity } from '../entities/analytics-metric.entity';

@Injectable()
export class CustomKPIService {
  private readonly logger = new Logger(CustomKPIService.name);

  constructor(
    @InjectRepository(CustomKPIEntity)
    private readonly customKPIRepository: Repository<CustomKPIEntity>,
    @InjectRepository(AnalyticsMetricEntity)
    private readonly metricsRepository: Repository<AnalyticsMetricEntity>,
  ) {}

  /**
   * Create a new custom KPI definition
   */
  async createCustomKPI(definition: CustomKPIDefinition): Promise<CustomKPIEntity> {
    this.logger.log(`Creating custom KPI: ${definition.name}`);

    try {
      // Validate the formula
      await this.validateKPIFormula(definition.formula);

      // Check if KPI name already exists
      const existingKPI = await this.customKPIRepository.findOne({
        where: { name: definition.name }
      });

      if (existingKPI) {
        throw new BadRequestException(`KPI with name '${definition.name}' already exists`);
      }

      const kpiEntity = this.customKPIRepository.create({
        name: definition.name,
        description: definition.description,
        formula: definition.formula,
        unit: definition.unit,
        category: definition.category,
        owner: definition.owner,
        target: definition.target,
        updateFrequency: definition.updateFrequency,
        dataSource: definition.dataSource,
        isActive: definition.isActive
      });

      const savedKPI = await this.customKPIRepository.save(kpiEntity);
      this.logger.log(`Custom KPI created successfully: ${savedKPI.id}`);

      return savedKPI;

    } catch (error) {
      this.logger.error(`Error creating custom KPI: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing custom KPI definition
   */
  async updateCustomKPI(id: string, definition: Partial<CustomKPIDefinition>): Promise<CustomKPIEntity> {
    this.logger.log(`Updating custom KPI: ${id}`);

    const existingKPI = await this.customKPIRepository.findOne({ where: { id } });
    if (!existingKPI) {
      throw new NotFoundException(`Custom KPI with ID ${id} not found`);
    }

    // Validate formula if it's being updated
    if (definition.formula) {
      await this.validateKPIFormula(definition.formula);
    }

    // Check for name conflicts if name is being updated
    if (definition.name && definition.name !== existingKPI.name) {
      const nameConflict = await this.customKPIRepository.findOne({
        where: { name: definition.name }
      });
      if (nameConflict) {
        throw new BadRequestException(`KPI with name '${definition.name}' already exists`);
      }
    }

    await this.customKPIRepository.update(id, definition);
    const updatedKPI = await this.customKPIRepository.findOne({ where: { id } });

    this.logger.log(`Custom KPI updated successfully: ${id}`);
    return updatedKPI!;
  }

  /**
   * Delete a custom KPI
   */
  async deleteCustomKPI(id: string): Promise<void> {
    this.logger.log(`Deleting custom KPI: ${id}`);

    const existingKPI = await this.customKPIRepository.findOne({ where: { id } });
    if (!existingKPI) {
      throw new NotFoundException(`Custom KPI with ID ${id} not found`);
    }

    await this.customKPIRepository.delete(id);
    this.logger.log(`Custom KPI deleted successfully: ${id}`);
  }

  /**
   * Get all custom KPIs with optional filtering
   */
  async getCustomKPIs(
    category?: KPICategory,
    owner?: string,
    isActive?: boolean
  ): Promise<CustomKPIEntity[]> {
    const queryBuilder = this.customKPIRepository.createQueryBuilder('kpi');

    if (category) {
      queryBuilder.andWhere('kpi.category = :category', { category });
    }

    if (owner) {
      queryBuilder.andWhere('kpi.owner = :owner', { owner });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('kpi.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy('kpi.name', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * Get a specific custom KPI by ID
   */
  async getCustomKPIById(id: string): Promise<CustomKPIEntity> {
    const kpi = await this.customKPIRepository.findOne({ where: { id } });
    if (!kpi) {
      throw new NotFoundException(`Custom KPI with ID ${id} not found`);
    }
    return kpi;
  }

  /**
   * Calculate a custom KPI value for a specific time range
   */
  async calculateCustomKPI(request: KPICalculationRequest): Promise<CustomKPIData> {
    this.logger.log(`Calculating custom KPI: ${request.kpiId} for ${request.timeRange.start} to ${request.timeRange.end}`);

    const kpi = await this.getCustomKPIById(request.kpiId);
    
    try {
      const currentValue = await this.evaluateKPIFormula(
        kpi.formula, 
        request.timeRange, 
        request.filters
      );

      // Calculate previous period value for trend analysis
      const previousPeriod = this.getPreviousPeriod(request.timeRange);
      const previousValue = await this.evaluateKPIFormula(
        kpi.formula, 
        previousPeriod, 
        request.filters
      );

      const trend = this.calculateTrend(currentValue, previousValue);
      const trendPercentage = this.calculateTrendPercentage(currentValue, previousValue);

      // Update the KPI entity with the calculated value
      await this.customKPIRepository.update(kpi.id, {
        lastCalculatedValue: currentValue,
        lastCalculatedAt: new Date()
      });

      const result: CustomKPIData = {
        id: kpi.id,
        name: kpi.name,
        description: kpi.description,
        formula: kpi.formula,
        value: currentValue,
        unit: kpi.unit,
        target: kpi.target,
        trend,
        trendPercentage,
        category: kpi.category,
        owner: kpi.owner,
        lastUpdated: new Date()
      };

      this.logger.log(`Custom KPI calculated successfully: ${kpi.name} = ${currentValue}`);
      return result;

    } catch (error) {
      this.logger.error(`Error calculating custom KPI ${kpi.name}:`, error);
      throw new BadRequestException(`Failed to calculate KPI: ${error.message}`);
    }
  }

  /**
   * Bulk calculate all active custom KPIs
   */
  async calculateAllActiveKPIs(timeRange: TimeRange): Promise<CustomKPIData[]> {
    this.logger.log(`Calculating all active custom KPIs for ${timeRange.start} to ${timeRange.end}`);

    const activeKPIs = await this.customKPIRepository.find({
      where: { isActive: true }
    });

    const results: CustomKPIData[] = [];

    for (const kpi of activeKPIs) {
      try {
        const calculationRequest: KPICalculationRequest = {
          kpiId: kpi.id,
          timeRange
        };

        const result = await this.calculateCustomKPI(calculationRequest);
        results.push(result);

      } catch (error) {
        this.logger.error(`Error calculating KPI ${kpi.name}:`, error);
        // Continue with other KPIs even if one fails
      }
    }

    this.logger.log(`Calculated ${results.length} out of ${activeKPIs.length} active KPIs`);
    return results;
  }

  /**
   * Get KPI calculation history
   */
  async getKPIHistory(
    kpiId: string, 
    timeRange: TimeRange, 
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<{ timestamp: Date; value: number }[]> {
    const kpi = await this.getCustomKPIById(kpiId);
    
    // This would typically store historical KPI values in a separate table
    // For now, we'll return a placeholder implementation
    const history: { timestamp: Date; value: number }[] = [];
    
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    
    // Generate sample historical data points
    const interval = granularity === 'day' ? 24 * 60 * 60 * 1000 : 
                    granularity === 'week' ? 7 * 24 * 60 * 60 * 1000 :
                    30 * 24 * 60 * 60 * 1000;
    
    for (let current = start; current <= end; current = new Date(current.getTime() + interval)) {
      const mockValue = Math.random() * 100; // Placeholder calculation
      history.push({
        timestamp: new Date(current),
        value: mockValue
      });
    }
    
    return history;
  }

  /**
   * Validate KPI formula syntax and data source availability
   */
  private async validateKPIFormula(formula: string): Promise<void> {
    // Basic formula validation
    if (!formula || formula.trim().length === 0) {
      throw new BadRequestException('Formula cannot be empty');
    }

    // Check for basic mathematical operators and functions
    const allowedPattern = /^[a-zA-Z0-9_\s\+\-\*\/\(\)\.\,\[\]]+$/;
    if (!allowedPattern.test(formula)) {
      throw new BadRequestException('Formula contains invalid characters');
    }

    // Check for balanced parentheses
    const openParens = (formula.match(/\(/g) || []).length;
    const closeParens = (formula.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      throw new BadRequestException('Formula has unbalanced parentheses');
    }

    // Additional validation could include:
    // - Checking if referenced metrics exist
    // - Validating function names
    // - Checking data source availability
  }

  /**
   * Evaluate KPI formula with actual data
   */
  private async evaluateKPIFormula(
    formula: string, 
    timeRange: TimeRange, 
    filters?: Record<string, any>
  ): Promise<number> {
    // This is a simplified implementation
    // In practice, this would parse the formula and execute it against real data
    
    try {
      // Replace metric references with actual values
      let evaluatedFormula = formula;
      
      // Example: Replace SUM(vehicles_avoided) with actual sum
      const metricMatches = formula.match(/SUM\(([^)]+)\)/g);
      if (metricMatches) {
        for (const match of metricMatches) {
          const metricName = match.replace('SUM(', '').replace(')', '');
          const value = await this.sumMetricValue(metricName, timeRange.start, timeRange.end);
          evaluatedFormula = evaluatedFormula.replace(match, value.toString());
        }
      }

      // Example: Replace AVG(vehicle_utilization) with actual average
      const avgMatches = formula.match(/AVG\(([^)]+)\)/g);
      if (avgMatches) {
        for (const match of avgMatches) {
          const metricName = match.replace('AVG(', '').replace(')', '');
          const value = await this.averageMetricValue(metricName, timeRange.start, timeRange.end);
          evaluatedFormula = evaluatedFormula.replace(match, value.toString());
        }
      }

      // Evaluate the mathematical expression
      // Note: In production, use a safe expression evaluator
      const result = this.safeEvaluate(evaluatedFormula);
      
      return Math.round(result * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      this.logger.error(`Error evaluating formula: ${formula}`, error);
      throw new BadRequestException(`Invalid formula: ${error.message}`);
    }
  }

  /**
   * Safe mathematical expression evaluation
   */
  private safeEvaluate(expression: string): number {
    // This is a very basic implementation
    // In production, use a proper expression parser/evaluator
    
    // Remove whitespace
    expression = expression.replace(/\s/g, '');
    
    // Basic validation - only allow numbers and basic operators
    if (!/^[0-9+\-*/.()]+$/.test(expression)) {
      throw new Error('Invalid expression');
    }
    
    try {
      // Use Function constructor for safer evaluation than eval()
      return new Function('return ' + expression)();
    } catch (error) {
      throw new Error('Expression evaluation failed');
    }
  }

  /**
   * Helper methods for metric calculations
   */
  private async sumMetricValue(metricName: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.metricsRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.value)', 'sum')
      .where('metric.metricName = :metricName', { metricName })
      .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result.sum) || 0;
  }

  private async averageMetricValue(metricName: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.metricsRepository
      .createQueryBuilder('metric')
      .select('AVG(metric.value)', 'avg')
      .where('metric.metricName = :metricName', { metricName })
      .andWhere('metric.periodStart BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result.avg) || 0;
  }

  private getPreviousPeriod(timeRange: TimeRange): TimeRange {
    const duration = timeRange.end.getTime() - timeRange.start.getTime();
    return {
      start: new Date(timeRange.start.getTime() - duration),
      end: new Date(timeRange.end.getTime() - duration),
      granularity: timeRange.granularity
    };
  }

  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 2) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private calculateTrendPercentage(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }
}