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

export const userService = {
    list: (params = {}) => apiClient.get(`/users${toQuery(params)}`),
    getById: (userId) => apiClient.get(`/users/${userId}`),
    update: (userId, payload) => apiClient.patch(`/users/${userId}`, payload),
};
