import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../lib/apiClient";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function QuizModulePlayer({ module }) {
    const moduleId = module?.id;
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [attemptId, setAttemptId] = useState(null);
    const [starting, setStarting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!moduleId) return;
            try {
                setLoading(true);
                setError("");
                const data = await apiClient.get(`/modules/${moduleId}/quiz`);
                if (!cancelled) {
                    setQuiz(data);
                    setCurrentIndex(0);
                    setAnswers({});
                    setAttemptId(null);
                    setResult(null);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e?.message || "Failed to load quiz.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [moduleId]);

    const questions = useMemo(() => (Array.isArray(quiz?.questions) ? quiz.questions : []), [quiz]);
    const started = Boolean(attemptId);

    const answeredCount = useMemo(() => {
        return questions.filter((q) => answers[String(q.index)] !== undefined).length;
    }, [questions, answers]);

    const handleStart = async () => {
        if (!moduleId) return;
        try {
            setStarting(true);
            setError("");
            setResult(null);
            setAnswers({});
            setCurrentIndex(0);
            const startedAttempt = await apiClient.post(`/modules/${moduleId}/quiz-attempts`, {});
            setAttemptId(startedAttempt.attempt_id || startedAttempt.attemptId || null);

            // Prefer quiz payload returned by start attempt.
            if (startedAttempt.quiz) {
                setQuiz(startedAttempt.quiz);
            }
        } catch (e) {
            setError(e?.message || "Failed to start quiz.");
        } finally {
            setStarting(false);
        }
    };

    const handleSelect = (questionIndex, optionIndex) => {
        setAnswers((prev) => ({ ...prev, [String(questionIndex)]: optionIndex }));
    };

    const handleSubmit = async () => {
        if (!moduleId || !attemptId) return;
        const ok = window.confirm("Submit this quiz now? You cannot change your answers after submitting.");
        if (!ok) return;

        try {
            setSubmitting(true);
            setError("");
            const payload = { answers };
            const res = await apiClient.post(`/modules/${moduleId}/quiz-attempts/${attemptId}/submit`, payload);
            setResult(res);
        } catch (e) {
            setError(e?.message || "Failed to submit quiz.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading quiz...</div>;
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{module?.title || "Quiz"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-sm text-destructive">{error}</div>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Reload
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!quiz || questions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{module?.title || "Quiz"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">No quiz questions found for this module.</div>
                </CardContent>
            </Card>
        );
    }

    if (result) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{module?.title || quiz.title || "Quiz"} (Submitted)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border p-3">
                        <div className="text-sm text-muted-foreground">Your score</div>
                        <div className="text-2xl font-semibold">
                            {result.score}/{result.max_score}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleStart} disabled={starting}>
                            {starting ? "Starting..." : "Retake Quiz"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!started) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{module?.title || quiz.title || "Quiz"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        {questions.length} questions • {quiz.max_score} points
                    </div>
                    <Button onClick={handleStart} disabled={starting}>
                        {starting ? "Starting..." : "Start Quiz"}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const current = questions[currentIndex];
    const selected = answers[String(current.index)];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                    Question {currentIndex + 1} of {questions.length} • Answered {answeredCount}/{questions.length}
                </div>
                <div className="text-sm text-muted-foreground">{quiz.max_score} points total</div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Q{currentIndex + 1}. {current.prompt}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {current.options.map((opt, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelect(current.index, idx)}
                            className={
                                "w-full rounded-md border px-3 py-2 text-left text-sm transition " +
                                (selected === idx
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:bg-muted")
                            }
                        >
                            {opt}
                        </button>
                    ))}
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                        disabled={currentIndex === 0}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                        disabled={currentIndex === questions.length - 1}
                    >
                        Next
                    </Button>
                </div>

                <Button onClick={handleSubmit} disabled={submitting || answeredCount < questions.length}>
                    {submitting ? "Submitting..." : "Submit Quiz"}
                </Button>
            </div>
        </div>
    );
}
