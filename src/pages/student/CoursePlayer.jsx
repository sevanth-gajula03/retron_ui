import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function CoursePlayer() {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [sections, setSections] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
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
        if (!mod?.content) return null;
        if (mod.type === "video") {
            const youtubeId = extractYouTubeId(mod.content);
            if (youtubeId) {
                return (
                    <div className="aspect-video w-full overflow-hidden rounded-lg border">
                        <iframe
                            className="h-full w-full"
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title={mod.title || "Video"}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
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

    if (loading) return <div>Loading course...</div>;
    if (!course) return <div>Course not found.</div>;

    return (
        <div className="space-y-8">
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

            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                <div className="space-y-4">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-base">Curriculum</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                            {sections.map((section) => (
                                <div key={section.id} className="space-y-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {section.title}
                                    </div>
                                    {(section.modules || []).map((mod) => (
                                        <button
                                            key={mod.id}
                                            type="button"
                                            onClick={() => setSelectedModule({ ...mod, sectionTitle: section.title })}
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
                                                        setSelectedModule({
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

                <Card>
                    <CardHeader>
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
                    <CardContent>
                        {selectedModule ? (
                            <div className="space-y-4">
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
