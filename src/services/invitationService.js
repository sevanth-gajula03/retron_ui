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

export const invitationService = {
    list: (params = {}) => apiClient.get(`/invitations${toQuery(params)}`),
    create: (payload) => apiClient.post("/invitations", payload),
    update: (invitationId, payload) => apiClient.patch(`/invitations/${invitationId}`, payload),
    remove: (invitationId) => apiClient.delete(`/invitations/${invitationId}`),
};
