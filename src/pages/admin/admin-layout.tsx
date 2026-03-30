import { Outlet, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, LayoutDashboard } from "lucide-react";

export function AdminLayout() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <h1 className="text-xl font-medium">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with GitHub to manage posts.
        </p>
        <Button onClick={login} size="lg">
          Sign in with GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user?.name || user?.username}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={16} />
          </Button>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
