
# install-skill: scan any skill repo with SkillSpector before installing it.
# Usage: install-skill <git-url>
install-skill() {
  local url="$1"
  if [ -z "$url" ]; then
    echo "Usage: install-skill <git-url>" >&2
    return 1
  fi
  local name tmpdir dest
  name="$(basename "$url" .git)"
  tmpdir="$(mktemp -d)/$name"
  dest="$HOME/.claude-skills/$name"
  if [ -e "$dest" ]; then
    echo "install-skill: $dest already exists. Remove it first if you want to reinstall." >&2
    return 1
  fi
  echo "Cloning $url ..."
  git clone --depth 1 "$url" "$tmpdir" || return 1
  echo
  echo "=== SkillSpector report for $name ==="
  "$HOME/.skillspector/.venv/bin/skillspector" scan "$tmpdir" --no-llm
  echo "====================================="
  echo
  printf "Install %s into ~/.claude-skills/ ? [y/N] " "$name"
  read -r ans
  case "$ans" in
    y|Y|yes|YES)
      mkdir -p "$HOME/.claude-skills"
      mv "$tmpdir" "$dest"
      echo "Installed: $dest"
      ;;
    *)
      echo "Not installed. Clone left at: $tmpdir (delete it if you don't want it)."
      ;;
  esac
}
