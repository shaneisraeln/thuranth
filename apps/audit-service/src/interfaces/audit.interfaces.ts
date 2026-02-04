import { AuditEventType } from '../entities/audit-log.entity';

export interface AuditLogRequest {
  eventType: AuditEventType;
  entityType: string;
  entityId?: string;
  userId?: string;
  eventData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  serviceName?: string;
  correlationId?: string;
}

export interface AuditLogFilter {
  eventType?: AuditEventType;
  entityType?: string;
  entityId?: string;
  userId?: string;
  serviceName?: string;
  correlationId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditReportRequest {
  startDate: Date;
  endDate: Date;
  eventTypes?: AuditEventType[];
  entityTypes?: string[];
  userIds?: string[];
  includeEventData?: boolean;
}

export interface AuditReportResponse {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByUser: Record<string, number>;
  eventsByService: Record<string, number>;
  timeline: Array<{
    date: string;
    count: number;
  }>;
  events?: any[];
}

export interface DecisionAuditData {
  parcelId: string;
  recommendedVehicleId?: string;
  score: number;
  explanation: any;
  shadowMode: boolean;
  alternatives: any[];
  requiresNewDispatch: boolean;
  processingTimeMs: number;
}

export interface OverrideAuditData {
  originalDecisionId: string;
  originalRecommendation?: string;
  overrideAction: string;
  justification: string;
  riskAssessment?: any;
  approvalRequired: boolean;
  approvedBy?: string;
}