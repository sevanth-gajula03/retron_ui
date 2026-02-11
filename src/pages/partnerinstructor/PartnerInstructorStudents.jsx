import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function PartnerInstructorStudents() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Partner Instructor Students</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Students</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Student management is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
