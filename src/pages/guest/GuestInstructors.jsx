import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function GuestInstructors() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Instructors</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Instructors</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Instructor listing is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
