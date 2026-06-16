// Mirrors the backend's permission matching (require_permission):
// "*:*" = all, "resource:*" = all scopes on a resource, "*:scope" = a scope
// across resources, or an exact "resource:scope" match.
export const hasPermission = (permissions: string[], required?: string): boolean => {
    if (!required) return true;
    if (permissions.includes("*:*") || permissions.includes(required)) return true;
    const [resource, scope] = required.split(":");
    return permissions.includes(`${resource}:*`) || permissions.includes(`*:${scope}`);
};
