import { useState, useEffect, useCallback } from "react";
import { Loader2, X, Youtube, Type, Maximize2, Image, Table, HelpCircle, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RestrictedYouTubeEmbed from "./RestrictedYouTubeEmbed";
import QuizEditor from "./QuizEditor";
import RichTextEditor from "./RichTextEditor";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { saveModule, debugFindModule } from "../../../../services/moduleService";
import { getChatCases } from "../../../../services/chatSimulationService";
import { parseChatContent, serializeChatContent } from "../../../../utils/chatContent";
import { useAuth } from "../../../../contexts/AuthContext";

export default function ModuleEditor({ isOpen, onClose, moduleData, courseId }) {
    const { user } = useAuth();
    console.log("📋 ModuleEditor received data:", moduleData);
    console.log("📋 Raw moduleData structure:", JSON.stringify(moduleData, null, 2));

    // Get the actual module data from the nested structure
    const extractModuleData = (data) => {
        if (!data) return null;

        // Handle nested structure: moduleData.module.module
        if (data.module && data.module.module) {
            console.log("📋 Found nested module structure: data.module.module");
            return data.module.module;
        }
        // Handle direct module property
        else if (data.module) {
            console.log("📋 Found direct module property: data.module");
            return data.module;
        }
        // Handle moduleData string
        else if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                console.log("📋 Parsed string moduleData:", parsed);
                return extractModuleData(parsed); // Recursively extract
            } catch (error) {
                console.error("❌ Failed to parse moduleData string:", error);
                return null;
            }
        }
        // Already flat module data
        else if (data.id || data.type) {
            console.log("📋 Already flat module data");
            return data;
        }
        // Legacy format with moduleData property
        else if (data.moduleData) {
            try {
                if (typeof data.moduleData === 'string') {
                    const parsed = JSON.parse(data.moduleData);
                    console.log("📋 Parsed moduleData property:", parsed);
                    return parsed;
                }
                return data.moduleData;
            } catch (error) {
                console.error("❌ Failed to parse moduleData:", error);
                return null;
            }
        }

        return null;
    };

    const extractedModule = extractModuleData(moduleData);
    console.log("📋 Extracted module:", extractedModule);
    console.log("📋 Extracted module content:", extractedModule?.content);
    console.log("📋 Extracted module quizData:", extractedModule?.quizData);

    const [module, setModule] = useState({
        id: Date.now().toString(),
        title: "",
        type: "text",
        content: "",
        order: 0,
        quizData: []
    });

    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [showRichTextEditor, setShowRichTextEditor] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [chatCases, setChatCases] = useState([]);
    const [availableChatCases, setAvailableChatCases] = useState([]);
    const [chatCasesLoading, setChatCasesLoading] = useState(false);
    const [chatCasesError, setChatCasesError] = useState("");

    const loadChatCases = useCallback(async () => {
        setChatCasesLoading(true);
        setChatCasesError("");
        try {
            const cases = await getChatCases();
            setAvailableChatCases(Array.isArray(cases) ? cases : []);
        } catch (error) {
            console.error("❌ Failed to load chat cases:", error);
            setChatCasesError("Failed to load cases. Please try again.");
            setAvailableChatCases([]);
        } finally {
            setChatCasesLoading(false);
        }
    }, []);

    // FIXED: Handle extracted module data properly
    useEffect(() => {
        console.log("🔄 useEffect triggered with extractedModule:", extractedModule);
        console.log("🔄 moduleData:", moduleData);

        if (!extractedModule && !moduleData) {
            console.log("No data, resetting form for new module");
            setModule({
                id: Date.now().toString(),
                title: "",
                type: "text",
                content: "",
                order: 0,
                quizData: []
            });
            setVideoUrl("");
            setChatCases([]);
            setInitialized(false);
            return;
        }

        // Determine if we're editing or creating new
        const resolvedSectionId = moduleData?.sectionId || moduleData?.section_id || extractedModule?.section_id;
        const resolvedSubSectionId =
            moduleData?.subSectionId ||
            moduleData?.subsectionId ||
            moduleData?.sub_section_id ||
            extractedModule?.sub_section_id;

        const isExplicitNew = moduleData?.isNew === true;
        const isExplicitEdit = moduleData?.isNew === false;
        const isEditing = isExplicitEdit || (!isExplicitNew && Boolean(extractedModule?.id));
        const isNewFlag = isExplicitNew || !isEditing;
        console.log("Is editing?", isEditing);

        if (isEditing && extractedModule) {
            console.log("📥 EDITING EXISTING MODULE:", extractedModule);

            // Process quiz data for quiz modules
            let quizData = [];
            if (extractedModule.type === 'quiz') {
                const rawQuiz = extractedModule.quizData || extractedModule.quiz_data;
                if (rawQuiz && Array.isArray(rawQuiz)) {
                    quizData = rawQuiz.map(q => ({
                        question: q.question || "",
                        points: q.points || 1,
                        options: Array.isArray(q.options) ? q.options.map(opt => opt || "") : ['', '', '', ''],
                        correctOption: q.correctOption !== undefined ? q.correctOption : 0,
                        explanation: q.explanation || ""
                    }));
                    console.log("📥 Processed quizData for editing:", quizData);
                } else if (extractedModule.quizQuestions) {
                    // Handle quizQuestions as alternative
                    quizData = extractedModule.quizQuestions.map(q => ({
                        question: q.question || "",
                        points: q.points || 1,
                        options: q.options || ['', '', '', ''],
                        correctOption: q.correctOption !== undefined ? q.correctOption : 0,
                        explanation: q.explanation || ""
                    }));
                } else {
                    quizData = [{
                        question: "",
                        points: 1,
                        options: ['', '', '', ''],
                        correctOption: 0,
                        explanation: ""
                    }];
                }
            }

            const newModuleState = {
                id: extractedModule.id || Date.now().toString(),
                title: extractedModule.title || "",
                type: extractedModule.type || "text",
                content: extractedModule.content || "",
                order: extractedModule.order || 0,
                quizData: quizData,
                section_id: resolvedSectionId,
                sub_section_id: resolvedSubSectionId
            };

            console.log("📥 Setting module state for editing:", newModuleState);
            setModule(newModuleState);

            // Handle video URL
            if (extractedModule.type === 'video') {
                const videoContent = extractedModule.content || extractedModule.videoUrl || "";
                console.log("📥 Setting video URL:", videoContent);
                setVideoUrl(videoContent);
            } else {
                setVideoUrl("");
            }

            if (extractedModule.type === 'chat') {
                const parsedChat = parseChatContent(extractedModule.content);
                setChatCases(parsedChat.cases);
            } else {
                setChatCases([]);
            }
        } else {
            // CREATING NEW MODULE
            console.log("📥 CREATING NEW MODULE");
            const moduleType = extractedModule?.type || moduleData?.type || moduleData?.moduleType || "text";
            console.log("📥 New module type:", moduleType);

            const newModule = {
                id: Date.now().toString(),
                title: "",
                type: moduleType,
                content: "",
                order: 0,
                quizData: moduleType === 'quiz' ? [{
                    question: "",
                    points: 1,
                    options: ['', '', '', ''],
                    correctOption: 0,
                    explanation: ""
                }] : [],
                section_id: resolvedSectionId,
                sub_section_id: resolvedSubSectionId
            };

            console.log("📥 New module state:", newModule);
            setModule(newModule);
            setVideoUrl("");
            setChatCases([]);
        }

        setInitialized(true);
    }, [extractedModule, moduleData]);

    // Debug: Log current module state
    useEffect(() => {
        if (initialized) {
            console.log("📊 Current module state:", {
                id: module.id,
                title: module.title,
                type: module.type,
                contentLength: module.content?.length || 0,
                contentPreview: module.content?.substring(0, 100),
                quizData: module.quizData,
                quizDataLength: module.quizData?.length || 0,
                isNew: moduleData?.isNew
            });
            console.log("📊 Current videoUrl:", videoUrl);
        }
    }, [module, videoUrl, initialized]);

    useEffect(() => {
        if (!isOpen || module.type !== 'chat') return;
        loadChatCases();
    }, [isOpen, module.type, loadChatCases]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const resolvedSectionId = moduleData?.sectionId || moduleData?.section_id || extractedModule?.section_id;
        const resolvedSubSectionId =
            moduleData?.subSectionId ||
            moduleData?.subsectionId ||
            moduleData?.sub_section_id ||
            extractedModule?.sub_section_id ||
            module?.sub_section_id;

        const isExplicitNew = moduleData?.isNew === true;
        const isExplicitEdit = moduleData?.isNew === false;
        const isEditing = isExplicitEdit || (!isExplicitNew && Boolean(extractedModule?.id));
        const isNewFlag = isExplicitNew || !isEditing;

        console.log("💾 SAVE CLICKED - Starting save process...");

        console.log("📤 Save context:", {
            courseId,
            sectionId: resolvedSectionId,
            subSectionId: resolvedSubSectionId,
            isNew: isNewFlag,
            moduleId: module.id
        });

        if (!user) {
            console.error("No authenticated user");
            alert("Please log in to save modules");
            return;
        }

        // Validate required fields
        if (!module.title.trim()) {
            alert("Please enter a module title");
            return;
        }

        // Special validation for quiz modules
        if (module.type === 'quiz') {
            if (!module.quizData || module.quizData.length === 0) {
                alert("Please add at least one question to the quiz");
                return;
            }

            // Validate each question
            for (let i = 0; i < module.quizData.length; i++) {
                const q = module.quizData[i];
                if (!q.question.trim()) {
                    alert(`Question ${i + 1} is empty. Please enter a question.`);
                    return;
                }
                if (!q.options || !Array.isArray(q.options)) {
                    alert(`Question ${i + 1} has invalid options.`);
                    return;
                }
                for (let j = 0; j < q.options.length; j++) {
                    if (!q.options[j]?.trim()) {
                        alert(`Question ${i + 1}, Option ${j + 1} is empty. Please fill all options.`);
                        return;
                    }
                }
            }
        }

        // Validate video modules
        if (module.type === 'video' && !videoUrl.trim()) {
            alert("Please enter a YouTube video URL");
            return;
        }

        if (module.type === 'chat' && chatCases.length === 0) {
            alert("Please select at least one case for the chat simulation");
            return;
        }

        setLoading(true);

        try {
            console.log("📤 Preparing module data for saving...");

            // Prepare module data for saving
            const resolvedContent = module.type === 'chat'
                ? serializeChatContent(chatCases)
                : module.type === 'video'
                    ? videoUrl.trim()
                    : (module.content || "");

            const moduleToSave = {
                id: module.id,
                title: module.title.trim(),
                type: module.type,
                content: resolvedContent,
                order: module.order || 0,
                ...(module.type === 'quiz' && {
                    quizData: module.quizData,
                    quizQuestions: module.quizData // For backward compatibility
                }),
                updatedAt: new Date().toISOString()
            };

            // Add createdAt for new modules
            if (moduleData?.isNew !== false) {
                moduleToSave.createdAt = new Date().toISOString();
            }

            console.log("📤 Module to save:", moduleToSave);

            // Call the save function with proper structure
            const savePayload = {
                courseId,
                sectionId: resolvedSectionId,
                subSectionId: resolvedSubSectionId,
                module: moduleToSave,
                isNew: isNewFlag
            };

            console.log("📤 Save payload:", savePayload);

            const savedModule = await saveModule(savePayload);

            console.log("✅ Module saved successfully:", savedModule);

            // Show success message
            alert("Module saved successfully!");

            // Call onClose to close the modal
            onClose(savedModule);

        } catch (error) {
            console.error("❌ Error saving module:", error);
            alert(`Failed to save module: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Get section info for display
    const sectionInfo = moduleData?.sectionId ?
        `Section: ${moduleData.sectionId}${moduleData?.subSectionId ? ` / Sub-section: ${moduleData.subSectionId}` : ''}` :
        'No section specified';

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                moduleType={module.type}
                isNew={moduleData?.isNew !== false}
                onClose={onClose}
            />

            <div className="mb-4 text-sm">
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs ${moduleData?.isNew !== false ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {moduleData?.isNew !== false ? 'NEW MODULE' : 'EDITING EXISTING MODULE'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                        Type: {module.type.toUpperCase()}
                    </span>
                    {module.type === 'chat' ? (
                        <span className="px-2 py-1 rounded text-xs bg-cyan-100 text-cyan-800">
                            Cases: {chatCases.length}
                        </span>
                    ) : (
                        <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                            Content: {module.content?.length || 0} chars
                        </span>
                    )}
                    {module.type === 'quiz' && (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                            Questions: {module.quizData?.length || 0}
                        </span>
                    )}
                </div>
                <div className="text-xs text-gray-500">
                    <div>Course: {courseId}</div>
                    <div>{sectionInfo}</div>
                    <div>Module ID: {module.id}</div>
                </div>
            </div>

            <form
                onSubmit={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.type !== 'textarea') {
                        e.preventDefault();
                    }
                }}
                className="space-y-4"
            >
                <TitleInput module={module} setModule={setModule} />

                {module.type === 'video' && (
                    <VideoEditor
                        videoUrl={videoUrl}
                        setVideoUrl={setVideoUrl}
                        currentContent={module.content}
                    />
                )}

                {module.type === 'text' && (
                    <TextEditor
                        module={module}
                        setModule={setModule}
                        showRichTextEditor={showRichTextEditor}
                        setShowRichTextEditor={setShowRichTextEditor}
                    />
                )}

                {module.type === 'quiz' && (
                    <QuizEditor
                        module={module}
                        setModule={setModule}
                    />
                )}

                {module.type === 'chat' && (
                    <ChatEditor
                        availableCases={availableChatCases}
                        selectedCases={chatCases}
                        setSelectedCases={setChatCases}
                        loading={chatCasesLoading}
                        error={chatCasesError}
                        onRetry={loadChatCases}
                    />
                )}

                <ModalActions loading={loading} onClose={onClose} />
            </form>
        </Modal>
    );
}

// Rest of the components remain the same...
function Modal({ isOpen, onClose, children }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-background w-full max-w-2xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

function ModalHeader({ moduleType, isNew, onClose }) {
    const titles = {
        'video': isNew ? "Add Video Lesson" : "Edit Video Lesson",
        'text': isNew ? "Add Text Lesson" : "Edit Text Lesson",
        'quiz': isNew ? "Add Quiz" : "Edit Quiz",
        'chat': isNew ? "Add Chat Simulation" : "Edit Chat Simulation"
    };

    const title = titles[moduleType] || (isNew ? "Add Module" : "Edit Module");

    const icons = {
        'video': <Youtube className="h-5 w-5 text-red-500" />,
        'text': <Type className="h-5 w-5 text-blue-500" />,
        'quiz': <HelpCircle className="h-5 w-5 text-purple-500" />,
        'chat': <MessageCircle className="h-5 w-5 text-cyan-500" />
    };

    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                {icons[moduleType]}
                <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="text-sm text-gray-500">
                        {isNew ? 'Create a new module' : 'Update existing module'}
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-gray-100"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

function TitleInput({ module, setModule }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
                required
                value={module.title}
                onChange={(e) => setModule({ ...module, title: e.target.value })}
                placeholder="Module Title"
                className="w-full"
            />
        </div>
    );
}

function VideoEditor({ videoUrl, setVideoUrl, currentContent }) {
    const extractYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const youtubeId = extractYouTubeId(videoUrl || currentContent);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">YouTube Video URL *</label>
                <div className="flex gap-2 items-center">
                    <Input
                        value={videoUrl || currentContent || ""}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1"
                        required
                    />
                    <div className="p-2 border rounded">
                        <Youtube className="h-6 w-6 text-red-500" />
                    </div>
                </div>
                <p className="text-xs text-gray-500">
                    Enter a valid YouTube URL. The video will be embedded in your course.
                </p>
            </div>

            {youtubeId && (
                <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <div className="aspect-video">
                        <RestrictedYouTubeEmbed videoId={youtubeId} />
                    </div>
                </div>
            )}
        </div>
    );
}

function TextEditor({ module, setModule, showRichTextEditor, setShowRichTextEditor }) {
    useEffect(() => {
        console.log("📝 TextEditor content DEBUG:");
        console.log("Content:", module.content);
        console.log("Content length:", module.content?.length || 0);
        console.log("Content type:", typeof module.content);
        console.log("Is content HTML?", module.content?.includes('<') ? 'Yes' : 'No');
    }, [module.content]);

    const handleTextareaChange = (e) => {
        const newContent = e.target.value;
        console.log("📝 Textarea onChange - new content:", newContent);
        console.log("📝 Content length:", newContent.length);
        setModule({ ...module, content: newContent });
    };

    const handleRichTextEditorChange = (content) => {
        console.log("📝 RichTextEditor onChange:", content);
        console.log("📝 Content length:", content.length);
        console.log("📝 Is HTML?", content.includes('<') ? 'Yes' : 'No');
        setModule({ ...module, content });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Content *</label>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                        {module.content?.length || 0} characters
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRichTextEditor(true)}
                        className="flex items-center gap-2"
                    >
                        <Maximize2 className="h-4 w-4" />
                        Open Enhanced Editor
                    </Button>
                </div>
            </div>
            <textarea
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={module.content || ""}
                onChange={handleTextareaChange}
                placeholder="# Lesson Content..."
                required
            />
            <div className="text-xs text-gray-500">
                <p>Use Markdown or the enhanced editor for rich formatting.</p>
                {module.content && module.content.length > 0 && (
                    <div className="mt-2 p-2 border rounded bg-gray-50">
                        <p className="font-medium">Preview:</p>
                        <div
                            className="mt-1 text-sm"
                            dangerouslySetInnerHTML={{ __html: module.content.substring(0, 200) + (module.content.length > 200 ? '...' : '') }}
                        />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showRichTextEditor && (
                    <RichTextEditor
                        content={module.content || ""}
                        onChange={handleRichTextEditorChange}
                        onClose={() => setShowRichTextEditor(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ChatEditor({ availableCases, selectedCases, setSelectedCases, loading, error, onRetry }) {
    const selectedIds = new Set(selectedCases.map((caseItem) => caseItem.id));

    const handleRemoveCase = (caseId) => {
        setSelectedCases((prev) => prev.filter((caseItem) => caseItem.id !== caseId));
    };

    const handleToggleCase = (caseItem) => {
        if (!caseItem?.id) return;
        setSelectedCases((prev) => {
            const exists = prev.some((existing) => existing.id === caseItem.id);
            if (exists) {
                return prev.filter((existing) => existing.id !== caseItem.id);
            }
            return [
                ...prev,
                {
                    id: caseItem.id,
                    title: caseItem.title || "",
                    description: caseItem.description || "",
                    difficulty: caseItem.difficulty || ""
                }
            ];
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Simulation Cases *</label>
                <span className="text-xs text-muted-foreground">Selected: {selectedCases.length}</span>
            </div>

            {loading && (
                <div className="text-sm text-muted-foreground">Loading cases...</div>
            )}

            {!loading && error && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <span>{error}</span>
                    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        Retry
                    </Button>
                </div>
            )}

            {!loading && !error && availableCases.length === 0 && (
                <div className="text-sm text-muted-foreground">No cases available yet.</div>
            )}

            {!loading && !error && availableCases.length > 0 && (
                <div className="space-y-2">
                    {availableCases.map((caseItem) => {
                        const isSelected = selectedIds.has(caseItem.id);
                        return (
                            <button
                                key={caseItem.id}
                                type="button"
                                onClick={() => handleToggleCase(caseItem)}
                                className={`w-full text-left rounded-lg border px-3 py-2 transition ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="font-medium text-sm">
                                            {caseItem.title || "Untitled case"}
                                        </div>
                                        {caseItem.description && (
                                            <div className="text-xs text-muted-foreground">
                                                {caseItem.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {caseItem.difficulty && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                {caseItem.difficulty}
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                            {isSelected ? 'Added' : 'Add'}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {selectedCases.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Selected Cases</div>
                    <div className="flex flex-wrap gap-2">
                        {selectedCases.map((caseItem) => (
                            <div key={caseItem.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                                <span className="truncate">{caseItem.title || caseItem.id}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCase(caseItem.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ModalActions({ loading, onClose }) {
    return (
        <div className="flex justify-end gap-2 pt-6 border-t">
            <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="min-w-[80px]"
            >
                Cancel
            </Button>
            <Button
                type="submit"
                disabled={loading}
                className="relative overflow-hidden min-w-[120px] bg-blue-600 hover:bg-blue-700"
            >
                {loading && (
                    <motion.div
                        className="absolute inset-0 bg-blue-500/20"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                )}
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    "Save Module"
                )}
            </Button>
        </div>
    );
}
