import { Link } from "react-router";
import { useLocale } from "@/i18n/use-locale";
import { SiGithub } from "@icons-pack/react-simple-icons";

export function SiteFooter() {
	const { t } = useLocale();

	return (
		<footer className="w-full">
			<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
				<span>{t("footer.copyright")}</span>
				<div className="flex items-center gap-4">
					<a
						href="https://github.com/scylla-ops/scylla-prelude"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-foreground transition-colors"
						aria-label="GitHub"
					>
						<SiGithub size={16} />
					</a>
					<Link to="/legal" className="hover:text-foreground transition-colors">
						{t("footer.legal")}
					</Link>
				</div>
			</div>
		</footer>
	);
}
