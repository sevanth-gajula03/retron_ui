import { createContext, useContext, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient, clearTokens } from "../lib/apiClient";
import { hasPermission as checkPermission, canAccessRoute, isGuestAccessExpired } from "../lib/rbac";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guestExpired, setGuestExpired] = useState(false);

    useEffect(() => {
        let mounted = true;
        const loadCurrentUser = async () => {
            try {
                const data = await apiClient.get("/auth/me");
                if (!mounted) return;
                setUser({ id: data.id, email: data.email });
                setUserData(data);
                setGuestExpired(data.role === "guest" && isGuestAccessExpired(data));
            } catch (error) {
                clearTokens();
                setUser(null);
                setUserData(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadCurrentUser();
        return () => {
            mounted = false;
        };
    }, []);

    const signOut = () => {
        setGuestExpired(false);
        clearTokens();
        setUser(null);
        setUserData(null);
    };

    // Permission helpers (Blocks access if user is suspended)
    const hasPermission = (permission) => {
        if (!userData || userData.status === "suspended") return false;
        if (userData.role === 'guest' && guestExpired) return false;
        return checkPermission(userData, permission);
    };

    const canAccess = (route) => {
        if (!userData || userData.status === "suspended") return false;
        if (userData.role === 'guest' && guestExpired) return false;
        return canAccessRoute(userData, route);
    };

    const value = {
        user,
        userData,
        loading,
        guestExpired,
        signOut,
        hasRole: (role) => userData?.role === role,
        hasPermission,
        canAccess,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex h-screen w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
