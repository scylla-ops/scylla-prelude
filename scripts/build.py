#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["rich>=13"]
# ///
"""Build (et push optionnel) de l'image Docker Scylla Prelude.

Script uv autonome : aucun virtualenv ni `pip install`. uv lit le bloc de
dépendances inline ci-dessus et l'exécute dans un environnement éphémère.

Exemples
--------
  # Build pour ta machine et charge l'image dans Docker (rapide, mono-arch) :
  uv run scripts/build.py
  ./scripts/build.py                      # si exécutable (chmod +x)

  # Build multi-arch (amd64 + arm64) puis push :<version> + :latest sur Docker Hub :
  ./scripts/build.py --push

  # Variantes :
  ./scripts/build.py --push --version 0.4.0     # forcer la version
  ./scripts/build.py --image moi/scylla-prelude # forcer l'image
  ./scripts/build.py --push --platforms linux/amd64
  ./scripts/build.py --push --dry-run           # voir les commandes sans rien lancer

La version vient par défaut du champ "version" de package.json (source unique de vérité).
Le nom d'image vient de docker/.env (PRELUDE_FRONTEND_IMAGE_NAME).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import NoReturn

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm
from rich.table import Table

console = Console()

DEFAULT_IMAGE = "godlyjaaaaj/scylla-prelude"
DEFAULT_PLATFORMS = "linux/amd64,linux/arm64"
DOCKERFILE = "docker/Dockerfile"
BUILDER = "prelude-builder"


def fail(msg: str) -> NoReturn:
    console.print(f"[bold red]✗[/] {msg}")
    raise SystemExit(1)


def repo_root() -> Path:
    """Racine du repo = parent du dossier scripts/ qui contient ce fichier."""
    return Path(__file__).resolve().parent.parent


def read_version(root: Path) -> str:
    pkg = root / "package.json"
    try:
        return json.loads(pkg.read_text())["version"]
    except Exception as exc:  # noqa: BLE001
        fail(f"Impossible de lire la version depuis {pkg} : {exc}")


def read_image(root: Path) -> str:
    """PRELUDE_FRONTEND_IMAGE_NAME depuis docker/.env, puis .env.example, sinon défaut."""
    for name in ("docker/.env", "docker/.env.example"):
        env = root / name
        if not env.exists():
            continue
        for raw in env.read_text().splitlines():
            line = raw.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() == "PRELUDE_FRONTEND_IMAGE_NAME" and value.strip():
                return value.strip()
    return DEFAULT_IMAGE


def git_commit(root: Path) -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=root, capture_output=True, text=True, check=True,
        )
        return out.stdout.strip() or "dev"
    except Exception:  # noqa: BLE001
        return "dev"


def has_buildx() -> bool:
    return subprocess.run(["docker", "buildx", "version"], capture_output=True).returncode == 0


def docker_authenticated() -> bool:
    """Heuristique : ~/.docker/config.json contient des auths / credential store."""
    cfg = Path.home() / ".docker" / "config.json"
    if not cfg.exists():
        return False
    try:
        data = json.loads(cfg.read_text())
    except Exception:  # noqa: BLE001
        return False
    return bool(data.get("auths") or data.get("credsStore") or data.get("credHelpers"))


def ensure_builder(*, dry: bool) -> None:
    """Crée le builder buildx dédié (driver docker-container) s'il n'existe pas."""
    exists = subprocess.run(
        ["docker", "buildx", "inspect", BUILDER], capture_output=True
    ).returncode == 0
    if exists:
        return
    console.print(f"[cyan]→[/] Création du builder buildx [bold]{BUILDER}[/] (driver docker-container)")
    if dry:
        return
    subprocess.run(
        ["docker", "buildx", "create", "--name", BUILDER, "--driver", "docker-container"],
        check=True,
    )


def run(cmd: list[str], *, root: Path, dry: bool) -> None:
    console.print(f"[dim]$ {' '.join(cmd)}[/]")
    if dry:
        return
    if subprocess.run(cmd, cwd=root).returncode != 0:
        fail("La commande buildx a échoué.")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="build.py",
        description="Build (et push optionnel) de l'image Docker Scylla Prelude.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("-v", "--version", help="Tag de version (défaut : version de package.json).")
    parser.add_argument("-i", "--image", help="Nom d'image (défaut : docker/.env → PRELUDE_FRONTEND_IMAGE_NAME).")
    parser.add_argument("--push", action="store_true",
                        help="Build multi-arch + push sur Docker Hub. Sinon : build local mono-arch chargé dans Docker.")
    parser.add_argument("--platforms", default=DEFAULT_PLATFORMS,
                        help=f"Plateformes pour --push (défaut : {DEFAULT_PLATFORMS}).")
    parser.add_argument("--no-latest", action="store_true", help="Ne pas taguer aussi :latest.")
    parser.add_argument("--no-cache", action="store_true", help="Build sans cache.")
    parser.add_argument("-y", "--yes", action="store_true", help="Ne pas demander de confirmation avant un push.")
    parser.add_argument("--dry-run", action="store_true", help="Afficher les commandes sans les exécuter.")
    args = parser.parse_args()

    root = repo_root()
    if shutil.which("docker") is None:
        fail("`docker` introuvable dans le PATH.")
    if not has_buildx():
        fail("`docker buildx` indisponible (inclus dans Docker Desktop / Docker ≥ 20.10).")

    version = args.version or read_version(root)
    image = args.image or read_image(root)
    commit = git_commit(root)

    tags = [f"{image}:{version}"] + ([] if args.no_latest else [f"{image}:latest"])

    table = Table(show_header=False, box=None, pad_edge=False)
    table.add_row("[bold]Image[/]", image)
    table.add_row("[bold]Version[/]", version)
    table.add_row("[bold]Tags[/]", ", ".join(t.split(":", 1)[1] for t in tags))
    table.add_row("[bold]Commit[/]", commit)
    table.add_row("[bold]Mode[/]",
                  "[red]push multi-arch[/] → Docker Hub" if args.push
                  else "[green]local[/] (--load, mono-arch)")
    if args.push:
        table.add_row("[bold]Platforms[/]", args.platforms)
    console.print(Panel(table, title="🐳 Scylla Prelude — build", border_style="cyan", expand=False))

    cmd = ["docker", "buildx", "build", "--builder", BUILDER,
           "-f", DOCKERFILE, "--build-arg", f"GIT_COMMIT={commit}"]
    for tag in tags:
        cmd += ["-t", tag]
    if args.no_cache:
        cmd.append("--no-cache")

    if args.push:
        if not args.dry_run:
            if not docker_authenticated():
                console.print("[yellow]![/] Aucune authentification Docker détectée.")
                if Confirm.ask("Lancer `docker login` maintenant ?", default=True):
                    subprocess.run(["docker", "login"], check=False)
            if not args.yes and not Confirm.ask(
                f"[bold red]Push[/] {', '.join(tags)} sur Docker Hub ?", default=False
            ):
                console.print("Annulé.")
                return
        ensure_builder(dry=args.dry_run)
        cache = f"{image}:buildcache"
        cmd += ["--platform", args.platforms, "--push",
                "--cache-from", f"type=registry,ref={cache}",
                "--cache-to", f"type=registry,ref={cache},mode=max"]
    else:
        ensure_builder(dry=args.dry_run)
        cmd.append("--load")  # mono-arch (plateforme de l'hôte)

    cmd.append(".")  # contexte = racine du repo

    run(cmd, root=root, dry=args.dry_run)

    console.print(f"\n[bold green]✓[/] Terminé : [bold]{', '.join(tags)}[/]")
    if not args.push and not args.dry_run:
        console.print(f"[dim]→ lancer en local : docker run --rm -p 8080:8080 {tags[0]}[/]")
    if args.dry_run:
        console.print("[dim](dry-run : rien n'a été exécuté)[/]")


if __name__ == "__main__":
    main()
