import hashlib
import os

def hash_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()

BASELINE_HASHES = {
    "/etc/nginx/nginx.conf": "a91f3c...",
}

def integrity_check(path):
    return hash_file(path) == BASELINE_HASHES.get(path)
