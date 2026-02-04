"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLoggerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const audit_log_entity_1 = require("../entities/audit-log.entity");
let AuditLoggerService = AuditLoggerService_1 = class AuditLoggerService {
    auditLogRepository;
    logger = new common_1.Logger(AuditLoggerService_1.name);
    constructor(auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }
    /**
     * Log a decision engine evaluation
     */
    async logDecision(parcelId, decisionData, userId, correlationId) {
        const auditRequest = {
            eventType: audit_log_entity_1.AuditEventType.DECISION_MADE,
            entityType: 'parcel',
            entityId: parcelId,
            userId,
            eventData: {
                ...decisionData,
                timestamp: new Date().toISOString(),
            },
            serviceName: 'decision-engine',
            correlationId,
        };
        await this.createAuditLog(auditRequest);
        this.logger.log(`Decision logged for parcel ${parcelId}`);
    }
    /**
     * Log a manual override with justification
     */
    async logManualOverride(entityType, entityId, overrideData, userId, ipAddress, userAgent, sessionId, correlationId) {
        const auditRequest = {
            eventType: audit_log_entity_1.AuditEventType.MANUAL_OVERRIDE,
            entityType,
            entityId,
            userId,
            eventData: {
                ...overrideData,
                timestamp: new Date().toISOString(),
            },
            ipAddress,
            userAgent,
            sessionId,
            serviceName: 'audit-service',
            correlationId,
        };
        await this.createAuditLog(auditRequest);
        this.logger.warn(`Manual override logged for ${entityType} ${entityId} by user ${userId}`);
    }
    /**
     * Log a security event
     */
    async logSecurityEvent(eventData, userId, ipAddress, userAgent, sessionId) {
        const auditRequest = {
            eventType: audit_log_entity_1.AuditEventType.SECURITY_EVENT,
            entityType: 'security',
            userId,
            eventData: {
                ...eventData,
                timestamp: new Date().toISOString(),
            },
            ipAddress,
            userAgent,
            sessionId,
            serviceName: 'audit-service',
        };
        await this.createAuditLog(auditRequest);
        this.logger.error(`Security event logged: ${JSON.stringify(eventData)}`);
    }
    /**
     * Create an audit log entry with cryptographic integrity
     */
    async createAuditLog(request) {
        try {
            // Generate cryptographic hash for integrity verification
            const dataHash = this.generateDataHash(request.eventData);
            const auditLog = this.auditLogRepository.create({
                eventType: request.eventType,
                entityType: request.entityType,
                entityId: request.entityId,
                userId: request.userId,
                eventData: request.eventData,
                ipAddress: request.ipAddress,
                userAgent: request.userAgent,
                sessionId: request.sessionId,
                serviceName: request.serviceName,
                correlationId: request.correlationId,
                dataHash,
            });
            const savedLog = await this.auditLogRepository.save(auditLog);
            this.logger.debug(`Audit log created with ID: ${savedLog.id}`);
            return savedLog;
        }
        catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
     * Retrieve audit logs with filtering
     */
    async getAuditLogs(filter) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');
        if (filter.eventType) {
            queryBuilder.andWhere('audit.eventType = :eventType', { eventType: filter.eventType });
        }
        if (filter.entityType) {
            queryBuilder.andWhere('audit.entityType = :entityType', { entityType: filter.entityType });
        }
        if (filter.entityId) {
            queryBuilder.andWhere('audit.entityId = :entityId', { entityId: filter.entityId });
        }
        if (filter.userId) {
            queryBuilder.andWhere('audit.userId = :userId', { userId: filter.userId });
        }
        if (filter.serviceName) {
            queryBuilder.andWhere('audit.serviceName = :serviceName', { serviceName: filter.serviceName });
        }
        if (filter.correlationId) {
            queryBuilder.andWhere('audit.correlationId = :correlationId', { correlationId: filter.correlationId });
        }
        if (filter.startDate && filter.endDate) {
            queryBuilder.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
                startDate: filter.startDate,
                endDate: filter.endDate,
            });
        }
        queryBuilder.orderBy('audit.createdAt', 'DESC');
        if (filter.limit) {
            queryBuilder.limit(filter.limit);
        }
        if (filter.offset) {
            queryBuilder.offset(filter.offset);
        }
        return queryBuilder.getMany();
    }
    /**
     * Generate audit report for specified period
     */
    async generateAuditReport(request) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
            .where('audit.createdAt BETWEEN :startDate AND :endDate', {
            startDate: request.startDate,
            endDate: request.endDate,
        });
        if (request.eventTypes && request.eventTypes.length > 0) {
            queryBuilder.andWhere('audit.eventType IN (:...eventTypes)', { eventTypes: request.eventTypes });
        }
        if (request.entityTypes && request.entityTypes.length > 0) {
            queryBuilder.andWhere('audit.entityType IN (:...entityTypes)', { entityTypes: request.entityTypes });
        }
        if (request.userIds && request.userIds.length > 0) {
            queryBuilder.andWhere('audit.userId IN (:...userIds)', { userIds: request.userIds });
        }
        // Get total count
        const totalEvents = await queryBuilder.getCount();
        // Get events by type
        const eventsByTypeQuery = this.auditLogRepository.createQueryBuilder('audit')
            .select('audit.eventType', 'eventType')
            .addSelect('COUNT(*)', 'count')
            .where('audit.createdAt BETWEEN :startDate AND :endDate', {
            startDate: request.startDate,
            endDate: request.endDate,
        })
            .groupBy('audit.eventType');
        const eventsByTypeResult = await eventsByTypeQuery.getRawMany();
        const eventsByType = eventsByTypeResult.reduce((acc, row) => {
            acc[row.eventType] = parseInt(row.count);
            return acc;
        }, {});
        // Get events by user
        const eventsByUserQuery = this.auditLogRepository.createQueryBuilder('audit')
            .select('audit.userId', 'userId')
            .addSelect('COUNT(*)', 'count')
            .where('audit.createdAt BETWEEN :startDate AND :endDate', {
            startDate: request.startDate,
            endDate: request.endDate,
        })
            .andWhere('audit.userId IS NOT NULL')
            .groupBy('audit.userId');
        const eventsByUserResult = await eventsByUserQuery.getRawMany();
        const eventsByUser = eventsByUserResult.reduce((acc, row) => {
            acc[row.userId] = parseInt(row.count);
            return acc;
        }, {});
        // Get events by service
        const eventsByServiceQuery = this.auditLogRepository.createQueryBuilder('audit')
            .select('audit.serviceName', 'serviceName')
            .addSelect('COUNT(*)', 'count')
            .where('audit.createdAt BETWEEN :startDate AND :endDate', {
            startDate: request.startDate,
            endDate: request.endDate,
        })
            .andWhere('audit.serviceName IS NOT NULL')
            .groupBy('audit.serviceName');
        const eventsByServiceResult = await eventsByServiceQuery.getRawMany();
        const eventsByService = eventsByServiceResult.reduce((acc, row) => {
            acc[row.serviceName] = parseInt(row.count);
            return acc;
        }, {});
        // Get timeline data (daily counts)
        const timelineQuery = this.auditLogRepository.createQueryBuilder('audit')
            .select('DATE(audit.createdAt)', 'date')
            .addSelect('COUNT(*)', 'count')
            .where('audit.createdAt BETWEEN :startDate AND :endDate', {
            startDate: request.startDate,
            endDate: request.endDate,
        })
            .groupBy('DATE(audit.createdAt)')
            .orderBy('DATE(audit.createdAt)', 'ASC');
        const timelineResult = await timelineQuery.getRawMany();
        const timeline = timelineResult.map(row => ({
            date: row.date,
            count: parseInt(row.count),
        }));
        const response = {
            totalEvents,
            eventsByType,
            eventsByUser,
            eventsByService,
            timeline,
        };
        // Include actual events if requested
        if (request.includeEventData) {
            const events = await queryBuilder
                .orderBy('audit.createdAt', 'DESC')
                .limit(1000) // Limit to prevent memory issues
                .getMany();
            response.events = events;
        }
        return response;
    }
    /**
     * Verify the cryptographic integrity of an audit log
     */
    async verifyLogIntegrity(logId) {
        const log = await this.auditLogRepository.findOne({ where: { id: logId } });
        if (!log) {
            return false;
        }
        const expectedHash = this.generateDataHash(log.eventData);
        return log.dataHash === expectedHash;
    }
    /**
     * Generate SHA-256 hash of event data for integrity verification
     */
    generateDataHash(eventData) {
        const dataString = JSON.stringify(eventData, Object.keys(eventData).sort());
        return (0, crypto_1.createHash)('sha256').update(dataString).digest('hex');
    }
};
exports.AuditLoggerService = AuditLoggerService;
exports.AuditLoggerService = AuditLoggerService = AuditLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditLoggerService);
//# sourceMappingURL=audit-logger.service.js.map