import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { fetchAdminPosts, deletePost, formatDate } from "@/lib/api";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";

export function AdminDashboard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => fetchAdminPosts(token!),
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ slug, locale }: { slug: string; locale: string }) =>
      deletePost(token!, slug, locale),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Posts</h2>
        <Button asChild size="sm">
          <Link to="/admin/posts/new">
            <Plus size={16} />
            New Post
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Locale</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts?.map((post) => (
              <tr
                key={`${post.slug}-${post.locale}`}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-3 font-medium">{post.title}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{post.locale.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={post.status === "published" ? "default" : "outline"}
                    className={post.status === "scheduled" ? "border-amber-500/50 text-amber-500" : ""}
                  >
                    {post.status === "scheduled" && <Clock size={10} className="mr-1" />}
                    {post.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(post.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/posts/${post.slug}/edit?locale=${post.locale}`}>
                        <Pencil size={14} />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteMutation.mutate({
                          slug: post.slug,
                          locale: post.locale,
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
