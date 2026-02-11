import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function PartnerInstructor() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Partner Instructors</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Partner Instructors</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Partner instructor management is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
