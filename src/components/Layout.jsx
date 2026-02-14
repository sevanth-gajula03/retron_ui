import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import Footer from "./Footer";

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const location = useLocation();
    const isCoursePlayer = location.pathname.startsWith("/student/course");

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <main
                className={`flex-1 min-w-0 h-full transition-all duration-300 ${
                    isCoursePlayer ? "overflow-hidden" : "overflow-y-auto"
                }`}
            >
                <div
                    className={`flex flex-col ${
                        isCoursePlayer ? "h-full min-h-0 px-8 pt-8" : "min-h-full p-8"
                    }`}
                >
                    {/* Page content */}
                    <div className={`flex-1 ${isCoursePlayer ? "min-h-0" : ""}`}>
                        <Outlet />
                    </div>

                    {/* Footer */}
                    <Footer />
                </div>
            </main>
        </div>
    );
}
