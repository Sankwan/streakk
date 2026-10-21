"""Package an already verified build without dependencies or local machine state."""
from datetime import datetime, timezone
from pathlib import Path
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
if not (root / 'dist/index.html').is_file():
    raise SystemExit('Run npm run build before packaging.')
version = json.loads((root / 'package.json').read_text())['version']
try:
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True, stderr=subprocess.DEVNULL).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=root, text=True).strip())
except (subprocess.CalledProcessError, FileNotFoundError):
    commit, dirty = 'local', None
name = f'Streak-v{version}-{commit[:12]}'
output = root / 'artifacts' / (name + '.zip')
output.parent.mkdir(exist_ok=True)
files = ['.github', '.gitignore', '.nvmrc', 'src', 'tests', 'tools', 'scripts', 'docs', 'dist', '.ci-results',
         'index.html', 'package.json', 'package-lock.json', 'tsconfig.json',
         'README.md', 'AGENTS.md', 'THIRD_PARTY_NOTICES.txt', 'VALIDATION.txt',
         'route-checks.json', 'serve.py', 'Start Streak Race.command']
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for entry in files:
        path = root / entry
        candidates = sorted(path.rglob('*')) if path.is_dir() else [path]
        for item in candidates:
            if item.is_file() and not item.is_symlink() and '__pycache__' not in item.parts:
                archive.write(item, name + '/' + item.relative_to(root).as_posix())
    archive.writestr(name + '/BUILD.json', json.dumps({
        'version': version, 'commit': commit, 'dirty': dirty,
        'packagedAtUTC': datetime.now(timezone.utc).isoformat(),
    }, indent=2) + '\n')
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise SystemExit('Archive integrity check failed.')
print(output)
