export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface FirebaseAuthConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: Date;
  severity: SecurityEventSeverity;
}

export enum UserRole {
  ADMIN = 'admin',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver'
}

export enum Permission {
  // Vehicle permissions
  VIEW_VEHICLES = 'view_vehicles',
  MANAGE_VEHICLES = 'manage_vehicles',
  
  // Parcel permissions
  VIEW_PARCELS = 'view_parcels',
  MANAGE_PARCELS = 'manage_parcels',
  ASSIGN_PARCELS = 'assign_parcels',
  
  // Decision permissions
  VIEW_DECISIONS = 'view_decisions',
  OVERRIDE_DECISIONS = 'override_decisions',
  
  // Analytics permissions
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_REPORTS = 'export_reports',
  
  // Admin permissions
  MANAGE_USERS = 'manage_users',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SYSTEM = 'manage_system',
  
  // Sensitive operations
  BYPASS_SLA = 'bypass_sla',
  MANUAL_CUSTODY = 'manual_custody'
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_LOCKED = 'account_locked'
}

export enum SecurityEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}