import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function PartnerCoursePreview() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Course Preview</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Course Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Course preview is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
