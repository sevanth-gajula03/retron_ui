import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function PartnerInstructorCourses() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Partner Instructor Courses</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Courses</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Course management is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
