import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { parseChatContent } from "../../utils/chatContent";
import {
    startChatSession,
    sendChatMessage,
    listChatActions,
    performChatAction,
    evaluateChatSession
} from "../../services/chatSimulationService";
import { courseProgressService } from "../../services/courseProgressService";
import QuizModulePlayer from "./components/QuizModulePlayer";

export default function CoursePlayer() {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [sections, setSections] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [navLockedForQuiz, setNavLockedForQuiz] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseId) return;
        const load = async () => {
            try {
                setLoading(true);
                const courseData = await apiClient.get(`/courses/${courseId}`);
                const sectionData = await apiClient.get(`/courses/${courseId}/sections`);
                const sectionsWithModules = await Promise.all(
                    sectionData.map(async (section) => {
                        const modules = await apiClient.get(`/modules/section/${section.id}`);
                        const subSections = await apiClient.get(`/subsections/section/${section.id}`);
                        const subSectionsWithModules = await Promise.all(
                            subSections.map(async (subSection) => {
                                const subModules = await apiClient.get(`/modules/subsection/${subSection.id}`);
                                return { ...subSection, modules: subModules };
                            })
                        );
                        return { ...section, modules, subSections: subSectionsWithModules };
                    })
                );
                setCourse(courseData);
                setSections(sectionsWithModules);

                const firstModule = findFirstModule(sectionsWithModules);
                setSelectedModule(firstModule);
            } catch (error) {
                console.error("Error loading course:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [courseId]);

    const renderModuleContent = (mod) => {
        if (mod.type === "chat") {
            return <ChatSimulationPanel module={mod} />;
        }
        if (mod.type === "quiz") {
            return (
                <QuizModulePlayer
                    module={mod}
                    onNavigationLockChange={(locked) => setNavLockedForQuiz(Boolean(locked))}
                />
            );
        }
        if (!mod?.content) return null;
        if (mod.type === "video") {
            const youtubeId = extractYouTubeId(mod.content);
            if (youtubeId) {
                return (
                    <div className="flex h-full items-center justify-center">
                        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black/5 lg:h-full lg:w-auto lg:max-w-full lg:mx-auto">
                            <iframe
                                className="h-full w-full"
                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                title={mod.title || "Video"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                );
            }
            return (
                <div className="text-xs text-muted-foreground">
                    Video: {mod.content}
                </div>
            );
        }
        if (mod.content.includes("<")) {
            return (
                <div
                    className="text-sm text-muted-foreground prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: mod.content }}
                />
            );
        }
        return <div className="text-sm text-muted-foreground whitespace-pre-wrap">{mod.content}</div>;
    };

    const handleSelectModule = (nextModule) => {
        if (!nextModule) return;
        if (navLockedForQuiz && selectedModule?.id && nextModule.id && String(nextModule.id) !== String(selectedModule.id)) {
            window.alert("Complete the test before navigating to other curriculum items.");
            return;
        }
        setSelectedModule(nextModule);
    };

    useEffect(() => {
        if (!navLockedForQuiz) return;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [navLockedForQuiz]);

    const moduleMap = useMemo(() => {
        const map = new Map();
        sections.forEach((section) => {
            (section.modules || []).forEach((mod) => {
                map.set(mod.id, { ...mod, sectionTitle: section.title, subSectionTitle: null });
            });
            (section.subSections || []).forEach((subSection) => {
                (subSection.modules || []).forEach((mod) => {
                    map.set(mod.id, { ...mod, sectionTitle: section.title, subSectionTitle: subSection.title });
                });
            });
        });
        return map;
    }, [sections]);

    useEffect(() => {
        if (!selectedModule) {
            const firstModule = findFirstModule(sections);
            setSelectedModule(firstModule);
            return;
        }
        if (selectedModule?.id && moduleMap.has(selectedModule.id)) {
            setSelectedModule(moduleMap.get(selectedModule.id));
        }
    }, [moduleMap, sections]);

    useEffect(() => {
        if (!selectedModule || !courseId || moduleMap.size === 0) return;
        const moduleIds = Array.from(moduleMap.keys());
        const activeIndex = moduleIds.indexOf(selectedModule.id);
        const completed = activeIndex >= 0 ? moduleIds.slice(0, activeIndex + 1) : [];
        const percentage = moduleIds.length > 0 ? Math.round((completed.length / moduleIds.length) * 100) : 0;

        courseProgressService
            .upsert({
                course_id: courseId,
                completed_modules: completed,
                completed_module_count: completed.length,
                module_progress_percentage: percentage,
                last_accessed: new Date().toISOString(),
            })
            .catch((error) => {
                console.error("Failed to sync course progress:", error);
            });
    }, [selectedModule?.id, courseId, moduleMap.size]);

    if (loading) return <div>Loading course...</div>;
    if (!course) return <div>Course not found.</div>;

    return (
        <div className="flex h-full min-h-0 flex-col gap-6">
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
                        <p className="text-muted-foreground max-w-2xl">{course.description}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {sections.length} sections • {moduleMap.size} modules
                    </div>
                </div>
            </div>

            <div className="grid flex-1 min-h-0 auto-rows-fr gap-6 lg:grid-cols-[340px_1fr]">
                <div className="flex min-h-0 flex-col">
                    <Card className="flex h-full min-h-0 flex-col">
                        <CardHeader className="shrink-0">
                            <CardTitle className="text-base">Curriculum</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
                            {navLockedForQuiz && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                    Test in progress. Navigation is locked until you submit.
                                </div>
                            )}
                            {sections.map((section) => (
                                <div key={section.id} className="space-y-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {section.title}
                                    </div>
                                    {(section.modules || []).map((mod) => (
                                        <button
                                            key={mod.id}
                                            type="button"
                                            onClick={() => handleSelectModule({ ...mod, sectionTitle: section.title })}
                                            className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${
                                                selectedModule?.id === mod.id
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:bg-muted"
                                            }`}
                                        >
                                            <div className="font-medium">{mod.title || mod.type}</div>
                                            <div className="text-xs text-muted-foreground">Section module</div>
                                        </button>
                                    ))}

                                    {(section.subSections || []).map((subSection) => (
                                        <div key={subSection.id} className="space-y-2 rounded-md border border-dashed p-2">
                                            <div className="text-xs font-semibold text-muted-foreground">
                                                {subSection.title}
                                            </div>
                                            {(subSection.modules || []).map((mod) => (
                                                <button
                                                    key={mod.id}
                                                    type="button"
                                                    onClick={() =>
                                                        handleSelectModule({
                                                            ...mod,
                                                            sectionTitle: section.title,
                                                            subSectionTitle: subSection.title
                                                        })
                                                    }
                                                    className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${
                                                        selectedModule?.id === mod.id
                                                            ? "border-primary bg-primary/10"
                                                            : "border-border hover:bg-muted"
                                                    }`}
                                                >
                                                    <div className="font-medium">{mod.title || mod.type}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {subSection.duration || "Sub-section module"}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card className="flex h-full min-h-0 flex-col">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-lg">
                            {selectedModule?.title || "Select a module"}
                        </CardTitle>
                        {selectedModule?.sectionTitle && (
                            <div className="text-xs text-muted-foreground">
                                {selectedModule.sectionTitle}
                                {selectedModule.subSectionTitle ? ` / ${selectedModule.subSectionTitle}` : ""}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent
                        className={`flex-1 min-h-0 ${
                            selectedModule?.type === "chat" ? "overflow-y-auto pr-1" : ""
                        }`}
                    >
                        {selectedModule ? (
                            <div className={selectedModule.type === "video" ? "h-full" : "space-y-4"}>
                                {renderModuleContent(selectedModule)}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Choose a module from the left.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ChatSimulationPanel({ module }) {
    const { cases } = useMemo(() => parseChatContent(module?.content), [module?.content]);
    const [activeCase, setActiveCase] = useState(null);
    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");
    const [starting, setStarting] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [actions, setActions] = useState([]);
    const [actionsLoading, setActionsLoading] = useState(false);
    const [actionsError, setActionsError] = useState("");
    const [actionKeyLoading, setActionKeyLoading] = useState("");
    const [finalDiagnosis, setFinalDiagnosis] = useState("");
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [evaluationLoading, setEvaluationLoading] = useState(false);
    const [evaluationError, setEvaluationError] = useState("");

    useEffect(() => {
        setActiveCase(null);
        setSession(null);
        setMessages([]);
        setMessageInput("");
        setError("");
        setActions([]);
        setActionsError("");
        setActionKeyLoading("");
        setFinalDiagnosis("");
        setEvaluationResult(null);
        setEvaluationError("");
    }, [module?.id]);

    useEffect(() => {
        if (!session?.session_id) return;
        const loadActions = async () => {
            setActionsLoading(true);
            setActionsError("");
            try {
                const data = await listChatActions(session.session_id);
                setActions(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load actions:", err);
                setActionsError("Failed to load quick actions.");
                setActions([]);
            } finally {
                setActionsLoading(false);
            }
        };

        loadActions();
    }, [session?.session_id]);

    const handleStart = async (caseItem) => {
        if (!caseItem?.id || starting) return;
        setStarting(true);
        setError("");
        setActiveCase(caseItem);
        setSession(null);
        setMessages([]);
        setActions([]);
        setActionsError("");
        setActionKeyLoading("");
        setFinalDiagnosis("");
        setEvaluationResult(null);
        setEvaluationError("");
        try {
            const sessionData = await startChatSession(caseItem.id);
            setSession(sessionData);
            setMessages([
                {
                    role: "assistant",
                    content: `Simulation started for ${caseItem.title || "this case"}. Ask your questions to begin.`
                }
            ]);
        } catch (err) {
            console.error("Failed to start chat session:", err);
            setError("Failed to start simulation. Please try again.");
            setActiveCase(null);
        } finally {
            setStarting(false);
        }
    };

    const handleRefreshActions = async () => {
        if (!session?.session_id || actionsLoading) return;
        setActionsLoading(true);
        setActionsError("");
        try {
            const data = await listChatActions(session.session_id);
            setActions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load actions:", err);
            setActionsError("Failed to load quick actions.");
            setActions([]);
        } finally {
            setActionsLoading(false);
        }
    };

    const handleActionClick = async (action) => {
        if (!session?.session_id || !action?.key || actionKeyLoading) return;
        setActionKeyLoading(action.key);
        setActionsError("");
        setMessages((prev) => [
            ...prev,
            { role: "user", content: `[Action] ${action.label || action.key}` }
        ]);
        try {
            const response = await performChatAction(session.session_id, action.key);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: response.response || "" }
            ]);
        } catch (err) {
            console.error("Failed to perform action:", err);
            setActionsError("Failed to perform action. Please try again.");
        } finally {
            setActionKeyLoading("");
        }
    };

    const handleEvaluate = async () => {
        const trimmed = finalDiagnosis.trim();
        if (!session?.session_id) return;
        if (trimmed.length < 3) {
            setEvaluationError("Please enter a final diagnosis (at least 3 characters).");
            return;
        }
        setEvaluationLoading(true);
        setEvaluationError("");
        try {
            const response = await evaluateChatSession(session.session_id, trimmed);
            setEvaluationResult(response);
        } catch (err) {
            console.error("Failed to evaluate session:", err);
            setEvaluationError("Failed to evaluate. Please try again.");
        } finally {
            setEvaluationLoading(false);
        }
    };

    const handleSend = async () => {
        const trimmed = messageInput.trim();
        if (!trimmed || !session?.session_id) return;
        setMessageInput("");
        setSending(true);
        setError("");
        setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
        try {
            const response = await sendChatMessage(session.session_id, trimmed);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: response.assistant_message || "" }
            ]);
        } catch (err) {
            console.error("Failed to send chat message:", err);
            setError("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (!cases || cases.length === 0) {
        return <p className="text-sm text-muted-foreground">No cases are assigned to this simulation yet.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-sm font-semibold">Available Cases</h3>
                <div className="space-y-2">
                    {cases.map((caseItem) => (
                        <div key={caseItem.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <div className="text-sm font-medium">
                                    {caseItem.title || "Untitled case"}
                                </div>
                                {caseItem.description && (
                                    <div className="text-xs text-muted-foreground">{caseItem.description}</div>
                                )}
                                {caseItem.difficulty && (
                                    <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                        {caseItem.difficulty}
                                    </span>
                                )}
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => handleStart(caseItem)}
                                disabled={starting}
                            >
                                {starting && activeCase?.id === caseItem.id ? "Starting..." : "Start Simulation"}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            )}

            {session && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold">Simulation Chat</h3>
                            <p className="text-xs text-muted-foreground">
                                Case: {activeCase?.title || activeCase?.id}
                            </p>
                        </div>
                        <span className="text-xs text-muted-foreground">Session: {session.session_id}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Diagnostic Quick Actions</h4>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshActions}
                                disabled={actionsLoading}
                            >
                                {actionsLoading ? "Refreshing..." : "Refresh"}
                            </Button>
                        </div>

                        {actionsError && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                {actionsError}
                            </div>
                        )}

                        {!actionsLoading && actions.length === 0 && !actionsError && (
                            <div className="text-xs text-muted-foreground">
                                No quick actions available for this session.
                            </div>
                        )}

                        {actions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {actions.map((action) => (
                                    <Button
                                        key={action.key}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleActionClick(action)}
                                        disabled={Boolean(actionKeyLoading)}
                                        title={action.description}
                                    >
                                        {actionKeyLoading === action.key ? "Running..." : action.label}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-lg border bg-muted/10 p-3">
                        {messages.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                className={`rounded-md px-3 py-2 text-sm ${message.role === "user" ? "bg-primary/10 text-primary" : "bg-background"}`}
                            >
                                <div className="text-xs uppercase text-muted-foreground mb-1">
                                    {message.role === "user" ? "You" : "Assistant"}
                                </div>
                                <div className="whitespace-pre-wrap">{message.content}</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <textarea
                            value={messageInput}
                            onChange={(event) => setMessageInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    handleSend();
                                }
                            }}
                            rows={2}
                            placeholder="Type your message and press Enter"
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <Button type="button" onClick={handleSend} disabled={sending || !messageInput.trim()}>
                            {sending ? "Sending..." : "Send"}
                        </Button>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold">Evaluate Diagnosis</h4>
                                <p className="text-xs text-muted-foreground">Submit your final diagnosis for scoring.</p>
                            </div>
                        </div>

                        <textarea
                            value={finalDiagnosis}
                            onChange={(event) => setFinalDiagnosis(event.target.value)}
                            rows={3}
                            placeholder="Final diagnosis..."
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />

                        {evaluationError && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                {evaluationError}
                            </div>
                        )}

                        <Button
                            type="button"
                            onClick={handleEvaluate}
                            disabled={evaluationLoading}
                        >
                            {evaluationLoading ? "Evaluating..." : "Evaluate"}
                        </Button>

                        {evaluationResult && (
                            <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
                                <div className="grid gap-2 text-xs sm:grid-cols-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Reasoning</span>
                                        <span className="font-medium">{evaluationResult.reasoning_score}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Accuracy</span>
                                        <span className="font-medium">{evaluationResult.diagnostic_accuracy}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Safety</span>
                                        <span className="font-medium">{evaluationResult.safety_awareness}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Overall</span>
                                        <span className="font-medium">{evaluationResult.overall_score}</span>
                                    </div>
                                </div>
                                {evaluationResult.feedback && (
                                    <div className="text-xs text-muted-foreground">
                                        {evaluationResult.feedback}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

function findFirstModule(sections) {
    for (const section of sections) {
        const sectionModules = section.modules || [];
        if (sectionModules.length) return { ...sectionModules[0], sectionTitle: section.title };
        for (const subSection of section.subSections || []) {
            const subModules = subSection.modules || [];
            if (subModules.length) {
                return {
                    ...subModules[0],
                    sectionTitle: section.title,
                    subSectionTitle: subSection.title
                };
            }
        }
    }
    return null;
}
