import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../lib/apiClient";

export default function InstructorAssessments() {
    const [assessments, setAssessments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [courseId, setCourseId] = useState("");

    useEffect(() => {
        fetchAssessments();
        fetchCourses();
    }, []);

    const fetchAssessments = async () => {
        try {
            const data = await apiClient.get("/assessments");
            setAssessments(data);
        } catch (error) {
            console.error("Error fetching assessments:", error);
        }
    };

    const fetchCourses = async () => {
        try {
            const data = await apiClient.get("/courses");
            setCourses(data);
            if (data.length && !courseId) setCourseId(data[0].id);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleCreate = async () => {
        if (!courseId || !title.trim()) return;
        await apiClient.post("/assessments", {
            course_id: courseId,
            title,
            description
        });
        setTitle("");
        setDescription("");
        setCourseId("");
        fetchAssessments();
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Assessments</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                value={courseId}
                                onChange={(e) => setCourseId(e.target.value)}
                            >
                                <option value="" disabled>
                                    Select course
                                </option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                            <input
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                placeholder="Assessment title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                placeholder="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            <Button onClick={handleCreate}>Create Assessment</Button>
                        </div>
                        <div className="space-y-2">
                            {assessments.map((assessment) => (
                                <div key={assessment.id} className="text-sm">
                                    {assessment.title}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
