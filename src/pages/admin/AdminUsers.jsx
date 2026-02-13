import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Loader2, Trash2, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { ROLES, getRoleDisplayName } from "../../lib/rbac";
import { userService } from "../../services/userService";

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [assigningUserId, setAssigningUserId] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [activeRole, setActiveRole] = useState(ROLES.STUDENT);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserRole, setNewUserRole] = useState(ROLES.STUDENT);
    const [resendingUserId, setResendingUserId] = useState(null);

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
            const result = await apiClient.delete(`/users/${userId}`);
            if (result?.status === "soft_deleted") {
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === userId
                            ? { ...u, status: "suspended" }
                            : u
                    )
                );
                alert(result.message || "User had linked records and was suspended instead.");
                return;
            }
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (error) {
            console.error("Error deleting user:", error);
            alert(error?.message || "Failed to delete user");
        }
    };

    const handleResendSetupEmail = async (userId) => {
        try {
            setResendingUserId(userId);
            const response = await userService.resendSetupEmail(userId);
            alert(response?.message || "Password setup email resent.");
        } catch (error) {
            console.error("Error resending setup email:", error);
            alert(error?.message || "Failed to resend setup email");
        } finally {
            setResendingUserId(null);
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

    const resetCreateForm = () => {
        setNewUserEmail("");
        setNewUserRole(ROLES.STUDENT);
        setCreateError("");
        setCreateSuccess("");
    };

    const openCreateModal = () => {
        resetCreateForm();
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        resetCreateForm();
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError("");
        setCreateSuccess("");

        const email = newUserEmail.trim().toLowerCase();
        if (!email.endsWith("@gmail.com")) {
            setCreateError("Only @gmail.com email addresses are allowed.");
            return;
        }

        setCreatingUser(true);
        try {
            const response = await userService.provision({
                email,
                role: newUserRole,
            });
            setCreateSuccess(response?.message || "User created and setup email sent.");
            await fetchUsers();
            setNewUserEmail("");
        } catch (error) {
            const message = error?.message || "Failed to create user.";
            setCreateError(message);
        } finally {
            setCreatingUser(false);
        }
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={openCreateModal}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User
                    </Button>
                    <Button variant="outline" onClick={fetchUsers}>Refresh</Button>
                </div>
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
                            <div>
                                <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                        user.password_setup_completed
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                    }`}
                                >
                                    {user.password_setup_completed ? "Validated" : "Pending password setup"}
                                </span>
                            </div>
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
                                {!user.password_setup_completed && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleResendSetupEmail(user.id)}
                                        disabled={resendingUserId === user.id}
                                    >
                                        {resendingUserId === user.id ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                Sending
                                            </>
                                        ) : (
                                            "Resend Setup Email"
                                        )}
                                    </Button>
                                )}
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

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 relative">
                        <button
                            onClick={closeCreateModal}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                            disabled={creatingUser}
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-2">Create User</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Enter the user's Gmail ID and role. We will send a one-time password setup link by email.
                        </p>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Gmail ID</label>
                                <Input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    placeholder="name@gmail.com"
                                    disabled={creatingUser}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Role</label>
                                <select
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                    disabled={creatingUser}
                                >
                                    {[ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST].map((role) => (
                                        <option key={role} value={role}>
                                            {getRoleDisplayName(role)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {createError && (
                                <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
                                    {createError}
                                </div>
                            )}

                            {createSuccess && (
                                <div className="rounded-md bg-emerald-100 text-emerald-800 text-sm p-3">
                                    {createSuccess}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="outline" onClick={closeCreateModal} disabled={creatingUser}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={creatingUser}>
                                    {creatingUser ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        "Generate"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
