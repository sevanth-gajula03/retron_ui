import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { apiClient } from "../../lib/apiClient";

export default function GuestCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get("/courses");
            setCourses(data);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading courses...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Guest Courses</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <Card key={course.id}>
                        {course.thumbnail_url && (
                            <div className="aspect-video w-full overflow-hidden rounded-t-md bg-muted">
                                <img
                                    src={course.thumbnail_url}
                                    alt={course.title}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {course.description || "No description"}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {courses.length === 0 && (
                <div className="text-center text-muted-foreground">No courses available.</div>
            )}
        </div>
    );
}
