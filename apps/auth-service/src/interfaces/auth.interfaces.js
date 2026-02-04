"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityEventSeverity = exports.SecurityEventType = exports.Permission = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["DISPATCHER"] = "dispatcher";
    UserRole["DRIVER"] = "driver";
})(UserRole || (exports.UserRole = UserRole = {}));
var Permission;
(function (Permission) {
    // Vehicle permissions
    Permission["VIEW_VEHICLES"] = "view_vehicles";
    Permission["MANAGE_VEHICLES"] = "manage_vehicles";
    // Parcel permissions
    Permission["VIEW_PARCELS"] = "view_parcels";
    Permission["MANAGE_PARCELS"] = "manage_parcels";
    Permission["ASSIGN_PARCELS"] = "assign_parcels";
    // Decision permissions
    Permission["VIEW_DECISIONS"] = "view_decisions";
    Permission["OVERRIDE_DECISIONS"] = "override_decisions";
    // Analytics permissions
    Permission["VIEW_ANALYTICS"] = "view_analytics";
    Permission["EXPORT_REPORTS"] = "export_reports";
    // Admin permissions
    Permission["MANAGE_USERS"] = "manage_users";
    Permission["VIEW_AUDIT_LOGS"] = "view_audit_logs";
    Permission["MANAGE_SYSTEM"] = "manage_system";
    // Sensitive operations
    Permission["BYPASS_SLA"] = "bypass_sla";
    Permission["MANUAL_CUSTODY"] = "manual_custody";
})(Permission || (exports.Permission = Permission = {}));
var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["LOGIN_SUCCESS"] = "login_success";
    SecurityEventType["LOGIN_FAILURE"] = "login_failure";
    SecurityEventType["LOGOUT"] = "logout";
    SecurityEventType["TOKEN_REFRESH"] = "token_refresh";
    SecurityEventType["UNAUTHORIZED_ACCESS"] = "unauthorized_access";
    SecurityEventType["PERMISSION_DENIED"] = "permission_denied";
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
    SecurityEventType["PASSWORD_CHANGE"] = "password_change";
    SecurityEventType["ACCOUNT_LOCKED"] = "account_locked";
})(SecurityEventType || (exports.SecurityEventType = SecurityEventType = {}));
var SecurityEventSeverity;
(function (SecurityEventSeverity) {
    SecurityEventSeverity["LOW"] = "low";
    SecurityEventSeverity["MEDIUM"] = "medium";
    SecurityEventSeverity["HIGH"] = "high";
    SecurityEventSeverity["CRITICAL"] = "critical";
})(SecurityEventSeverity || (exports.SecurityEventSeverity = SecurityEventSeverity = {}));
