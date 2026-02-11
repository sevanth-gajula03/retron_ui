import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Loader2, Trash2, UserCheck, UserX } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { ROLES, getRoleDisplayName } from "../../lib/rbac";

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [assigningUserId, setAssigningUserId] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [activeRole, setActiveRole] = useState(ROLES.STUDENT);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchUsers();
        fetchCourses();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get("/users");
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const data = await apiClient.get("/courses");
            setCourses(data);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesRole = user.role === activeRole;
            const matchesSearch = `${user.name || ""} ${user.email}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            return matchesRole && matchesSearch;
        });
    }, [users, activeRole, searchQuery]);

    const handleRoleChange = async (userId, role) => {
        try {
            await apiClient.patch(`/users/${userId}`, { role });
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Failed to update role");
        }
    };

    const handleToggleSuspend = async (userId, status) => {
        try {
            const nextStatus = status === "suspended" ? "active" : "suspended";
            await apiClient.patch(`/users/${userId}`, { status: nextStatus });
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("Delete this user?")) return;
        try {
            await apiClient.delete(`/users/${userId}`);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user");
        }
    };

    const startAssign = (userId) => {
        setAssigningUserId(userId);
        setSelectedCourseId("");
    };

    const submitAssign = async () => {
        if (!assigningUserId || !selectedCourseId) return;
        try {
            await apiClient.post("/enrollments/assign", {
                user_id: assigningUserId,
                course_id: selectedCourseId
            });
            setAssigningUserId(null);
            setSelectedCourseId("");
        } catch (error) {
            console.error("Error assigning course:", error);
            alert("Failed to assign course");
        }
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <Button onClick={fetchUsers}>Refresh</Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {Object.values(ROLES).map((role) => (
                    <Button
                        key={role}
                        variant={activeRole === role ? "default" : "outline"}
                        onClick={() => setActiveRole(role)}
                    >
                        {getRoleDisplayName(role)}
                    </Button>
                ))}
            </div>

            <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((user) => (
                    <Card key={user.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">{user.name || user.email}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Role:</span>
                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                >
                                    {Object.values(ROLES).map((role) => (
                                        <option key={role} value={role}>
                                            {getRoleDisplayName(role)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleSuspend(user.id, user.status)}
                                >
                                    {user.status === "suspended" ? (
                                        <UserCheck className="h-4 w-4 mr-1" />
                                    ) : (
                                        <UserX className="h-4 w-4 mr-1" />
                                    )}
                                    {user.status === "suspended" ? "Unsuspend" : "Suspend"}
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(user.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => startAssign(user.id)}>
                                    Assign Course
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {assigningUserId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Assign Course</h2>
                        <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2"
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                        >
                            <option value="" disabled>Select a course</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setAssigningUserId(null)}>
                                Cancel
                            </Button>
                            <Button onClick={submitAssign} disabled={!selectedCourseId}>
                                Assign
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {filteredUsers.length === 0 && (
                <div className="text-center text-muted-foreground">No users found.</div>
            )}
        </div>
    );
}
