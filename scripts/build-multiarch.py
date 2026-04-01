import os
import subprocess
import sys
from dotenv import load_dotenv

load_dotenv()

def run_command(command):
    try:
        subprocess.run(command, check=True, shell=True)
    except subprocess.CalledProcessError:
        print(f"Error: Command failed -> {command}")
        sys.exit(1)

def ask_confirm(message):
    if os.getenv("GITHUB_ACTIONS") == "true":
        return True
    return input(f"{message} (y/n): ").lower() == 'y'

def main():
    # Variables d'entrée
    user = os.getenv("DOCKER_USER")
    image = os.getenv("IMAGE_NAME")
    version = os.getenv("VERSION")
    dockerfile = os.getenv("DOCKERFILE_PATH", "docker/Dockerfile")
    platforms = os.getenv("PLATFORMS", "linux/amd64,linux/arm64")

    if not all([user, image, version]):
        print("Error: Missing DOCKER_USER, IMAGE_NAME or VERSION.")
        sys.exit(1)

    full_tag = f"{user}/{image}:{version}"
    cache_tag = f"{user}/{image}:buildcache"

    # 1. Ask for build + push upfront
    if not ask_confirm(f"Build {full_tag}?"):
        print("Build aborted.")
        return

    push = ask_confirm(f"Push {full_tag} to Docker Hub after build?")

    # 2. Setup Builder
    if subprocess.run("docker buildx inspect multi-builder", shell=True, capture_output=True).returncode != 0:
        run_command("docker buildx create --name multi-builder --use")

    cache_flags = f"--cache-from type=registry,ref={cache_tag} --cache-to type=registry,ref={cache_tag},mode=max"
    push_flag = " --push" if push else ""

    # Get git commit hash
    git_commit = subprocess.run("git rev-parse --short HEAD", shell=True, capture_output=True, text=True).stdout.strip() or "dev"

    # 3. Build (and push if confirmed)
    print(f"Building for {platforms}...{' (will push after build)' if push else ''}")
    run_command(f"docker buildx build --platform {platforms} -f {dockerfile} -t {full_tag} --build-arg GIT_COMMIT={git_commit} {cache_flags}{push_flag} .")

if __name__ == "__main__":
    main()