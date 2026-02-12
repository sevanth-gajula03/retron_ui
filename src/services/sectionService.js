import { apiClient } from "../lib/apiClient";

export const getSection = async (_courseId, sectionId) => {
    if (!sectionId) throw new Error("Section ID is required");
    return apiClient.get(`/sections/${sectionId}`);
};

export const addSection = async (courseId, sectionData) => {
    if (!courseId || !sectionData?.title?.trim()) {
        throw new Error("Course ID and title are required");
    }
    return apiClient.post("/sections", {
        course_id: courseId,
        title: sectionData.title.trim(),
        order: sectionData.order || 0
    });
};

export const updateSection = async (_courseId, sectionId, updatedData) => {
    if (!sectionId) throw new Error("Section ID is required");
    return apiClient.patch(`/sections/${sectionId}`, {
        title: updatedData.title,
        order: updatedData.order
    });
};

export const deleteSection = async (_courseId, sectionId) => {
    if (!sectionId) throw new Error("Section ID is required");
    await apiClient.delete(`/sections/${sectionId}`);
    return { success: true, sectionId };
};

export const deleteMultipleSections = async (_courseId, sectionIds) => {
    if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
        throw new Error("Section IDs array is required");
    }
    await Promise.all(sectionIds.map((id) => apiClient.delete(`/sections/${id}`)));
    return { success: true, deletedCount: sectionIds.length };
};

export const duplicateSection = async (courseId, sectionId) => {
    const section = await getSection(courseId, sectionId);
    return addSection(courseId, {
        title: `${section.title || "Untitled"} (Copy)`,
        order: section.order || 0
    });
};

export const duplicateSectionWithReferences = async (courseId, sectionId, newTitle) => {
    const section = await getSection(courseId, sectionId);
    return addSection(courseId, {
        title: newTitle || `${section.title || "Untitled"} (Copy)`,
        order: section.order || 0
    });
};

export const duplicateMultipleSections = async (courseId, sectionIds) => {
    if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
        throw new Error("Section IDs array is required");
    }
    const duplicatedSections = [];
    for (const sectionId of sectionIds) {
        duplicatedSections.push(await duplicateSection(courseId, sectionId));
    }
    return duplicatedSections;
};

export const addSubSection = async (_courseId, sectionId, subSectionData) => {
    if (!sectionId || !subSectionData?.title?.trim()) {
        throw new Error("Section ID and title are required");
    }
    return apiClient.post("/subsections", {
        section_id: sectionId,
        title: subSectionData.title.trim(),
        description: subSectionData.description || null,
        objectives: subSectionData.objectives || [],
        duration: subSectionData.duration || null,
        order: subSectionData.order || 0
    });
};

export const getSubSection = async (_courseId, _sectionId, subSectionId) => {
    if (!subSectionId) throw new Error("Sub-section ID is required");
    return apiClient.get(`/subsections/${subSectionId}`);
};

export const updateSubSection = async (_courseId, _sectionId, subSectionId, updatedData) => {
    if (!subSectionId) throw new Error("Sub-section ID is required");
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(updatedData, "title")) {
        payload.title = updatedData.title;
    }
    if (Object.prototype.hasOwnProperty.call(updatedData, "description")) {
        payload.description = updatedData.description;
    }
    if (Object.prototype.hasOwnProperty.call(updatedData, "objectives")) {
        payload.objectives = updatedData.objectives || [];
    }
    if (Object.prototype.hasOwnProperty.call(updatedData, "duration")) {
        payload.duration = updatedData.duration;
    }
    if (Object.prototype.hasOwnProperty.call(updatedData, "order")) {
        payload.order = updatedData.order;
    }
    return apiClient.patch(`/subsections/${subSectionId}`, payload);
};

export const deleteSubSection = async (_courseId, _sectionId, subSectionId) => {
    if (!subSectionId) throw new Error("Sub-section ID is required");
    await apiClient.delete(`/subsections/${subSectionId}`);
    return { success: true };
};

export const duplicateSectionAsTemplate = async () => {
    throw new Error("Section templates are not supported yet");
};

export const createSectionFromTemplate = async () => {
    throw new Error("Section templates are not supported yet");
};

export const softDeleteSection = async () => {
    throw new Error("Soft delete is not supported yet");
};

export const restoreSection = async () => {
    throw new Error("Restore is not supported yet");
};

export const getDeletedSections = async () => [];

export const restoreFromBackup = async () => {
    throw new Error("Restore is not supported yet");
};

export const permanentDeleteSection = async () => {
    throw new Error("Permanent delete is not supported yet");
};

export const deleteSectionsByCondition = async () => {
    throw new Error("Conditional delete is not supported yet");
};

export const duplicateSectionToCourse = async () => {
    throw new Error("Cross-course duplication is not supported yet");
};
