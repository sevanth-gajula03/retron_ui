import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { apiClient } from "../../../lib/apiClient";
import { userService } from "../../../services/userService";
import { mentorService } from "../../../services/mentorService";
import { assessmentAccessService } from "../../../services/assessmentAccessService";

export default function PartnerInstructor() {
    const [partnerInstructors, setPartnerInstructors] = useState([]);
    const [courses, setCourses] = useState([]);
    const [courseAssignments, setCourseAssignments] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedMentorId, setSelectedMentorId] = useState("");
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [mentors, myCourses, assignments] = await Promise.all([
                userService.list({ role: "partner_instructor" }),
                apiClient.get("/courses"),
                mentorService.listMentorCourseAssignments({ status_filter: "active" }),
            ]);

            setPartnerInstructors(mentors || []);
            setCourses(myCourses || []);
            setCourseAssignments(assignments || []);

            if ((mentors || []).length > 0 && !selectedMentorId) setSelectedMentorId(mentors[0].id);
            if ((myCourses || []).length > 0 && !selectedCourseId) setSelectedCourseId(myCourses[0].id);
        } catch (error) {
            console.error("Error loading partner instructors:", error);
            alert("Failed to load partner instructor data.");
        } finally {
            setLoading(false);
        }
    };

    const assignmentMap = useMemo(() => {
        const map = new Map();
        courseAssignments.forEach((assignment) => {
            map.set(`${assignment.mentor_id}:${assignment.course_id}`, assignment);
        });
        return map;
    }, [courseAssignments]);

    const filteredInstructors = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return partnerInstructors;
        return partnerInstructors.filter((mentor) => {
            const name = (mentor.full_name || mentor.name || "").toLowerCase();
            const email = (mentor.email || "").toLowerCase();
            const college = (mentor.college || "").toLowerCase();
            return name.includes(query) || email.includes(query) || college.includes(query);
        });
    }, [partnerInstructors, search]);

    const handleAssignCourse = async () => {
        if (!selectedMentorId || !selectedCourseId) {
            alert("Choose both mentor and course.");
            return;
        }

        try {
            setSaving(true);
            await mentorService.assignMentorToCourse({
                mentor_id: selectedMentorId,
                course_id: selectedCourseId,
            });
            await loadData();
        } catch (error) {
            console.error("Failed to assign course:", error);
            alert("Could not assign course to partner instructor.");
        } finally {
            setSaving(false);
        }
    };

    const handleUnassignCourse = async (assignmentId) => {
        const ok = window.confirm("Unassign this course from the partner instructor?");
        if (!ok) return;
        try {
            await mentorService.unassignMentorFromCourse(assignmentId);
            await loadData();
        } catch (error) {
            console.error("Failed to unassign course:", error);
            alert("Could not unassign course.");
        }
    };

    const handleGrantAssessments = async (mentorId) => {
        try {
            setSaving(true);
            const [assignments, assessments] = await Promise.all([
                mentorService.listStudentMentorAssignments({ mentor_id: mentorId, status_filter: "active" }),
                apiClient.get("/assessments"),
            ]);

            const studentIds = [...new Set((assignments || []).map((item) => item.student_id))];
            const mentorAssessments = (assessments || []).filter((item) => item.created_by === mentorId);

            if (studentIds.length === 0) {
                alert("This partner instructor has no active student assignments.");
                return;
            }

            if (mentorAssessments.length === 0) {
                alert("No assessments created by this partner instructor yet.");
                return;
            }

            await assessmentAccessService.bulkGrant({
                student_ids: studentIds,
                assessment_ids: mentorAssessments.map((item) => item.id),
                mentor_id: mentorId,
                status: "active",
            });

            alert("Assessment access granted to assigned students.");
        } catch (error) {
            console.error("Failed to grant assessment access:", error);
            alert("Could not grant assessment access.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading partner instructors...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Partner Instructors</h1>
                    <p className="text-sm text-muted-foreground">
                        Assign courses, review details, and grant assessment access.
                    </p>
                </div>
                <Button variant="outline" onClick={loadData}>
                    Refresh
                </Button>
            </div>

            <div>
                <Link to="/instructor/partner-instructors/students">
                    <Button variant="outline">Open Student Assignment Overview</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assign Course</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedMentorId}
                        onChange={(event) => setSelectedMentorId(event.target.value)}
                    >
                        <option value="">Select partner instructor</option>
                        {partnerInstructors.map((mentor) => (
                            <option key={mentor.id} value={mentor.id}>
                                {mentor.full_name || mentor.name || mentor.email}
                            </option>
                        ))}
                    </select>
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedCourseId}
                        onChange={(event) => setSelectedCourseId(event.target.value)}
                    >
                        <option value="">Select course</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                    <Button onClick={handleAssignCourse} disabled={saving}>
                        {saving ? "Saving..." : "Assign"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Directory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        placeholder="Search by name, email, or college"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />

                    {filteredInstructors.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No partner instructors found.</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {filteredInstructors.map((mentor) => {
                                const activeCourseAssignments = courses.filter((course) =>
                                    assignmentMap.has(`${mentor.id}:${course.id}`)
                                );

                                return (
                                    <Card key={mentor.id} className="border-dashed">
                                        <CardContent className="space-y-3 p-4">
                                            <div>
                                                <div className="font-semibold">
                                                    {mentor.full_name || mentor.name || "Unnamed"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{mentor.email}</div>
                                                {mentor.college && (
                                                    <div className="text-xs text-muted-foreground">
                                                        College: {mentor.college}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-medium uppercase text-muted-foreground">
                                                    Assigned Courses ({activeCourseAssignments.length})
                                                </div>
                                                {activeCourseAssignments.length === 0 ? (
                                                    <div className="text-xs text-muted-foreground">No active assignments.</div>
                                                ) : (
                                                    activeCourseAssignments.map((course) => {
                                                        const assignment = assignmentMap.get(`${mentor.id}:${course.id}`);
                                                        return (
                                                            <div
                                                                key={course.id}
                                                                className="flex items-center justify-between rounded-md border px-2 py-1"
                                                            >
                                                                <span className="text-xs">{course.title}</span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleUnassignCourse(assignment.id)}
                                                                >
                                                                    Unassign
                                                                </Button>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Link to={`/instructor/partner-instructors/${mentor.id}`}>
                                                    <Button size="sm" variant="outline">
                                                        View Details
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleGrantAssessments(mentor.id)}
                                                    disabled={saving}
                                                >
                                                    Grant Assessments
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
