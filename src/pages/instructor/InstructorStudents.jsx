import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { apiClient } from "../../lib/apiClient";
import { userService } from "../../services/userService";
import { courseProgressService } from "../../services/courseProgressService";

const clampPercent = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
};

export default function InstructorStudents() {
    const [courses, setCourses] = useState([]);
    const [rows, setRows] = useState([]);
    const [courseFilter, setCourseFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const myCourses = await apiClient.get("/courses");
            setCourses(myCourses || []);

            const enrollmentResults = await Promise.allSettled(
                (myCourses || []).map((course) => apiClient.get(`/enrollments?course_id=${course.id}`))
            );

            const enrollments = enrollmentResults.flatMap((result) =>
                result.status === "fulfilled" ? result.value || [] : []
            );
            const uniqueStudentIds = [...new Set(enrollments.map((item) => item.user_id).filter(Boolean))];

            if (uniqueStudentIds.length === 0) {
                setRows([]);
                return;
            }

            const students = await userService.list({ ids: uniqueStudentIds.join(",") });
            const studentMap = new Map((students || []).map((student) => [student.id, student]));

            const progressResults = await Promise.allSettled(
                (myCourses || []).map((course) => courseProgressService.list({ course_id: course.id }))
            );
            const progressRows = progressResults.flatMap((result) =>
                result.status === "fulfilled" ? result.value || [] : []
            );

            const progressMap = new Map();
            progressRows.forEach((item) => {
                progressMap.set(`${item.user_id}:${item.course_id}`, item);
            });

            const expandedRows = enrollments.map((enrollment) => {
                const student = studentMap.get(enrollment.user_id) || {};
                const course = (myCourses || []).find((item) => item.id === enrollment.course_id);
                const progress = progressMap.get(`${enrollment.user_id}:${enrollment.course_id}`);
                const percent = clampPercent(progress?.module_progress_percentage || 0);
                const bannedFrom = Array.isArray(student.banned_from) ? student.banned_from : [];
                return {
                    id: `${enrollment.user_id}:${enrollment.course_id}`,
                    studentId: enrollment.user_id,
                    courseId: enrollment.course_id,
                    studentName: student.full_name || student.name || "Unnamed Student",
                    studentEmail: student.email || "N/A",
                    courseTitle: course?.title || "Unknown Course",
                    progressPercent: percent,
                    bannedFrom,
                };
            });

            expandedRows.sort((a, b) => a.studentName.localeCompare(b.studentName));
            setRows(expandedRows);
        } catch (error) {
            console.error("Error loading instructor student data:", error);
            alert("Failed to load students. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleBan = async (row) => {
        const currentlyBanned = row.bannedFrom.includes(row.courseId);
        const action = currentlyBanned ? "unban" : "ban";
        const ok = window.confirm(`Do you want to ${action} this student for ${row.courseTitle}?`);
        if (!ok) return;

        try {
            setSavingId(row.id);
            const nextBannedFrom = currentlyBanned
                ? row.bannedFrom.filter((item) => item !== row.courseId)
                : [...new Set([...row.bannedFrom, row.courseId])];

            const updated = await userService.update(row.studentId, { banned_from: nextBannedFrom });
            const normalized = Array.isArray(updated?.banned_from) ? updated.banned_from : nextBannedFrom;

            setRows((prev) =>
                prev.map((item) =>
                    item.studentId === row.studentId ? { ...item, bannedFrom: normalized } : item
                )
            );
        } catch (error) {
            console.error("Failed to toggle ban:", error);
            alert("Could not update ban status. Check API permissions and try again.");
        } finally {
            setSavingId("");
        }
    };

    const filteredRows = useMemo(() => {
        if (courseFilter === "all") return rows;
        return rows.filter((row) => row.courseId === courseFilter);
    }, [rows, courseFilter]);

    if (loading) return <div>Loading students...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Enrolled Students</h1>
                <div className="flex gap-2">
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={courseFilter}
                        onChange={(event) => setCourseFilter(event.target.value)}
                    >
                        <option value="all">All Courses</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                    <Button variant="outline" onClick={loadData}>
                        Refresh
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Student Course Access</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredRows.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No students found for the selected filter.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="py-2 pr-4 font-medium">Student</th>
                                        <th className="py-2 pr-4 font-medium">Course</th>
                                        <th className="py-2 pr-4 font-medium">Progress</th>
                                        <th className="py-2 pr-4 font-medium">Status</th>
                                        <th className="py-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map((row) => {
                                        const isBanned = row.bannedFrom.includes(row.courseId);
                                        return (
                                            <tr key={row.id} className="border-b last:border-b-0">
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium">
                                                        <Link
                                                            to={`/instructor/students/${row.studentId}`}
                                                            className="hover:underline"
                                                        >
                                                            {row.studentName}
                                                        </Link>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{row.studentEmail}</div>
                                                </td>
                                                <td className="py-3 pr-4">{row.courseTitle}</td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${row.progressPercent}%` }}
                                                            />
                                                        </div>
                                                        <span>{row.progressPercent}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                                            isBanned
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-emerald-100 text-emerald-700"
                                                        }`}
                                                    >
                                                        {isBanned ? "Banned" : "Active"}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Link to={`/instructor/students/${row.studentId}`}>
                                                            <Button size="sm" variant="outline">Details</Button>
                                                        </Link>
                                                        <Button
                                                            size="sm"
                                                            variant={isBanned ? "outline" : "destructive"}
                                                            onClick={() => toggleBan(row)}
                                                            disabled={savingId === row.id}
                                                        >
                                                            {savingId === row.id
                                                                ? "Saving..."
                                                                : isBanned
                                                                  ? "Unban"
                                                                  : "Ban"}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
