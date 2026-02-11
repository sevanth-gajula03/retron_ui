export const AUDIT_LOG_TYPES = {
    ROLE_CHANGE: "ROLE_CHANGE",
    PERMISSION_CHANGE: "PERMISSION_CHANGE",
    USER_SUSPENDED: "USER_SUSPENDED",
    USER_UNSUSPENDED: "USER_UNSUSPENDED",
    INSTITUTION_ASSIGNED: "INSTITUTION_ASSIGNED",
    INSTITUTION_REMOVED: "INSTITUTION_REMOVED",
    GUEST_ACCESS_REVOKED: "GUEST_ACCESS_REVOKED",
    GUEST_ACCESS_EXTENDED: "GUEST_ACCESS_EXTENDED",
    GUEST_ACCESS_CREATED: "GUEST_ACCESS_CREATED"
};

export const logRoleChange = async () => null;
export const logPermissionChange = async () => null;
export const logInstitutionAssignment = async () => null;
export const logSuspensionChange = async () => null;
export const logGuestAccessRevoked = async () => null;
export const logGuestAccessCreated = async () => null;
export const logGuestAccessExtended = async () => null;
export const logUserDeletion = async () => null;

export const getAuditLogDescription = (logEntry) => {
    switch (logEntry.type) {
        case AUDIT_LOG_TYPES.ROLE_CHANGE:
            return `Changed role from ${logEntry.oldRole} to ${logEntry.newRole}`;
        case AUDIT_LOG_TYPES.PERMISSION_CHANGE:
            return "Updated permissions";
        case AUDIT_LOG_TYPES.USER_SUSPENDED:
            return "Suspended user";
        case AUDIT_LOG_TYPES.USER_UNSUSPENDED:
            return "Unsuspended user";
        case AUDIT_LOG_TYPES.INSTITUTION_ASSIGNED:
            return `Assigned to institution: ${logEntry.institutionName}`;
        case AUDIT_LOG_TYPES.INSTITUTION_REMOVED:
            return "Removed from institution";
        case AUDIT_LOG_TYPES.GUEST_ACCESS_REVOKED:
            return "Revoked guest access";
        case AUDIT_LOG_TYPES.GUEST_ACCESS_EXTENDED:
            return "Extended guest access";
        case AUDIT_LOG_TYPES.GUEST_ACCESS_CREATED:
            return "Created guest access";
        default:
            return "Unknown action";
    }
};
