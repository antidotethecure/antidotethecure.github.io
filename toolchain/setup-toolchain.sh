#!/usr/bin/env bash
# Antidote toolchain bootstrap — run this on your own machine (Mac).
# Reproduces the toolchain that was set up and verified in the Claude Code
# cloud session on 2026-09-05. Each step is idempotent: re-running skips
# anything already in place.
set -euo pipefail

say() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

# ---------------------------------------------------------------- Step 1
say "Step 1: no-ai-slop"
if [ ! -d "$HOME/.claude-skills/no-ai-slop" ]; then
  mkdir -p "$HOME/.claude-skills"
  git clone https://github.com/petergyang/no-ai-slop "$HOME/.claude-skills/no-ai-slop"
fi
mkdir -p "$HOME/.claude/skills"
if [ ! -d "$HOME/.claude/skills/no-ai-slop" ]; then
  cp -r "$HOME/.claude-skills/no-ai-slop/skills/no-ai-slop" "$HOME/.claude/skills/no-ai-slop"
fi
echo "no-ai-slop installed: /no-ai-slop is available in any Claude Code project."

# ---------------------------------------------------------------- Step 2
say "Step 2: SkillSpector"
if ! command -v uv >/dev/null; then
  echo "uv is missing — install it first: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi
if [ ! -d "$HOME/.skillspector" ]; then
  git clone https://github.com/NVIDIA/skillspector "$HOME/.skillspector"
fi
if [ ! -x "$HOME/.skillspector/.venv/bin/skillspector" ]; then
  (cd "$HOME/.skillspector" && uv venv .venv && . .venv/bin/activate && make install)
fi
"$HOME/.skillspector/.venv/bin/skillspector" --version
# NOTE: `skillspector patterns` does not exist in v2.11.0 — the CLI is
# `scan`, `mcp`, `baseline`. Verify with a real scan instead:
"$HOME/.skillspector/.venv/bin/skillspector" scan "$HOME/.claude/skills/no-ai-slop" --no-llm | tail -20

if ! grep -q 'install-skill()' "$HOME/.zshrc" 2>/dev/null; then
  cat "$(dirname "$0")/install-skill.zsh" >> "$HOME/.zshrc"
  echo "install-skill function appended to ~/.zshrc — restart your shell or: source ~/.zshrc"
else
  echo "install-skill already present in ~/.zshrc"
fi

# ---------------------------------------------------------------- Step 3
say "Step 3: phone-harness (GATED — read before proceeding)"
cat <<'EOF'
SkillSpector rates phone-harness CRITICAL (100/100, "DO NOT INSTALL").
The findings are mostly its documented design (it execs agent-written
Python that can tap/type/read your phone screen), but that design IS the
risk: anything the agent runs has full control of the mirrored phone.
Also: telemetry sends script text + output tails to PostHog unless you run
`phone-harness config set telemetry false`.

If you accept that and want it anyway:
  git clone https://github.com/ShawnPana/phone-harness ~/.phone-harness
  cd ~/.phone-harness && pip install -e .
  phone-harness config set telemetry false
  mkdir -p ~/.claude/skills/phone-harness
  phone-harness skill > ~/.claude/skills/phone-harness/SKILL.md
Then (iPhone): pair the macOS iPhone Mirroring app once, grant your
terminal Accessibility + Screen Recording in System Settings -> Privacy &
Security, restart the terminal, and run: phone-harness --doctor ios
EOF

# ---------------------------------------------------------------- Step 5
say "Step 5: TryComp CRM"
if ! command -v bun >/dev/null; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not running. Install/start Docker Desktop (docker.com), then re-run."
  exit 1
fi
mkdir -p "$HOME/projects"
if [ ! -d "$HOME/projects/trycompai-crm" ]; then
  git clone https://github.com/trycompai/crm.git "$HOME/projects/trycompai-crm"
fi
cd "$HOME/projects/trycompai-crm"
[ -f .env ] || cp .env.example .env
if grep -q '^BETTER_AUTH_SECRET=""' .env; then
  SECRET=$(openssl rand -base64 32)
  sed -i '' "s|^BETTER_AUTH_SECRET=\"\"|BETTER_AUTH_SECRET=\"$SECRET\"|" .env
fi
if grep -q '^ALLOWED_SIGN_IN=""' .env; then
  sed -i '' 's|^ALLOWED_SIGN_IN=""|ALLOWED_SIGN_IN="antidotethecure@gmail.com"|' .env
fi
bun install
docker compose up -d
bun run db:deploy
bun run db:seed
echo
echo "CRM ready except Google OAuth. Fill GOOGLE_CLIENT_ID and"
echo "GOOGLE_CLIENT_SECRET in .env (see toolchain notes), then: bun run dev"
