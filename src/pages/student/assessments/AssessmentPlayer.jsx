import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../lib/apiClient";

export default function AssessmentPlayer() {
    const { id: assessmentId } = useParams();
    const [assessment, setAssessment] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await apiClient.get(`/assessments/${assessmentId}`);
                setAssessment(data);
            } catch (error) {
                console.error("Error loading assessment:", error);
            }
        };
        if (assessmentId) load();
    }, [assessmentId]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessment Player</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Assessment Player</CardTitle>
                </CardHeader>
                <CardContent>
                    {assessment ? (
                        <div className="space-y-2">
                            <div className="font-medium">{assessment.title}</div>
                            <div className="text-sm text-muted-foreground">{assessment.description}</div>
                            <Button
                                onClick={() => apiClient.post(`/assessments/${assessment.id}/submit`, { answers: {} })}
                            >
                                Submit
                            </Button>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Loading assessment...</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
