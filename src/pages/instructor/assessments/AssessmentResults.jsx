import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { apiClient } from "../../../lib/apiClient";

export default function AssessmentResults() {
    const { id: assessmentId } = useParams();
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        const load = async () => {
            if (!assessmentId) return;
            const data = await apiClient.get(`/assessments/${assessmentId}/submissions`);
            setSubmissions(data);
        };
        load();
    }, [assessmentId]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessment Results</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Assessment Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {submissions.map((sub) => (
                            <div key={sub.id} className="text-sm">
                                Submission: {sub.id}
                            </div>
                        ))}
                        {submissions.length === 0 && (
                            <div className="text-muted-foreground">No submissions yet.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
