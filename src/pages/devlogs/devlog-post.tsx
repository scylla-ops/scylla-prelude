import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { fetchPost, formatDate } from "@/lib/api";
import { getAuthor } from "@/data/authors";
import { useLocale } from "@/i18n/use-locale";

export function DevlogPost() {
  const { t, locale } = useLocale();
  const { slug } = useParams<{ slug: string }>();

  const { data: devlog, isLoading } = useQuery({
    queryKey: ["post", slug, locale],
    queryFn: () => fetchPost(slug!, locale),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!devlog) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center">
        <h1 className="text-xl font-medium tracking-tight">
          {t("devlog.notFound.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("devlog.notFound.body")}
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link to="/">{t("devlog.notFound.back")}</Link>
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
            <ArrowLeft size={16} />
            {t("devlog.back")}
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-medium tracking-tight">
            {devlog.title}
          </h1>
          {devlog.authors.length > 0 && (
            <AvatarGroup>
              {devlog.authors.map((id) => {
                const author = getAuthor(id);
                if (!author) return null;
                return (
                  <Avatar key={id} size="sm">
                    <AvatarImage src={author.avatar} alt={author.name} />
                    <AvatarFallback>{author.name[0]}</AvatarFallback>
                  </Avatar>
                );
              })}
            </AvatarGroup>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(devlog.created_at, locale)}
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
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
        >
          {devlog.content}
        </Markdown>
      </div>
    </article>
  );
}
