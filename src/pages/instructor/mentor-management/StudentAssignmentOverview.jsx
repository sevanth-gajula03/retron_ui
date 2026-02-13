import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { userService } from "../../../services/userService";
import { mentorService } from "../../../services/mentorService";

export default function StudentAssignmentOverview() {
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedMentorId, setSelectedMentorId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [studentList, mentorList, assignmentList] = await Promise.all([
                userService.list({ role: "student" }),
                userService.list({ role: "partner_instructor" }),
                mentorService.listStudentMentorAssignments(),
            ]);
            setStudents(studentList || []);
            setMentors(mentorList || []);
            setAssignments(assignmentList || []);

            if ((studentList || []).length > 0 && !selectedStudentId) setSelectedStudentId(studentList[0].id);
            if ((mentorList || []).length > 0 && !selectedMentorId) setSelectedMentorId(mentorList[0].id);
        } catch (error) {
            console.error("Failed to load assignment overview:", error);
            alert("Could not load student assignment data.");
        } finally {
            setLoading(false);
        }
    };

    const activeAssignments = useMemo(
        () => assignments.filter((item) => item.status === "active"),
        [assignments]
    );

    const mentorById = useMemo(() => new Map(mentors.map((mentor) => [mentor.id, mentor])), [mentors]);
    const assignmentsByStudent = useMemo(() => {
        const map = new Map();
        activeAssignments.forEach((assignment) => {
            if (!map.has(assignment.student_id)) map.set(assignment.student_id, []);
            map.get(assignment.student_id).push(assignment);
        });
        return map;
    }, [activeAssignments]);

    const filteredStudents = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return students;
        return students.filter((student) => {
            const name = (student.full_name || student.name || "").toLowerCase();
            const email = (student.email || "").toLowerCase();
            const college = (student.college || "").toLowerCase();
            return name.includes(query) || email.includes(query) || college.includes(query);
        });
    }, [students, search]);

    const handleAssign = async () => {
        if (!selectedStudentId || !selectedMentorId) {
            alert("Choose student and mentor.");
            return;
        }
        try {
            setSaving(true);
            await mentorService.assignStudentToMentor({
                student_id: selectedStudentId,
                mentor_id: selectedMentorId,
            });
            await loadData();
        } catch (error) {
            console.error("Failed to assign mentor:", error);
            alert("Could not assign mentor to student.");
        } finally {
            setSaving(false);
        }
    };

    const handleUnassign = async (assignmentId) => {
        const ok = window.confirm("Unassign this mentor from student?");
        if (!ok) return;
        try {
            await mentorService.unassignStudentMentorAssignment(assignmentId);
            await loadData();
        } catch (error) {
            console.error("Failed to unassign mentor:", error);
            alert("Could not unassign mentor.");
        }
    };

    if (loading) return <div>Loading student assignments...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Student Assignment Overview</h1>
                    <p className="text-sm text-muted-foreground">
                        Assign students to partner instructors and manage active links.
                    </p>
                </div>
                <Button variant="outline" onClick={loadData}>
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assign Mentor</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedStudentId}
                        onChange={(event) => setSelectedStudentId(event.target.value)}
                    >
                        <option value="">Select student</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.full_name || student.name || student.email}
                            </option>
                        ))}
                    </select>
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedMentorId}
                        onChange={(event) => setSelectedMentorId(event.target.value)}
                    >
                        <option value="">Select mentor</option>
                        {mentors.map((mentor) => (
                            <option key={mentor.id} value={mentor.id}>
                                {mentor.full_name || mentor.name || mentor.email}
                            </option>
                        ))}
                    </select>
                    <Button onClick={handleAssign} disabled={saving}>
                        {saving ? "Saving..." : "Assign"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Students</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        placeholder="Search students by name, email, or college"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />

                    {filteredStudents.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No students found.</div>
                    ) : (
                        <div className="space-y-3">
                            {filteredStudents.map((student) => {
                                const linkedAssignments = assignmentsByStudent.get(student.id) || [];
                                return (
                                    <div key={student.id} className="rounded-md border p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="font-medium">
                                                    {student.full_name || student.name || "Unnamed Student"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{student.email}</div>
                                                {student.college && (
                                                    <div className="text-xs text-muted-foreground">
                                                        College: {student.college}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="rounded-full bg-muted px-2 py-1 text-xs">
                                                {linkedAssignments.length} mentor
                                                {linkedAssignments.length === 1 ? "" : "s"}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {linkedAssignments.length === 0 ? (
                                                <div className="text-xs text-muted-foreground">
                                                    No active mentor assignments.
                                                </div>
                                            ) : (
                                                linkedAssignments.map((assignment) => {
                                                    const mentor = mentorById.get(assignment.mentor_id);
                                                    return (
                                                        <div
                                                            key={assignment.id}
                                                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1"
                                                        >
                                                            <div className="text-xs">
                                                                {mentor?.full_name || mentor?.name || mentor?.email || assignment.mentor_id}
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleUnassign(assignment.id)}
                                                            >
                                                                Unassign
                                                            </Button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
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
