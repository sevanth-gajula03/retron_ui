import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function StudentAssignmentOverview() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Student Assignments</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Assignment overview is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
