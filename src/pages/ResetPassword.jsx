import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiClient } from "../lib/apiClient";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) {
            setError("Invalid or missing setup token.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSubmitting(true);
        try {
            await apiClient.post("/auth/set-password", {
                token,
                new_password: password,
            });
            setSuccess("Password set successfully. Redirecting to login...");
            setTimeout(() => navigate("/login", { replace: true }), 1500);
        } catch (err) {
            setError(err?.message || "Failed to set password.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Set Your Password</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Use the one-time link sent to your email to set your account password.
                    </p>
                </div>

                {!token ? (
                    <div className="space-y-4 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                        <p>Invalid or missing password setup token.</p>
                        <Link to="/login" className="text-primary hover:underline">
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border bg-card p-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">New Password</label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Minimum 8 characters"
                                disabled={submitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">Confirm Password</label>
                            <input
                                id="confirm-password"
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Re-enter password"
                                disabled={submitting}
                            />
                        </div>

                        {error && (
                            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>
                        )}
                        {success && (
                            <div className="rounded-md bg-emerald-100 text-emerald-800 text-sm p-3">{success}</div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Set Password
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
