import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { apiClient } from "../../lib/apiClient";

export default function GuestAssessments() {
    const [assessments, setAssessments] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await apiClient.get("/assessments");
                setAssessments(data);
            } catch (error) {
                console.error("Error loading assessments:", error);
            }
        };
        load();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Assessments</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {assessments.map((assessment) => (
                            <div key={assessment.id} className="text-sm">
                                {assessment.title}
                            </div>
                        ))}
                        {assessments.length === 0 && (
                            <div className="text-muted-foreground">No assessments available.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
