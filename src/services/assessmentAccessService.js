import { apiClient } from "../lib/apiClient";

const toQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        query.set(key, value);
    });
    const str = query.toString();
    return str ? `?${str}` : "";
};

export const assessmentAccessService = {
    list: (params = {}) => apiClient.get(`/assessment-access${toQuery(params)}`),
    grant: (payload) => apiClient.post("/assessment-access", payload),
    bulkGrant: (payload) => apiClient.post("/assessment-access/bulk-grant", payload),
    update: (accessId, payload) => apiClient.patch(`/assessment-access/${accessId}`, payload),
    remove: (accessId) => apiClient.delete(`/assessment-access/${accessId}`),
};
