import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <h1 className="text-xl font-medium tracking-tight">404</h1>
      <p className="text-sm text-muted-foreground">
        This page doesn't exist.
      </p>
      <Button variant="outline" size="lg" asChild>
        <Link to="/">
          <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
          Back to home
        </Link>
      </Button>
    </div>
  );
}
