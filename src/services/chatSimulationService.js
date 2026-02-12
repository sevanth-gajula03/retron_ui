const CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_BASE_URL || "https://retron-lms-1061930308384.asia-south1.run.app";

const chatRequest = async (path, { method = "GET", body, headers } = {}) => {
    const response = await fetch(`${CHAT_API_BASE_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Request failed");
    }

    if (response.status === 204) return null;
    return response.json();
};

export const getChatCases = () => chatRequest("/cases");

export const startChatSession = (caseId) =>
    chatRequest("/chat/start", {
        method: "POST",
        body: { case_id: caseId }
    });

export const sendChatMessage = (sessionId, message) =>
    chatRequest("/chat/message", {
        method: "POST",
        body: { session_id: sessionId, message }
    });

export const listChatActions = (sessionId) =>
    chatRequest(`/chat/actions?session_id=${encodeURIComponent(sessionId)}`);

export const performChatAction = (sessionId, actionKey) =>
    chatRequest("/chat/action", {
        method: "POST",
        body: { session_id: sessionId, action_key: actionKey }
    });

export const evaluateChatSession = (sessionId, finalDiagnosis) =>
    chatRequest("/chat/evaluate", {
        method: "POST",
        body: { session_id: sessionId, final_diagnosis: finalDiagnosis }
    });
