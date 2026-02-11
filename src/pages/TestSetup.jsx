import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function TestSetup() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Test Setup</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Test Setup</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Test setup is not available yet.</p>
                </CardContent>
            </Card>
        </div>
    );
}
