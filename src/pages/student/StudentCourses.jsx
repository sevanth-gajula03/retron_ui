import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { apiClient } from "../../lib/apiClient";

export default function StudentCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const enrollments = await apiClient.get("/enrollments");
            const enrolledCourseIds = Array.from(
                new Set((enrollments || []).map((enrollment) => enrollment.course_id).filter(Boolean))
            );

            if (enrolledCourseIds.length === 0) {
                setCourses([]);
                return;
            }

            const results = await Promise.allSettled(
                enrolledCourseIds.map((courseId) => apiClient.get(`/courses/${courseId}`))
            );
            const enrolledCourses = results.flatMap((result) =>
                result.status === "fulfilled" ? [result.value] : []
            );
            const failed = results.filter((result) => result.status === "rejected");
            if (failed.length > 0) {
                console.error("Error fetching some enrolled courses:", failed.map((item) => item.reason));
            }

            setCourses(enrolledCourses);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading courses...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
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
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {course.description || "No description"}
                            </p>
                            <Link to={`/student/course/${course.id}`}>
                                <Button size="sm">View</Button>
                            </Link>
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
