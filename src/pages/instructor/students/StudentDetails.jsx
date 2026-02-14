import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import { apiClient } from "../../../lib/apiClient";
import { userService } from "../../../services/userService";
import { courseProgressService } from "../../../services/courseProgressService";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../components/ui/collapsible";

function toCsvValue(value) {
    const s = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

const clampPercent = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
};

export default function StudentDetails() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [progressRows, setProgressRows] = useState([]);
    const [quizAttempts, setQuizAttempts] = useState([]);
    const [assessmentSubs, setAssessmentSubs] = useState([]);
    const [courseStructures, setCourseStructures] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");

    const loadData = async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            setError("");
            const [studentData, myCourses, enrollmentRows, progress, attempts, submissions] = await Promise.all([
                userService.getById(studentId),
                apiClient.get("/courses"),
                apiClient.get(`/enrollments?user_id=${studentId}`),
                courseProgressService.list({ user_id: studentId }),
                apiClient.get(`/users/${studentId}/module-quiz-attempts`),
                apiClient.get(`/users/${studentId}/assessment-submissions`),
            ]);
            setStudent(studentData);
            setCourses(Array.isArray(myCourses) ? myCourses : []);
            setEnrollments(Array.isArray(enrollmentRows) ? enrollmentRows : []);
            setProgressRows(Array.isArray(progress) ? progress : []);
            setQuizAttempts(Array.isArray(attempts) ? attempts : []);
            setAssessmentSubs(Array.isArray(submissions) ? submissions : []);

            // Fetch course structure so we can show: total modules, completed modules, completion state.
            const courseIds = [...new Set((enrollmentRows || []).map((e) => e.course_id).filter(Boolean))];
            const structureResults = await Promise.allSettled(
                courseIds.map(async (courseId) => {
                    const sections = await apiClient.get(`/courses/${courseId}/sections`);
                    const allModules = [];
                    const allSections = Array.isArray(sections) ? sections : [];

                    const sectionWork = await Promise.allSettled(
                        allSections.map(async (section) => {
                            const [sectionModules, subSections] = await Promise.all([
                                apiClient.get(`/modules/section/${section.id}`),
                                apiClient.get(`/subsections/section/${section.id}`),
                            ]);
                            const sectionMods = Array.isArray(sectionModules) ? sectionModules : [];
                            const subs = Array.isArray(subSections) ? subSections : [];
                            const subModsResults = await Promise.allSettled(
                                subs.map((sub) => apiClient.get(`/modules/subsection/${sub.id}`))
                            );
                            const subMods = subModsResults.flatMap((r) => (r.status === "fulfilled" ? (r.value || []) : []));
                            return { sectionMods, subMods, subCount: subs.length };
                        })
                    );

                    let subSectionCount = 0;
                    for (const r of sectionWork) {
                        if (r.status !== "fulfilled") continue;
                        allModules.push(...(r.value.sectionMods || []));
                        allModules.push(...(r.value.subMods || []));
                        subSectionCount += r.value.subCount || 0;
                    }

                    const modulesById = {};
                    for (const m of allModules) {
                        if (!m?.id) continue;
                        modulesById[m.id] = {
                            id: m.id,
                            title: m.title || "Untitled",
                            type: m.type,
                        };
                    }

                    return {
                        courseId,
                        sectionCount: allSections.length,
                        subSectionCount,
                        moduleCount: allModules.length,
                        modulesById,
                    };
                })
            );

            const structureMap = {};
            for (const r of structureResults) {
                if (r.status !== "fulfilled") continue;
                structureMap[r.value.courseId] = r.value;
            }
            setCourseStructures(structureMap);
        } catch (e) {
            console.error("Failed to load student details:", e);
            setError(e?.message || "Failed to load student details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
    const progressMap = useMemo(() => {
        const map = new Map();
        for (const p of progressRows) {
            map.set(p.course_id, p);
        }
        return map;
    }, [progressRows]);

    const enrolledCourseIds = useMemo(() => {
        return [...new Set(enrollments.map((e) => e.course_id).filter(Boolean))];
    }, [enrollments]);

    const attemptedCourseIds = useMemo(() => {
        const set = new Set();
        enrollments.forEach((e) => e.course_id && set.add(e.course_id));
        quizAttempts.forEach((a) => a.course_id && set.add(a.course_id));
        assessmentSubs.forEach((s) => s.course_id && set.add(s.course_id));
        return set;
    }, [enrollments, quizAttempts, assessmentSubs]);

    const filteredQuizAttempts = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return quizAttempts;
        return quizAttempts.filter((row) => {
            const courseTitle = (row.course_title || "").toLowerCase();
            const moduleTitle = (row.module_title || "").toLowerCase();
            const score = row.score === null || row.score === undefined ? "" : String(row.score);
            return courseTitle.includes(q) || moduleTitle.includes(q) || score.includes(q);
        });
    }, [quizAttempts, query]);

    const filteredAssessmentSubs = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return assessmentSubs;
        return assessmentSubs.filter((row) => {
            const courseTitle = (row.course_title || "").toLowerCase();
            const title = (row.assessment_title || "").toLowerCase();
            const score = row.score === null || row.score === undefined ? "" : String(row.score);
            return courseTitle.includes(q) || title.includes(q) || score.includes(q);
        });
    }, [assessmentSubs, query]);

    const stats = useMemo(() => {
        const coursesCount = attemptedCourseIds.size;
        const avgProgress = (() => {
            const relevant = Array.from(attemptedCourseIds).map((id) => progressMap.get(id)).filter(Boolean);
            if (relevant.length === 0) return null;
            const sum = relevant.reduce((acc, p) => acc + (p.module_progress_percentage || 0), 0);
            return clampPercent(sum / relevant.length);
        })();
        return {
            coursesCount,
            avgProgress,
            quizAttempts: quizAttempts.length,
            assessments: assessmentSubs.length,
        };
    }, [attemptedCourseIds, progressMap, quizAttempts.length, assessmentSubs.length]);

    const exportQuizCsv = () => {
        const header = [
            "attempt_id",
            "course_id",
            "course_title",
            "module_id",
            "module_title",
            "started_at",
            "submitted_at",
            "score",
            "max_score",
        ];
        const lines = [header.join(",")];
        for (const r of filteredQuizAttempts) {
            lines.push(
                [
                    r.attempt_id,
                    r.course_id,
                    r.course_title,
                    r.module_id,
                    r.module_title,
                    r.started_at,
                    r.submitted_at,
                    r.score,
                    r.max_score,
                ]
                    .map(toCsvValue)
                    .join(",")
            );
        }
        downloadTextFile(`student_${studentId}_quiz_attempts.csv`, lines.join("\n") + "\n", "text/csv");
    };

    const exportAssessmentCsv = () => {
        const header = [
            "submission_id",
            "course_id",
            "course_title",
            "assessment_id",
            "assessment_title",
            "created_at",
            "score",
            "answer_count",
        ];
        const lines = [header.join(",")];
        for (const r of filteredAssessmentSubs) {
            lines.push(
                [
                    r.submission_id,
                    r.course_id,
                    r.course_title,
                    r.assessment_id,
                    r.assessment_title,
                    r.created_at,
                    r.score,
                    r.answer_count,
                ]
                    .map(toCsvValue)
                    .join(",")
            );
        }
        downloadTextFile(`student_${studentId}_assessment_submissions.csv`, lines.join("\n") + "\n", "text/csv");
    };

    if (loading) return <div>Loading student details...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Student Details</h1>
                    <p className="text-sm text-muted-foreground">
                        {(student?.full_name || student?.name || "Student")} • {student?.email || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">ID: {studentId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
                    <Button variant="outline" onClick={loadData}>Refresh</Button>
                </div>
            </div>

            {error && (
                <Card>
                    <CardContent className="py-4">
                        <div className="text-sm text-destructive">{error}</div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{stats.coursesCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Avg Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{stats.avgProgress ?? "-"}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{stats.quizAttempts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Assessments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{stats.assessments}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Search</CardTitle>
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search course/module/test score"
                        className="sm:max-w-sm"
                    />
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">
                        Use this filter for both quiz attempts and assessment submissions.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Courses & Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    {enrolledCourseIds.length === 0 ? (
                        <div className="text-sm text-muted-foreground">This student is not enrolled in any of your courses.</div>
                    ) : (
                        <div className="divide-y rounded-md border">
                            {enrolledCourseIds
                                .map((courseId) => {
                                    const course = courseMap.get(courseId);
                                    const progress = progressMap.get(courseId);
                                    const percent = clampPercent(progress?.module_progress_percentage || 0);
                                    const structure = courseStructures[courseId];
                                    const totalModules = structure?.moduleCount || null;
                                    const completedList = Array.isArray(progress?.completed_modules)
                                        ? progress.completed_modules
                                        : [];
                                    const completedCount = completedList.length;
                                    const isComplete = totalModules
                                        ? completedCount >= totalModules && totalModules > 0
                                        : percent >= 100;

                                    const completedTitles = completedList
                                        .map((mid) => structure?.modulesById?.[mid]?.title || mid)
                                        .slice(0, 200);

                                    const remainingTitles = (() => {
                                        if (!structure?.modulesById) return [];
                                        const completedSet = new Set(completedList);
                                        const remaining = Object.values(structure.modulesById)
                                            .filter((m) => m?.id && !completedSet.has(m.id))
                                            .map((m) => m.title);
                                        return remaining.slice(0, 200);
                                    })();

                                    return {
                                        courseId,
                                        course,
                                        progress,
                                        percent,
                                        totalModules,
                                        completedCount,
                                        isComplete,
                                        completedTitles,
                                        remainingTitles,
                                        structure,
                                    };
                                })
                                .sort((a, b) => (a.course?.title || "").localeCompare(b.course?.title || ""))
                                .map((row) => (
                                    <Collapsible key={row.courseId}>
                                        <div className="px-4">
                                            <CollapsibleTrigger className="py-3">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium">
                                                            {row.course?.title || row.courseId}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {row.isComplete ? "Completed" : "In progress"}
                                                            {row.course?.status ? ` • ${row.course.status}` : ""}
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto flex flex-wrap items-center gap-4">
                                                        <div className="text-xs text-muted-foreground">
                                                            Modules: {row.completedCount}
                                                            {row.totalModules ? `/${row.totalModules}` : ""}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${row.percent}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm">{row.percent}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="pb-4">
                                                <div className="grid gap-4 md:grid-cols-3">
                                                    <div className="rounded-md border p-3">
                                                        <div className="text-xs text-muted-foreground">Last accessed</div>
                                                        <div className="text-sm">
                                                            {row.progress?.last_accessed
                                                                ? new Date(row.progress.last_accessed).toLocaleString()
                                                                : "-"}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border p-3">
                                                        <div className="text-xs text-muted-foreground">Sections</div>
                                                        <div className="text-sm">
                                                            {row.structure?.sectionCount ?? "-"}
                                                            {row.structure?.subSectionCount !== undefined
                                                                ? ` • Sub-sections ${row.structure.subSectionCount}`
                                                                : ""}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border p-3">
                                                        <div className="text-xs text-muted-foreground">Completion</div>
                                                        <div className="text-sm">
                                                            {row.isComplete ? "Completed" : "Not completed"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                    <div className="rounded-md border p-3">
                                                        <div className="text-sm font-medium">
                                                            Completed modules ({row.completedTitles.length})
                                                        </div>
                                                        {row.completedTitles.length === 0 ? (
                                                            <div className="mt-2 text-sm text-muted-foreground">None yet.</div>
                                                        ) : (
                                                            <div className="mt-2 max-h-44 overflow-auto text-sm">
                                                                {row.completedTitles.map((t, idx) => (
                                                                    <div key={`${idx}-${t}`} className="py-0.5">
                                                                        {t}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="rounded-md border p-3">
                                                        <div className="text-sm font-medium">
                                                            Remaining modules ({row.remainingTitles.length})
                                                        </div>
                                                        {!row.structure ? (
                                                            <div className="mt-2 text-sm text-muted-foreground">
                                                                Structure not loaded.
                                                            </div>
                                                        ) : row.remainingTitles.length === 0 ? (
                                                            <div className="mt-2 text-sm text-muted-foreground">None.</div>
                                                        ) : (
                                                            <div className="mt-2 max-h-44 overflow-auto text-sm">
                                                                {row.remainingTitles.map((t, idx) => (
                                                                    <div key={`${idx}-${t}`} className="py-0.5">
                                                                        {t}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Quiz Results (All Attempts)</CardTitle>
                    <Button onClick={exportQuizCsv} disabled={filteredQuizAttempts.length === 0}>
                        Export CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    {filteredQuizAttempts.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No quiz attempts found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Module</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuizAttempts.map((row) => (
                                    <TableRow key={row.attempt_id}>
                                        <TableCell>{row.course_title || row.course_id}</TableCell>
                                        <TableCell>{row.module_title || row.module_id}</TableCell>
                                        <TableCell>
                                            {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {row.score === null || row.score === undefined
                                                ? "-"
                                                : `${row.score}/${row.max_score ?? "-"}`}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Assessment Results</CardTitle>
                    <Button onClick={exportAssessmentCsv} disabled={filteredAssessmentSubs.length === 0}>
                        Export CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    {filteredAssessmentSubs.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No assessment submissions found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Assessment</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Answers</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAssessmentSubs.map((row) => (
                                    <TableRow key={row.submission_id}>
                                        <TableCell>{row.course_title || row.course_id}</TableCell>
                                        <TableCell>{row.assessment_title || row.assessment_id}</TableCell>
                                        <TableCell>
                                            {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                                        </TableCell>
                                        <TableCell>{row.score ?? "-"}</TableCell>
                                        <TableCell>{row.answer_count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
