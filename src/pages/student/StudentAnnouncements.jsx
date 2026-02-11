import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Megaphone } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

export default function StudentAnnouncements() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchAnnouncements();
        }
    }, [user]);

    const fetchAnnouncements = async () => {
        try {
            const enrollments = await apiClient.get("/enrollments");
            const enrolledCourseIds = enrollments.map((e) => e.course_id);

            if (enrolledCourseIds.length === 0) {
                setLoading(false);
                return;
            }

            const courses = await apiClient.get("/courses");
            const courseMap = new Map(courses.map((c) => [c.id, c.title]));

            const batches = await Promise.all(
                enrolledCourseIds.map((courseId) => apiClient.get(`/announcements?course_id=${courseId}`))
            );
            const data = batches.flat().map((ann) => ({
                ...ann,
                courseTitle: courseMap.get(ann.course_id) || "Unknown Course"
            }));

            data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setAnnouncements(data);

        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading announcements...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>

            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No announcements from your instructors yet.
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map(ann => (
                        <Card key={ann.id}>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Megaphone className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{ann.title}</CardTitle>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="font-medium text-foreground">{ann.courseTitle}</span>
                                        <span>•</span>
                                        <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{ann.body}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
