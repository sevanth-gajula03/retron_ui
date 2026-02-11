import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { motion } from "framer-motion";
import SectionList from "./components/SectionList";
import AddSectionForm from "./components/AddSectionForm";
import ModuleEditor from "./components/ModuleEditor";
import { Card } from "../../../components/ui/card";
import { apiClient } from "../../../lib/apiClient";

export default function CurriculumEditor({ courseId }) {
    const [sections, setSections] = useState([]);
    const [editingModule, setEditingModule] = useState(null);

    const refreshSections = async () => {
        if (!courseId) return;
        const sectionsData = await apiClient.get(`/courses/${courseId}/sections`);
        const sectionsWithModules = await Promise.all(
            sectionsData.map(async (section) => {
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
        setSections(sectionsWithModules);
    };

    useEffect(() => {
        if (!courseId) return;
        let mounted = true;

        const loadSections = async () => {
            try {
                await refreshSections();
            } catch (error) {
                console.error("Failed to load sections:", error);
            }
        };

        loadSections();
        return () => {
            mounted = false;
        };
    }, [courseId]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <Card>
                <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10">
                    <CardTitle>Course Curriculum</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <SectionList
                        sections={sections}
                        courseId={courseId}
                        onEditModule={setEditingModule}
                        onRefreshSections={refreshSections}
                    />

                    <AddSectionForm
                        courseId={courseId}
                        sectionsLength={sections.length}
                        onSectionAdded={refreshSections}
                    />
                </CardContent>
            </Card>

            {editingModule && (
                <ModuleEditor
                    isOpen={!!editingModule}
                    onClose={(savedModule) => {
                        setEditingModule(null);
                        if (savedModule) refreshSections();
                    }}
                    moduleData={editingModule}
                    courseId={courseId}
                />
            )}
        </motion.div>
    );
}
