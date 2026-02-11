import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../lib/apiClient";

export default function AssessmentEditor() {
    const { id: assessmentId } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [prompt, setPrompt] = useState("");

    useEffect(() => {
        const load = async () => {
            if (!assessmentId) return;
            const data = await apiClient.get(`/assessments/${assessmentId}`);
            setAssessment(data);
        };
        load();
    }, [assessmentId]);

    const addQuestion = async () => {
        if (!prompt.trim()) return;
        await apiClient.post(`/assessments/${assessmentId}/questions`, {
            prompt,
            options: null,
            answer: null
        });
        setPrompt("");
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessment Editor</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Assessment Editor</CardTitle>
                </CardHeader>
                <CardContent>
                    {assessment ? (
                        <div className="space-y-3">
                            <div className="font-medium">{assessment.title}</div>
                            <div className="text-sm text-muted-foreground">{assessment.description}</div>
                            <input
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                placeholder="Question prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <Button onClick={addQuestion}>Add Question</Button>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Loading assessment...</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
