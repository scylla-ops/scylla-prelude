import { useParams, Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { getDevlogBySlug, formatDate } from "@/data/devlogs";

export function DevlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const devlog = slug ? getDevlogBySlug(slug) : undefined;

  if (!devlog) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center">
        <h1 className="text-xl font-medium tracking-tight">Not Found</h1>
        <p className="text-sm text-muted-foreground">
          That devlog doesn't exist :(
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link to="/">Back to Devlogs</Link>
        </Button>
      </div>
    );
  }

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
        <h1 className="text-3xl font-medium tracking-tight">{devlog.title}</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(devlog.date)}
          </span>
          {devlog.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="text-sm leading-7 text-muted-foreground [&>*+*]:mt-5 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:mt-4 [&_img]:rounded-xl [&_img]:ring-1 [&_img]:ring-foreground/10 [&_hr]:border-border [&_hr]:my-6">
        <devlog.Content />
      </div>
    </article>
  );
}
