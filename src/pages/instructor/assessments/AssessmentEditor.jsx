import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../lib/apiClient";

export default function AssessmentEditor() {
    const { id: assessmentId } = useParams();
    const navigate = useNavigate();
    const isNew = !assessmentId;
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [prompt, setPrompt] = useState("");
    const [optionsText, setOptionsText] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);

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
            console.error("Failed to load assessment:", error);
            alert("Could not load assessment.");
            navigate("/instructor/assessments");
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = async () => {
        if (!assessmentId || !prompt.trim()) return;
        const parsedOptions = optionsText
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);
        try {
            await apiClient.post(`/assessments/${assessmentId}/questions`, {
                prompt: prompt.trim(),
                options: parsedOptions.length > 0 ? parsedOptions : null,
                answer: answer.trim() || null,
            });
            setPrompt("");
            setOptionsText("");
            setAnswer("");
            await loadAssessment();
        } catch (error) {
            console.error("Failed to add question:", error);
            alert("Could not add question.");
        }
    };

    if (isNew) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Assessment Editor</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Create assessments from the Assessments page</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Choose a course and create an assessment first, then add questions here.
                        </p>
                        <Link to="/instructor/assessments">
                            <Button>Go to Assessments</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading && !assessment) return <div>Loading assessment...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assessment Editor</h1>
                    <p className="text-sm text-muted-foreground">{assessment?.title}</p>
                </div>
                <Link to={`/instructor/assessments/results/${assessmentId}`}>
                    <Button variant="outline">View Results</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        placeholder="Question prompt"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                    />
                    <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        rows={4}
                        placeholder="Options (one per line, optional)"
                        value={optionsText}
                        onChange={(event) => setOptionsText(event.target.value)}
                    />
                    <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        placeholder="Correct answer (optional)"
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                    />
                    <Button onClick={addQuestion}>Add Question</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Question Bank ({questions.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {questions.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No questions added yet.</div>
                    ) : (
                        questions.map((question, index) => (
                            <div key={question.id} className="rounded-md border p-3">
                                <div className="font-medium">Q{index + 1}. {question.prompt}</div>
                                {Array.isArray(question.options) && question.options.length > 0 && (
                                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                                        {question.options.map((option, optionIndex) => (
                                            <li key={`${question.id}-${optionIndex}`}>{`${option}`}</li>
                                        ))}
                                    </ul>
                                )}
                                {question.answer && (
                                    <div className="mt-2 text-xs text-muted-foreground">Answer: {question.answer}</div>
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
