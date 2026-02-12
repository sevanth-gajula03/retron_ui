const normalizeChatCases = (cases = []) => {
    const map = new Map();
    cases.forEach((caseItem) => {
        if (!caseItem) return;
        const id = caseItem.id || caseItem.case_id;
        if (!id) return;
        if (!map.has(id)) {
            map.set(id, {
                id,
                title: caseItem.title || caseItem.name || "",
                description: caseItem.description || "",
                difficulty: caseItem.difficulty || ""
            });
        }
    });
    return Array.from(map.values());
};

const extractCasesFromContent = (content) => {
    if (!content) return [];
    if (Array.isArray(content)) return content;
    if (Array.isArray(content.cases)) return content.cases;
    if (Array.isArray(content.caseIds)) return content.caseIds.map((id) => ({ id }));
    if (Array.isArray(content.case_ids)) return content.case_ids.map((id) => ({ id }));
    return [];
};

export const parseChatContent = (content) => {
    if (!content) return { cases: [] };
    if (typeof content === "object") {
        return { cases: normalizeChatCases(extractCasesFromContent(content)) };
    }
    if (typeof content === "string") {
        try {
            const parsed = JSON.parse(content);
            return { cases: normalizeChatCases(extractCasesFromContent(parsed)) };
        } catch (error) {
            return { cases: [] };
        }
    }
    return { cases: [] };
};

export const serializeChatContent = (cases = []) => {
    const normalized = normalizeChatCases(cases);
    return JSON.stringify({
        cases: normalized.map((caseItem) => ({
            id: caseItem.id,
            title: caseItem.title || "",
            description: caseItem.description || "",
            difficulty: caseItem.difficulty || ""
        }))
    });
};
