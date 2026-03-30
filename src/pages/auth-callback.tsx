import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/use-auth";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token);
      navigate("/admin", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [searchParams, setToken, navigate]);

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-muted-foreground">Authenticating...</p>
    </div>
  );
}
