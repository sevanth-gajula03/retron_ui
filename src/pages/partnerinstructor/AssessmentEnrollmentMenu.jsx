import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function AssessmentEnrollmentMenu() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessment Enrollment</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Assessment Enrollment</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Assessment enrollment is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
