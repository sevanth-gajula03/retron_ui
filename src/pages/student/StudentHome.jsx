import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { BookOpen, ClipboardList, Megaphone, Layers } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

export default function StudentHome() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        enrolledCourses: 0,
        availableCourses: 0,
        assessments: 0,
        announcements: 0
    });
    const [enrolledCourses, setEnrolledCourses] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const enrollments = await apiClient.get("/enrollments");
                const enrollmentList = Array.isArray(enrollments) ? enrollments : [];
                const enrolledCourseIds = Array.from(
                    new Set(enrollmentList.map((enrollment) => enrollment.course_id).filter(Boolean))
                );
                const courseResults = await Promise.allSettled(
                    enrolledCourseIds.map((courseId) => apiClient.get(`/courses/${courseId}`))
                );
                const enrolled = courseResults.flatMap((result) =>
                    result.status === "fulfilled" ? [result.value] : []
                );
                const failedCourses = courseResults.filter((result) => result.status === "rejected");
                if (failedCourses.length > 0) {
                    console.error("Error fetching some enrolled courses:", failedCourses.map((item) => item.reason));
                }

                setEnrolledCourses(enrolled);

                const [coursesResult, assessmentsResult, announcementsResult] = await Promise.allSettled([
                    apiClient.get("/courses"),
                    apiClient.get("/assessments"),
                    apiClient.get("/announcements")
                ]);

                if (coursesResult.status === "rejected") {
                    console.error("Error fetching courses:", coursesResult.reason);
                }
                if (assessmentsResult.status === "rejected") {
                    console.error("Error fetching assessments:", assessmentsResult.reason);
                }
                if (announcementsResult.status === "rejected") {
                    console.error("Error fetching announcements:", announcementsResult.reason);
                }

                const availableCourses =
                    coursesResult.status === "fulfilled" ? coursesResult.value.length : enrolled.length;
                const assessments = assessmentsResult.status === "fulfilled" ? assessmentsResult.value : [];
                const announcements = announcementsResult.status === "fulfilled" ? announcementsResult.value : [];

                setStats({
                    enrolledCourses: enrollmentList.length,
                    availableCourses,
                    assessments: assessments.length,
                    announcements: announcements.length
                });
            } catch (error) {
                console.error("Error loading student dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
                <p className="text-muted-foreground">Your learning overview at a glance.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Enrolled Courses"
                    value={stats.enrolledCourses}
                    icon={<Layers className="h-5 w-5" />}
                    loading={loading}
                />
                <StatCard
                    title="Available Courses"
                    value={stats.availableCourses}
                    icon={<BookOpen className="h-5 w-5" />}
                    loading={loading}
                />
                <StatCard
                    title="Assessments"
                    value={stats.assessments}
                    icon={<ClipboardList className="h-5 w-5" />}
                    loading={loading}
                />
                <StatCard
                    title="Announcements"
                    value={stats.announcements}
                    icon={<Megaphone className="h-5 w-5" />}
                    loading={loading}
                />
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">My Courses</h2>
                    <Link to="/student/courses" className="text-sm text-primary hover:underline">
                        View all
                    </Link>
                </div>

                {loading ? (
                    <div className="text-sm text-muted-foreground">Loading courses...</div>
                ) : enrolledCourses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No enrolled courses yet.</div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {enrolledCourses.map((course) => (
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
                                    <CardTitle className="text-base">{course.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {course.description || "No description"}
                                    </p>
                                    <Link to={`/student/course/${course.id}`}>
                                        <Button size="sm">Open course</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, loading }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {loading ? "—" : value}
                </div>
            </CardContent>
        </Card>
    );
}
