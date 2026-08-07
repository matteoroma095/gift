from __future__ import annotations

import base64
import io
import os
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont

REPO = os.environ.get("GITHUB_REPOSITORY", "matteoroma095/gift")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
ROOT = Path(__file__).resolve().parents[1]
UA = {"User-Agent": "Mozilla/5.0 gift-site-bootstrap/1.0"}

BLOBS = {
    "assets/personal/01-opening.jpg": "df1bef5b16658a5c903997cb1589d0561ce53493",
    "assets/personal/02-clue-1.jpg": "78362cd0d1e786c78e9ed4e15106cad8a7eb47ba",
    "assets/personal/03-clue-2.jpg": "46e2fea55bafa4678cb65f7ea89aab08385c1ddf",
    "assets/personal/04-choice.jpg": "dbe26db0c6738128b29bdd31f8f3acb624e7616e",
    "assets/personal/05-scratch.jpg": "6f44c29315e890e5701e2c230683b3508f2284ca",
    "assets/personal/06-first-reveal.jpg": "f8aaa0c196e5357f7b78647b2005bee3fdb9dee5",
    "assets/personal/07-response.jpg": "1b60377847f0745a97406b6022a55e01d7c3ebf3",
    "assets/personal/08-plot-twist.jpg": "dc2e2be3fb76faab053d0018d199a0c6774a98ff",
    "assets/personal/09-options.jpg": "03740a8cc3329eccd64ad1ac0f8fc8a7865813fd",
    "assets/personal/10-final.jpg": "d6a3ab06ca3308f926e8932e814ca2ad0013a6e",
    "assets/treatments/botox-filler-longevity.jpg": "877aa1e99a25acea4551deb29f8a6fdc40bff96b",
    "assets/treatments/filler-contouring.jpg": "f51640b95cb983a636b63d8023e0081c6c47aa41",
}

PROMO_ROOT = "https://checkout.clinicitalia.it/promo/"
TARGETS = {
    "assets/treatments/botox-2-zone.jpg": [
        ("botox", "due zone"),
        ("botox", "2 zone"),
        ("botox", "2-zone"),
    ],
    "assets/treatments/botox-completo.jpg": [
        ("botox", "completo"),
        ("botox", "3 zone"),
    ],
}


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def download_blob(path_rel: str, sha: str) -> bool:
    path = ROOT / path_rel
    if path.exists() and path.stat().st_size > 1000:
        return True
    headers = {"Accept": "application/vnd.github+json", **UA}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    url = f"https://api.github.com/repos/{REPO}/git/blobs/{sha}"
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    payload = r.json()
    data = base64.b64decode(str(payload["content"]).replace("\n", ""))
    ensure_parent(path)
    path.write_bytes(data)
    print(f"materialized {path_rel}: {len(data)} bytes")
    return True


def norm(value: str) -> str:
    value = value.lower().replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", value).strip()


def score(text: str, aliases: list[tuple[str, ...]]) -> int:
    t = norm(text)
    best = 0
    for alias in aliases:
        hits = sum(1 for token in alias if token in t)
        if hits == len(alias):
            best = max(best, 100 + hits)
        else:
            best = max(best, hits * 10)
    return best


def image_candidates(soup: BeautifulSoup, base_url: str, aliases: list[tuple[str, ...]]):
    found: list[tuple[int, str]] = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
        if not src:
            continue
        context = " ".join([
            img.get("alt", ""), img.get("title", ""), src,
            img.parent.get_text(" ", strip=True) if img.parent else "",
        ])
        found.append((score(context, aliases), urljoin(base_url, src)))
    return sorted(found, reverse=True)


def page_candidates(soup: BeautifulSoup, base_url: str, aliases: list[tuple[str, ...]]):
    found: list[tuple[int, str]] = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        if urlparse(href).netloc != urlparse(PROMO_ROOT).netloc:
            continue
        context = " ".join([a.get_text(" ", strip=True), href])
        img = a.find("img")
        if img:
            context += " " + img.get("alt", "") + " " + img.get("title", "")
        found.append((score(context, aliases), href))
    return sorted(found, reverse=True)


