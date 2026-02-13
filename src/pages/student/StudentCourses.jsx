import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { apiClient } from "../../lib/apiClient";
import { courseProgressService } from "../../services/courseProgressService";

export default function StudentCourses() {
    const [courses, setCourses] = useState([]);
    const [progressByCourse, setProgressByCourse] = useState(new Map());
    const [bannedFrom, setBannedFrom] = useState([]);
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

            const [progressRows, me] = await Promise.all([
                courseProgressService.list(),
                apiClient.get("/auth/me"),
            ]);
            const nextProgress = new Map();
            (progressRows || []).forEach((row) => {
                nextProgress.set(row.course_id, Math.max(0, Math.min(100, row.module_progress_percentage || 0)));
            });
            setProgressByCourse(nextProgress);
            setBannedFrom(Array.isArray(me?.banned_from) ? me.banned_from : []);
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
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${progressByCourse.get(course.id) || 0}%` }}
                                        />
                                    </div>
                                    <span>{progressByCourse.get(course.id) || 0}% complete</span>
                                </div>
                                {bannedFrom.includes(course.id) ? (
                                    <div className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-700">
                                        Access blocked by instructor for this course.
                                    </div>
                                ) : (
                                    <Link to={`/student/course/${course.id}`}>
                                        <Button size="sm">View</Button>
                                    </Link>
                                )}
                            </div>
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
