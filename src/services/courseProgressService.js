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

export const courseProgressService = {
    list: (params = {}) => apiClient.get(`/course-progress${toQuery(params)}`),
    upsert: (payload) => apiClient.post("/course-progress", payload),
    update: (progressId, payload) => apiClient.patch(`/course-progress/${progressId}`, payload),
};
