"""Read line 894 of data.js as bytes and print repr."""
import sys

p = r"E:\Project\Vendo\src\js\data.js"
with open(p, "rb") as f:
    lines = f.read().split(b"\n")
# 0-indexed: line 894 -> lines[893]
for idx in (893, 894, 895, 896, 929, 947, 952, 961):
    if idx < len(lines):
        print(f"L{idx+1}: {lines[idx]!r}")
print(f"Total lines: {len(lines)}")
