import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../lib/apiClient";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function QuizModulePlayer({ module, onNavigationLockChange }) {
    const moduleId = module?.id;
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [attemptId, setAttemptId] = useState(null);
    const [startedAt, setStartedAt] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);
    const [localEndsAtMs, setLocalEndsAtMs] = useState(null);
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
                    setStartedAt(null);
                    setExpiresAt(null);
                    setLocalEndsAtMs(null);
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

    const timeLimitSecondsRaw = quiz?.time_limit_seconds ?? module?.time_limit_seconds ?? module?.timeLimitSeconds ?? null;
    const timeLimitSeconds = timeLimitSecondsRaw == null ? null : Number(timeLimitSecondsRaw);
    const hasTimeLimit = Number.isFinite(timeLimitSeconds) && timeLimitSeconds > 0;

    useEffect(() => {
        if (!onNavigationLockChange) return;
        // Lock navigation while an attempt is in progress and not yet submitted.
        onNavigationLockChange(Boolean(attemptId && !result));
    }, [attemptId, result, onNavigationLockChange]);

    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (!started || !hasTimeLimit) return;
        const t = setInterval(() => setNowMs(Date.now()), 250);
        return () => clearInterval(t);
    }, [started, hasTimeLimit]);

    const timeLeftMs = useMemo(() => {
        if (!started || !hasTimeLimit) return null;

        const explicitEndMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
        if (Number.isFinite(explicitEndMs)) {
            return Math.max(0, explicitEndMs - nowMs);
        }

        if (typeof localEndsAtMs === "number" && Number.isFinite(localEndsAtMs)) {
            return Math.max(0, localEndsAtMs - nowMs);
        }

        if (!startedAt) return null;
        const startedMs = new Date(startedAt).getTime();
        if (!Number.isFinite(startedMs)) return null;
        const endMs = startedMs + timeLimitSeconds * 1000;
        return Math.max(0, endMs - nowMs);
    }, [started, hasTimeLimit, startedAt, expiresAt, localEndsAtMs, timeLimitSeconds, nowMs]);

    const timeLeftLabel = useMemo(() => {
        if (timeLeftMs == null) return null;
        const totalSeconds = Math.ceil(timeLeftMs / 1000);
        const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const ss = String(totalSeconds % 60).padStart(2, "0");
        return `${mm}:${ss}`;
    }, [timeLeftMs]);

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
            setStartedAt(startedAttempt.started_at || startedAttempt.startedAt || new Date().toISOString());
            setExpiresAt(startedAttempt.expires_at || startedAttempt.expiresAt || null);
            if (hasTimeLimit) {
                // Local fallback so the UI still shows a timer even if
                // server timestamps are naive/parse oddly in the browser.
                setLocalEndsAtMs(Date.now() + timeLimitSeconds * 1000);
            } else {
                setLocalEndsAtMs(null);
            }

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

    const handleSubmit = async ({ auto = false } = {}) => {
        if (!moduleId || !attemptId) return;
        if (!auto) {
            const ok = window.confirm("Submit this quiz now? You cannot change your answers after submitting.");
            if (!ok) return;
        }

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

    useEffect(() => {
        if (!started || !hasTimeLimit) return;
        if (result) return;
        if (submitting) return;
        if (timeLeftMs == null) return;
        if (timeLeftMs > 0) return;
        // Auto-submit when timer expires.
        handleSubmit({ auto: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started, hasTimeLimit, timeLeftMs, result, submitting]);

    if (loading) return <div>Loading quiz...</div>;
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{module?.title || "Quiz"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-sm text-destructive">{error}</div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Reload
                        </Button>
                        <Button onClick={handleStart} disabled={starting || !moduleId}>
                            {starting ? "Starting..." : "Start New Attempt"}
                        </Button>
                    </div>
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
                        {hasTimeLimit ? ` • Time limit: ${Math.ceil(timeLimitSeconds / 60)} min` : ""}
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
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {hasTimeLimit && timeLeftLabel && (
                        <div className={timeLeftMs === 0 ? "text-destructive" : ""}>
                            Time left: {timeLeftLabel}
                        </div>
                    )}
                    <div>{quiz.max_score} points total</div>
                </div>
            </div>

            {hasTimeLimit && timeLeftLabel && (
                <div className={`rounded-md border px-3 py-2 text-sm ${timeLeftMs !== null && timeLeftMs <= 30_000 ? "border-destructive/30 bg-destructive/5 text-destructive" : "bg-muted/20"}`}>
                    Timer: {timeLeftLabel}
                </div>
            )}

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
                            disabled={timeLeftMs === 0}
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

                <Button onClick={() => handleSubmit({ auto: false })} disabled={submitting || answeredCount < questions.length || timeLeftMs === 0}>
                    {submitting ? "Submitting..." : "Submit Quiz"}
                </Button>
            </div>
        </div>
    );
}
