import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

export function AboutPage() {
  return (
    <article className="mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          size="lg"
          asChild
          className="w-fit text-muted-foreground"
        >
          <Link to="/">
            <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-medium tracking-tight">About Scylla</h1>
      </div>

      <Separator />

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Scylla is an open-core continuous integration platform built to be
          delivered as a PaaS and deployable anywhere. The goal is
          straightforward: offer a genuine alternative to platforms where
          pricing or vendor lock-in end up driving your decisions.
        </p>
        <strong>AI GENERATED BELOW</strong>
        <p>
          We're focusing on three things that we think matter most : ease of use
          so you're not fighting your CI, support for applications at any scale
          from side projects to production workloads, and performance that
          doesn't make you wait.
        </p>
        <p>
          The project is still early, and there's a lot of ground to cover. If
          you'd like to follow along, the devlogs on the home page are the best
          place to stay up to date.
        </p>
      </div>
    </article>
  );
}
