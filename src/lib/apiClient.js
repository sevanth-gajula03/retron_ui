// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
// 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://retron-api-1061930308384.asia-south1.run.app/";


const getAccessToken = () => localStorage.getItem("access_token");

export const setTokens = ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem("access_token", accessToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
};

export const clearTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
};

const request = async (path, { method = "GET", body, headers } = {}) => {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text();
        let message = errorText || "Request failed";
        try {
            const parsed = JSON.parse(errorText);
            if (parsed?.detail && typeof parsed.detail === "string") {
                message = parsed.detail;
            }
        } catch {
            // Keep text response as fallback.
        }
        throw new Error(message);
    }

    if (response.status === 204) return null;
    return response.json();
};

export const apiClient = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: (path) => request(path, { method: "DELETE" }),
};
