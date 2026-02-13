import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../lib/apiClient";

export default function AssessmentPlayer() {
    const { id: assessmentId } = useParams();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!assessmentId) return;
        loadAssessment();
    }, [assessmentId]);

    const loadAssessment = async () => {
        try {
            setLoading(true);
            const [assessmentData, questionData] = await Promise.all([
                apiClient.get(`/assessments/${assessmentId}`),
                apiClient.get(`/assessments/${assessmentId}/questions`),
            ]);
            setAssessment(assessmentData);
            setQuestions(Array.isArray(questionData) ? questionData : []);
        } catch (error) {
            console.error("Error loading assessment:", error);
            alert("Could not load this assessment.");
            navigate("/student/assessments");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const completion = useMemo(() => {
        if (questions.length === 0) return 0;
        const answeredCount = questions.filter((question) => (answers[question.id] || "").trim().length > 0).length;
        return Math.round((answeredCount / questions.length) * 100);
    }, [questions, answers]);

    const handleSubmit = async () => {
        if (!assessment) return;
        const ok = window.confirm("Submit this assessment now?");
        if (!ok) return;

        try {
            setSubmitting(true);
            await apiClient.post(`/assessments/${assessment.id}/submit`, {
                answers,
            });
            alert("Assessment submitted successfully.");
            navigate("/student/assessments");
        } catch (error) {
            console.error("Error submitting assessment:", error);
            alert("Failed to submit assessment.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading assessment...</div>;
    if (!assessment) return <div>Assessment not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{assessment.title}</h1>
                    <p className="text-sm text-muted-foreground">{assessment.description || "No description"}</p>
                </div>
                <div className="text-sm text-muted-foreground">Completion: {completion}%</div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Questions ({questions.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {questions.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                            No question objects found for this assessment. You can still submit an empty attempt.
                        </div>
                    ) : (
                        questions.map((question, index) => (
                            <div key={question.id} className="space-y-2 rounded-md border p-3">
                                <div className="font-medium">Q{index + 1}. {question.prompt}</div>

                                {Array.isArray(question.options) && question.options.length > 0 ? (
                                    <div className="space-y-1">
                                        {question.options.map((option, optionIndex) => {
                                            const value = typeof option === "string" ? option : option?.label || `${option}`;
                                            return (
                                                <label
                                                    key={`${question.id}-${optionIndex}`}
                                                    className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-sm"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${question.id}`}
                                                        value={value}
                                                        checked={answers[question.id] === value}
                                                        onChange={(event) =>
                                                            handleAnswerChange(question.id, event.target.value)
                                                        }
                                                    />
                                                    <span>{value}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <textarea
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        rows={3}
                                        placeholder="Type your answer"
                                        value={answers[question.id] || ""}
                                        onChange={(event) =>
                                            handleAnswerChange(question.id, event.target.value)
                                        }
                                    />
                                )}
                            </div>
                        ))
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate("/student/assessments")}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? "Submitting..." : "Submit Assessment"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
