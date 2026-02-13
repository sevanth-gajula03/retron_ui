import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../lib/apiClient";
import { userService } from "../../../services/userService";

export default function AssessmentResults() {
    const { id: assessmentId } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [studentMap, setStudentMap] = useState(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!assessmentId) return;
        loadData();
    }, [assessmentId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [assessmentData, submissionData] = await Promise.all([
                apiClient.get(`/assessments/${assessmentId}`),
                apiClient.get(`/assessments/${assessmentId}/submissions`),
            ]);
            setAssessment(assessmentData);
            setSubmissions(Array.isArray(submissionData) ? submissionData : []);

            const studentIds = [...new Set((submissionData || []).map((item) => item.user_id).filter(Boolean))];
            if (studentIds.length > 0) {
                const students = await userService.list({ ids: studentIds.join(",") });
                setStudentMap(new Map((students || []).map((student) => [student.id, student])));
            } else {
                setStudentMap(new Map());
            }
        } catch (error) {
            console.error("Failed to load assessment results:", error);
            alert("Could not load assessment results.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading assessment results...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assessment Results</h1>
                    <p className="text-sm text-muted-foreground">{assessment?.title || "Assessment"}</p>
                </div>
                <Button variant="outline" onClick={loadData}>
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Submissions ({submissions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {submissions.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No submissions yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="py-2 pr-4 font-medium">Student</th>
                                        <th className="py-2 pr-4 font-medium">Submitted At</th>
                                        <th className="py-2 pr-4 font-medium">Score</th>
                                        <th className="py-2 pr-4 font-medium">Answer Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map((submission) => {
                                        const student = studentMap.get(submission.user_id);
                                        const answerCount = submission.answers
                                            ? Object.keys(submission.answers).length
                                            : 0;
                                        return (
                                            <tr key={submission.id} className="border-b last:border-b-0">
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium">
                                                        {student?.full_name || student?.name || submission.student_name || submission.user_id}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {student?.email || submission.student_email || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    {submission.created_at
                                                        ? new Date(submission.created_at).toLocaleString()
                                                        : "N/A"}
                                                </td>
                                                <td className="py-3 pr-4">{submission.score ?? "-"}</td>
                                                <td className="py-3 pr-4">{answerCount}</td>
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
