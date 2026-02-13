import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../lib/apiClient";
import { assessmentAccessService } from "../../../services/assessmentAccessService";

export default function StudentAssessments() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAssessments();
    }, []);

    const loadAssessments = async () => {
        try {
            setLoading(true);
            const accessRows = await assessmentAccessService.list({ status_filter: "active" });
            const uniqueAssessmentIds = [...new Set((accessRows || []).map((row) => row.assessment_id).filter(Boolean))];

            if (uniqueAssessmentIds.length === 0) {
                setItems([]);
                return;
            }

            const assessmentResults = await Promise.allSettled(
                uniqueAssessmentIds.map((assessmentId) => apiClient.get(`/assessments/${assessmentId}`))
            );

            const assessments = assessmentResults.flatMap((result) =>
                result.status === "fulfilled" ? [result.value] : []
            );

            const rows = assessments.map((assessment) => {
                const access = (accessRows || []).find((row) => row.assessment_id === assessment.id);
                return {
                    ...assessment,
                    accessStatus: access?.status || "active",
                    grantedAt: access?.granted_at || access?.created_at || null,
                };
            });

            rows.sort((a, b) => {
                const left = a.grantedAt ? new Date(a.grantedAt).getTime() : 0;
                const right = b.grantedAt ? new Date(b.grantedAt).getTime() : 0;
                return right - left;
            });
            setItems(rows);
        } catch (error) {
            console.error("Error loading student assessments:", error);
            alert("Could not load assessments.");
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(
        () => ({
            total: items.length,
            active: items.filter((item) => item.accessStatus === "active").length,
        }),
        [items]
    );

    if (loading) return <div>Loading assessments...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
                    <p className="text-sm text-muted-foreground">Assessments granted by your instructors.</p>
                </div>
                <Button variant="outline" onClick={loadAssessments}>
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Assigned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active Access</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{stats.active}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Available Assessments</CardTitle>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No assessments assigned yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {items.map((assessment) => (
                                <div
                                    key={assessment.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                                >
                                    <div>
                                        <div className="font-medium">{assessment.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {assessment.description || "No description"}
                                        </div>
                                    </div>
                                    <Link to={`/student/assessments/${assessment.id}`}>
                                        <Button size="sm">Start</Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
