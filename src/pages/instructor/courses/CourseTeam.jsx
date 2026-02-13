import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { invitationService } from "../../../services/invitationService";
import { mentorService } from "../../../services/mentorService";
import { userService } from "../../../services/userService";

export default function CourseTeam({ courseId }) {
    const [invitations, setInvitations] = useState([]);
    const [mentorAssignments, setMentorAssignments] = useState([]);
    const [mentorsById, setMentorsById] = useState(new Map());
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("partner_instructor");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!courseId) return;
        loadData();
    }, [courseId]);

    const loadData = async () => {
        if (!courseId) return;
        try {
            setLoading(true);
            const [pendingInvites, assignments] = await Promise.all([
                invitationService.list({ course_id: courseId, status_filter: "pending" }),
                mentorService.listMentorCourseAssignments({ course_id: courseId, status_filter: "active" }),
            ]);
            setInvitations(pendingInvites || []);
            setMentorAssignments(assignments || []);

            const mentorIds = [...new Set((assignments || []).map((item) => item.mentor_id).filter(Boolean))];
            if (mentorIds.length > 0) {
                const mentors = await userService.list({ ids: mentorIds.join(",") });
                setMentorsById(new Map((mentors || []).map((mentor) => [mentor.id, mentor])));
            } else {
                setMentorsById(new Map());
            }
        } catch (error) {
            console.error("Failed to load course team:", error);
        } finally {
            setLoading(false);
        }
    };

    const inviteStats = useMemo(() => {
        const accepted = invitations.filter((item) => item.status === "accepted").length;
        const pending = invitations.filter((item) => item.status === "pending").length;
        return { accepted, pending };
    }, [invitations]);

    const handleInvite = async () => {
        if (!courseId || !inviteEmail.trim()) {
            alert("Enter an email to invite.");
            return;
        }
        try {
            await invitationService.create({
                course_id: courseId,
                invitee_email: inviteEmail.trim(),
                role: inviteRole,
            });
            setInviteEmail("");
            await loadData();
        } catch (error) {
            console.error("Failed to send invitation:", error);
            alert("Could not create invitation.");
        }
    };

    const cancelInvite = async (invitationId) => {
        const ok = window.confirm("Cancel this invitation?");
        if (!ok) return;
        try {
            await invitationService.remove(invitationId);
            await loadData();
        } catch (error) {
            console.error("Failed to cancel invite:", error);
            alert("Could not cancel invitation.");
        }
    };

    const unassignMentor = async (assignmentId) => {
        const ok = window.confirm("Remove this mentor from the course?");
        if (!ok) return;
        try {
            await mentorService.unassignMentorFromCourse(assignmentId);
            await loadData();
        } catch (error) {
            console.error("Failed to unassign mentor:", error);
            alert("Could not unassign mentor.");
        }
    };

    if (!courseId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Course Team</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Save the course first to manage team members.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Course Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <Input
                        placeholder="Invite instructor email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                    />
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value)}
                    >
                        <option value="partner_instructor">Partner instructor</option>
                        <option value="instructor">Instructor</option>
                    </select>
                    <Button onClick={handleInvite}>Invite</Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Assigned Mentors ({mentorAssignments.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {mentorAssignments.length === 0 ? (
                                <div className="text-xs text-muted-foreground">No active mentor assignments.</div>
                            ) : (
                                mentorAssignments.map((assignment) => {
                                    const mentor = mentorsById.get(assignment.mentor_id);
                                    return (
                                        <div
                                            key={assignment.id}
                                            className="flex items-center justify-between rounded-md border px-2 py-1"
                                        >
                                            <div className="text-xs">
                                                {mentor?.full_name || mentor?.name || mentor?.email || assignment.mentor_id}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => unassignMentor(assignment.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Pending Invitations ({inviteStats.pending})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {invitations.length === 0 ? (
                                <div className="text-xs text-muted-foreground">No invitations sent.</div>
                            ) : (
                                invitations.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center justify-between rounded-md border px-2 py-1"
                                    >
                                        <div className="text-xs">
                                            {invite.invitee_email} ({invite.role || "member"})
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => cancelInvite(invite.id)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {loading && <div className="text-xs text-muted-foreground">Refreshing team data...</div>}
            </CardContent>
        </Card>
    );
}
