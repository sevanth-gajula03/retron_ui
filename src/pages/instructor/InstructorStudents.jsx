import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function InstructorStudents() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Student Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Student management is not available yet. This will be enabled once enrollment APIs are expanded.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
