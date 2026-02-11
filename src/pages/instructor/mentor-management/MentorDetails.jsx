import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function MentorDetails() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Mentor Details</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Mentor Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Mentor details are not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
