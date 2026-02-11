
import { Link } from "react-router-dom";

export default function ResetPassword() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md space-y-4 text-center">
                <h2 className="text-2xl font-bold">Reset Password</h2>
                <p className="text-sm text-muted-foreground">
                    Password reset is not available yet. Please contact support.
                </p>
                <Link to="/login" className="text-primary hover:underline">
                    Return to Login
                </Link>
            </div>
        </div>
    );
}
