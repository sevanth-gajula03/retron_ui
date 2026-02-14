import { apiClient } from "../lib/apiClient";

export const saveModule = async ({ courseId, sectionId, subSectionId, module, isNew, videoUrl }) => {
    if (!courseId || !sectionId) {
        throw new Error("Missing required parameters: courseId and sectionId are required");
    }

    const content = module.type === "video" && videoUrl ? extractYouTubeId(videoUrl) || videoUrl : module.content || "";
    const quizData = module.type === "quiz"
        ? (module.quizData || module.quiz_data || module.quizQuestions || null)
        : null;
    const resolvedSubSectionId = subSectionId || module?.sub_section_id || module?.subSectionId || null;

    const isUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    const shouldCreate = isNew || !isUuid(module?.id);

    if (shouldCreate) {
        return apiClient.post("/modules", {
            section_id: sectionId,
            sub_section_id: resolvedSubSectionId,
            title: module.title || "",
            type: module.type,
            content,
            ...(module.type === "quiz" ? { quiz_data: quizData } : {}),
            order: module.order || 0
        });
    }

    return apiClient.patch(`/modules/${module.id}`, {
        sub_section_id: resolvedSubSectionId,
        title: module.title || "",
        type: module.type,
        content,
        ...(module.type === "quiz" ? { quiz_data: quizData } : {}),
        order: module.order
    });
};

export const deleteModule = async (_courseId, _sectionId, _subSectionId, moduleId) => {
    if (!moduleId) throw new Error("Missing moduleId");
    await apiClient.delete(`/modules/${moduleId}`);
    return true;
};

export const getModuleById = async (_courseId, _sectionId, _subSectionId, moduleId) => {
    if (!moduleId) throw new Error("Missing moduleId");
    return apiClient.get(`/modules/${moduleId}`);
};

export const updateModuleOrder = async (_courseId, _sectionId, _subSectionId, moduleIds) => {
    if (!Array.isArray(moduleIds)) return false;
    await Promise.all(
        moduleIds.map((id, index) => apiClient.patch(`/modules/${id}`, { order: index }))
    );
    return true;
};

export const duplicateModule = async (courseId, sectionId, subSectionId, moduleId) => {
    const module = await getModuleById(courseId, sectionId, subSectionId, moduleId);
    const duplicatedModule = {
        ...module,
        id: undefined,
        title: `${module.title || "Untitled"} (Copy)`
    };
    return saveModule({
        courseId,
        sectionId,
        subSectionId,
        module: duplicatedModule,
        isNew: true,
        videoUrl: module.type === "video" ? module.content : null
    });
};

export const validateYouTubeUrl = (url) => {
    if (!url) return false;
    
    const youtubeId = extractYouTubeId(url);
    return !!youtubeId;
};

const extractYouTubeId = (url) => {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
        /youtu\.be\/([^?\n#]+)/,
        /youtube\.com\/embed\/([^?\n#]+)/,
        /youtube\.com\/v\/([^?\n#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            // Extract just the video ID (remove any additional parameters)
            const videoId = match[1].split(/[&#?]/)[0];
            if (videoId.length === 11) {
                return videoId;
            }
        }
    }
    
    return null;
};

export const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;
    
    return {
        default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
};

export const calculateModuleStats = (modules) => {
    const stats = {
        total: modules.length,
        video: modules.filter(m => m.type === 'video').length,
        text: modules.filter(m => m.type === 'text').length,
        quiz: modules.filter(m => m.type === 'quiz').length,
        chat: modules.filter(m => m.type === 'chat').length,
        totalDuration: 0,
        totalQuizzes: modules.filter(m => m.type === 'quiz').length,
        totalQuestions: modules.reduce((sum, module) => 
            sum + (module.quizData?.length || 0), 0
        )
    };
    
    return stats;
}

export const debugSectionStructure = async () => {
    return null;
};

export const debugFindModule = async () => {
    return null;
};