def page_hero(page_url: str, aliases: list[tuple[str, ...]]) -> str | None:
    r = requests.get(page_url, headers=UA, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    og = soup.find("meta", attrs={"property": "og:image"})
    if og and og.get("content"):
        return urljoin(page_url, og["content"])
    candidates = image_candidates(soup, page_url, aliases)
    if candidates:
        return candidates[0][1]
    return None


def save_as_jpeg(data: bytes, path: Path) -> None:
    with Image.open(io.BytesIO(data)) as im:
        im = im.convert("RGB")
        if max(im.size) > 1400:
            im.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
        ensure_parent(path)
        im.save(path, "JPEG", quality=88, optimize=True, progressive=True)


def scrape_treatment(path_rel: str, aliases: list[tuple[str, ...]]) -> bool:
    path = ROOT / path_rel
    if path.exists() and path.stat().st_size > 1000:
        return True
    try:
        root = requests.get(PROMO_ROOT, headers=UA, timeout=30)
        root.raise_for_status()
        soup = BeautifulSoup(root.text, "html.parser")

        urls: list[str] = []
        for points, href in page_candidates(soup, PROMO_ROOT, aliases):
            if points >= 20 and href not in urls:
                urls.append(href)
        for points, src in image_candidates(soup, PROMO_ROOT, aliases):
            if points >= 20:
                data = requests.get(src, headers=UA, timeout=30).content
                save_as_jpeg(data, path)
                print(f"downloaded {path_rel} from {src}")
                return True

        for href in urls[:8]:
            try:
                src = page_hero(href, aliases)
                if not src:
                    continue
                r = requests.get(src, headers=UA, timeout=30)
                r.raise_for_status()
                save_as_jpeg(r.content, path)
                print(f"downloaded {path_rel} from {src}")
                return True
            except Exception as exc:
                print(f"candidate failed {href}: {exc}")
    except Exception as exc:
        print(f"promo scrape failed for {path_rel}: {exc}")
    return False


def placeholder(path_rel: str, title: str) -> None:
    path = ROOT / path_rel
    ensure_parent(path)
    im = Image.new("RGB", (1080, 1080), (63, 174, 202))
    draw = ImageDraw.Draw(im)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    try:
        font = ImageFont.truetype(font_path, 78)
        small = ImageFont.truetype(font_path, 34)
    except Exception:
        font = ImageFont.load_default()
        small = font
    draw.text((540, 140), "CLINIC MEDICAL BEAUTY", anchor="mm", fill="white", font=small)
    words = title.split()
    lines, line = [], ""
    for word in words:
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=font) > 830 and line:
            lines.append(line); line = word
        else:
            line = trial
    if line: lines.append(line)
    y = 430 - (len(lines)-1)*50
    for row in lines:
        draw.text((540, y), row, anchor="mm", fill="white", font=font)
        y += 105
    draw.text((540, 860), "Il trattamento lo scegli tu ✨", anchor="mm", fill="white", font=small)
    im.save(path, "JPEG", quality=90, optimize=True)
    print(f"created fallback poster {path_rel}")


def main() -> None:
    failures = []
    for path_rel, sha in BLOBS.items():
        try:
            download_blob(path_rel, sha)
        except Exception as exc:
            failures.append((path_rel, str(exc)))
            print(f"FAILED blob {path_rel}: {exc}")

    names = {
        "assets/treatments/botox-2-zone.jpg": "Botox — 2 zone",
        "assets/treatments/botox-completo.jpg": "Botox — completo",
    }
    for path_rel, aliases in TARGETS.items():
        if not scrape_treatment(path_rel, aliases):
            placeholder(path_rel, names[path_rel])

    ready = ROOT / "assets" / ".ready"
    ready.parent.mkdir(parents=True, exist_ok=True)
    ready.write_text("gift media materialized\n")
    if failures:
        print("Some orphan blobs could not be materialized; browser fallbacks remain active:")
        for item in failures:
            print(" -", item)


if __name__ == "__main__":
    main()
