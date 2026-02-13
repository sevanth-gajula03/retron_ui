import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { userService } from "../../../services/userService";
import { mentorService } from "../../../services/mentorService";
import { apiClient } from "../../../lib/apiClient";

export default function MentorDetails() {
    const { mentorId } = useParams();
    const navigate = useNavigate();
    const [mentor, setMentor] = useState(null);
    const [studentAssignments, setStudentAssignments] = useState([]);
    const [courseAssignments, setCourseAssignments] = useState([]);
    const [studentsById, setStudentsById] = useState(new Map());
    const [coursesById, setCoursesById] = useState(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (mentorId) loadData();
    }, [mentorId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [mentorData, mentorStudents, mentorCourses] = await Promise.all([
                userService.getById(mentorId),
                mentorService.listStudentMentorAssignments({ mentor_id: mentorId }),
                mentorService.listMentorCourseAssignments({ mentor_id: mentorId }),
            ]);

            setMentor(mentorData);
            setStudentAssignments(mentorStudents || []);
            setCourseAssignments(mentorCourses || []);

            const studentIds = [...new Set((mentorStudents || []).map((item) => item.student_id).filter(Boolean))];
            const courseIds = [...new Set((mentorCourses || []).map((item) => item.course_id).filter(Boolean))];

            const [students, courses] = await Promise.all([
                studentIds.length ? userService.list({ ids: studentIds.join(",") }) : Promise.resolve([]),
                courseIds.length
                    ? Promise.allSettled(courseIds.map((courseId) => apiClient.get(`/courses/${courseId}`)))
                    : Promise.resolve([]),
            ]);

            setStudentsById(new Map((students || []).map((item) => [item.id, item])));
            const resolvedCourses = Array.isArray(courses)
                ? courses.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
                : [];
            setCoursesById(new Map(resolvedCourses.map((item) => [item.id, item])));
        } catch (error) {
            console.error("Failed to load mentor details:", error);
            alert("Could not load mentor details.");
            navigate("/instructor/partner-instructors");
        } finally {
            setLoading(false);
        }
    };

    const activeStudents = useMemo(
        () => studentAssignments.filter((item) => item.status === "active"),
        [studentAssignments]
    );
    const activeCourses = useMemo(
        () => courseAssignments.filter((item) => item.status === "active"),
        [courseAssignments]
    );

    const deactivateStudent = async (assignmentId) => {
        const ok = window.confirm("Unassign this student from mentor?");
        if (!ok) return;
        try {
            await mentorService.unassignStudentMentorAssignment(assignmentId);
            await loadData();
        } catch (error) {
            console.error("Failed to unassign student:", error);
            alert("Could not unassign student.");
        }
    };

    const deactivateCourse = async (assignmentId) => {
        const ok = window.confirm("Unassign this course from mentor?");
        if (!ok) return;
        try {
            await mentorService.unassignMentorFromCourse(assignmentId);
            await loadData();
        } catch (error) {
            console.error("Failed to unassign course:", error);
            alert("Could not unassign course.");
        }
    };

    if (loading) return <div>Loading mentor details...</div>;
    if (!mentor) return <div>Mentor not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mentor Details</h1>
                    <p className="text-sm text-muted-foreground">{mentor.full_name || mentor.name || mentor.email}</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/instructor/partner-instructors">
                        <Button variant="outline">Back</Button>
                    </Link>
                    <Button variant="outline" onClick={loadData}>
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="font-medium">{mentor.full_name || mentor.name || "Unnamed"}</div>
                        <div className="text-muted-foreground">{mentor.email}</div>
                        {mentor.college && <div className="text-muted-foreground">College: {mentor.college}</div>}
                        {mentor.phone && <div className="text-muted-foreground">Phone: {mentor.phone}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Assigned Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{activeStudents.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Assigned Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{activeCourses.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Students</CardTitle>
                </CardHeader>
                <CardContent>
                    {activeStudents.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No active student assignments.</div>
                    ) : (
                        <div className="space-y-2">
                            {activeStudents.map((assignment) => {
                                const student = studentsById.get(assignment.student_id);
                                return (
                                    <div
                                        key={assignment.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                                    >
                                        <div>
                                            <div className="text-sm font-medium">
                                                {student?.full_name || student?.name || assignment.student_id}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{student?.email || "N/A"}</div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => deactivateStudent(assignment.id)}>
                                            Unassign
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Courses</CardTitle>
                </CardHeader>
                <CardContent>
                    {activeCourses.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No active course assignments.</div>
                    ) : (
                        <div className="space-y-2">
                            {activeCourses.map((assignment) => {
                                const course = coursesById.get(assignment.course_id);
                                return (
                                    <div
                                        key={assignment.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                                    >
                                        <div>
                                            <div className="text-sm font-medium">
                                                {course?.title || assignment.course_id}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Status: {assignment.status}
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => deactivateCourse(assignment.id)}>
                                            Unassign
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
