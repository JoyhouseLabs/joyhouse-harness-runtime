"""Create a sorted ZIP with portable paths, preserving files and executable bits."""
import os
import pathlib
import sys
import zipfile

root = pathlib.Path(sys.argv[1]).resolve()
destination = pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for directory, dirs, files in os.walk(root):
        dirs.sort()
        for name in dirs:
            if (pathlib.Path(directory) / name).is_symlink():
                raise ValueError("Directory symlinks are not distributable")
        for name in sorted(files):
            path = pathlib.Path(directory) / name
            path.resolve().relative_to(root)
            info = zipfile.ZipInfo(path.relative_to(root).as_posix(), (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (path.stat().st_mode & 0xFFFF) << 16
            archive.writestr(info, path.read_bytes())
