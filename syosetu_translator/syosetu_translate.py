#!/usr/bin/env python3
"""소설가가 되자(ncode.syosetu.com) 소설을 화 범위만큼 받아 한국어로 번역해 .txt로 저장한다.

사용 예:
    py -3 syosetu_translate.py n9669bk 1-10
    py -3 syosetu_translate.py https://ncode.syosetu.com/n9669bk/ 5
    py -3 syosetu_translate.py n9669bk 280-          (280화부터 마지막 화까지)
    py -3 syosetu_translate.py n9669bk 1-3 --engine google

번역 엔진
    claude : Claude API (기본). ANTHROPIC_API_KEY 환경 변수나 `ant auth login`이 필요하다.
             고유명사 용어집을 화마다 이어 써서 이름·용어가 일정하게 번역된다.
    google : 무료 구글 번역. 키가 필요 없지만 품질이 떨어지고 용어집을 쓰지 않는다.
    auto   : Claude를 먼저 시도하고, 인증 정보가 없으면 구글로 넘어간다.

개인적으로 읽기 위한 도구다. 번역본을 다시 배포하는 것은 원작자의 허락 없이는 하지 말 것.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

import requests

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
MODEL_ALIASES = {
    "sonnet": "claude-sonnet-5-5",  # 기본: 번역 품질과 값의 균형
    "haiku": "claude-haiku-5-5",    # 가장 싸고 빠름
    "opus": "claude-opus-5-5",      # 가장 좋지만 비쌈
}
DEFAULT_MODEL = "sonnet"
STRIP = "\ufeff\u200b \t\r\n"  # 붙여넣기에 딸려 오는 BOM·폭 없는 공백까지 지운다


# ---------------------------------------------------------------- 내려받기

@dataclass
class Novel:
    ncode: str
    host: str            # ncode.syosetu.com 또는 novel18.syosetu.com
    title: str
    writer: str
    total: int           # 전체 화수 (단편이면 1)
    short: bool          # 단편(화 구분 없음)


@dataclass
class Episode:
    no: int
    title: str = ""
    preface: list[str] = field(default_factory=list)
    body: list[str] = field(default_factory=list)
    afterword: list[str] = field(default_factory=list)


class Fetcher:
    def __init__(self, delay: float):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self.s.cookies.set("over18", "yes", domain=".syosetu.com")  # 녹턴/무녹턴(성인) 작품용
        self.delay = delay
        self._last = 0.0

    def get(self, url: str, **kw) -> requests.Response:
        for attempt in range(5):
            wait = self.delay - (time.time() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.time()
            try:
                r = self.s.get(url, timeout=30, **kw)
            except requests.RequestException as e:
                print(f"  ! 접속 오류 ({e.__class__.__name__}), 다시 시도 {attempt + 1}/5")
                time.sleep(5 * (attempt + 1))
                continue
            if r.status_code in (429, 500, 502, 503, 504):
                print(f"  ! 서버 응답 {r.status_code}, 잠시 뒤 다시 시도 {attempt + 1}/5")
                time.sleep(10 * (attempt + 1))
                continue
            return r
        raise RuntimeError(f"{url} 을(를) 받지 못했습니다.")


def parse_target(s: str) -> tuple[str, str]:
    """'n9669bk' 나 'https://ncode.syosetu.com/n9669bk/3/' 에서 (host, ncode)."""
    s = s.strip(STRIP)
    m = re.search(r"(ncode|novel18)\.syosetu\.com/(n\d+[a-z]+)", s, re.I)
    if m:
        return f"{m.group(1).lower()}.syosetu.com", m.group(2).lower()
    if re.fullmatch(r"n\d+[a-z]+", s.strip(), re.I):
        return "ncode.syosetu.com", s.strip().lower()
    raise SystemExit(f"소설 주소나 N코드를 알아볼 수 없습니다: {s}")


def get_novel(f: Fetcher, host: str, ncode: str) -> Novel:
    api = ("https://api.syosetu.com/novel18api/api/" if host.startswith("novel18")
           else "https://api.syosetu.com/novelapi/api/")
    try:
        data = f.get(api, params={"out": "json", "of": "t-w-nt-ga", "ncode": ncode}).json()
        if data and data[0].get("allcount", 0) >= 1:
            d = data[1]
            short = d.get("noveltype") == 2
            return Novel(ncode, host, d["title"], d.get("writer", ""),
                         1 if short else int(d["general_all_no"]), short)
    except (ValueError, KeyError, IndexError, RuntimeError):
        pass
    # API가 안 될 때: 목차 페이지에서 제목과 마지막 화 번호를 읽는다.
    r = f.get(f"https://{host}/{ncode}/")
    if r.status_code == 404:
        raise SystemExit(f"소설을 찾을 수 없습니다: {ncode}")
    html = r.text
    m = re.search(r'<h1 class="p-novel__title[^"]*">(.*?)</h1>', html, re.S)
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ncode
    nums = [int(n) for n in re.findall(rf'href="/{ncode}/(\d+)/"', html)]
    last = re.search(rf'c-pager__item--last"[^>]*href="/{ncode}/\?p=(\d+)"', html) \
        or re.search(rf'href="/{ncode}/\?p=(\d+)"[^>]*class="c-pager__item c-pager__item--last"', html)
    if last:  # 목차가 여러 쪽이면 마지막 쪽을 본다
        html2 = f.get(f"https://{host}/{ncode}/?p={last.group(1)}").text
        nums += [int(n) for n in re.findall(rf'href="/{ncode}/(\d+)/"', html2)]
    short = not nums and "js-novel-text" in html
    return Novel(ncode, host, title, "", 1 if short else max(nums, default=0), short)


class EpisodeParser(HTMLParser):
    """본문 페이지에서 제목·머리말·본문·후기를 줄 단위로 뽑는다. 루비(후리가나)는 버린다."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ep = Episode(0)
        self.section: list[str] | None = None
        self.div_depth = 0
        self.line: list[str] | None = None
        self.skip = 0
        self.in_title = False
        self.title_parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class") or ""
        if self.section is None:
            if tag == "div" and "js-novel-text" in cls:
                if "--preface" in cls:
                    self.section = self.ep.preface
                elif "--afterword" in cls:
                    self.section = self.ep.afterword
                else:
                    self.section = self.ep.body
                self.div_depth = 1
            elif tag == "h1" and "p-novel__title" in cls:
                self.in_title = True
            return
        if tag == "div":
            self.div_depth += 1
        elif tag == "p":
            self.line = []
        elif tag in ("rt", "rp"):
            self.skip += 1
        elif tag == "img" and self.line is not None:
            self.line.append("［삽화］")

    def handle_endtag(self, tag):
        if self.in_title and tag == "h1":
            self.in_title = False
            self.ep.title = "".join(self.title_parts).strip()
            return
        if self.section is None:
            return
        if tag in ("rt", "rp"):
            self.skip = max(0, self.skip - 1)
        elif tag == "p" and self.line is not None:
            self.section.append("".join(self.line).rstrip())
            self.line = None
        elif tag == "div":
            self.div_depth -= 1
            if self.div_depth == 0:
                self.section = None

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)
        elif self.line is not None and not self.skip:
            self.line.append(data.replace("\n", ""))


def get_episode(f: Fetcher, nv: Novel, no: int) -> Episode | None:
    url = f"https://{nv.host}/{nv.ncode}/" + ("" if nv.short else f"{no}/")
    r = f.get(url)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    p = EpisodeParser()
    p.feed(r.text)
    ep = p.ep
    ep.no = no
    if nv.short and not ep.title:
        ep.title = nv.title
    for sec in (ep.preface, ep.body, ep.afterword):  # 앞뒤 빈 줄 정리
        while sec and not sec[0].strip():
            sec.pop(0)
        while sec and not sec[-1].strip():
            sec.pop()
    return ep if (ep.body or ep.preface or ep.afterword) else None


# ---------------------------------------------------------------- 번역

class NoCredentials(Exception):
    pass


SYSTEM_PROMPT = """\
당신은 일본 웹소설을 한국어로 옮기는 전문 번역가입니다.

번역 원칙:
- 한국 웹소설 독자가 읽기에 자연스러운 한국어 문장으로 옮깁니다. 직역투를 피하되 내용을 빼거나 덧붙이지 않습니다.
- 줄 구성을 그대로 지킵니다. 원문 한 줄은 번역 한 줄이 되고, 빈 줄은 빈 줄로 남깁니다. 줄을 합치거나 나누지 않습니다.
- 줄 앞의 전각 공백(　) 들여쓰기는 지우고, 대사의 「」『』는 한국식 큰따옴표 “ ”와 작은따옴표 ‘ ’로 바꿉니다.
- 인물마다 말투(반말·존댓말, 거친 말투, 사투리 느낌 등)를 살리고, 같은 인물의 말투를 일관되게 유지합니다.
- 인명·지명·기술명 등 고유명사는 용어집이 있으면 반드시 용어집대로 씁니다. 용어집에 없는 고유명사는 일본어 발음을 국립국어원 외래어 표기법에 가깝게 적되, 가타카나로 쓴 서양식 이름은 원어 이름에 맞춰 적습니다.
- 의성어·의태어, 말줄임표(……), 강조 기호는 한국어 표현에 맞게 살립니다.
- ［삽화］ 같은 표시는 그대로 둡니다.

출력 형식 (태그만 쓰고 다른 설명은 붙이지 마세요):
<title>번역한 화 제목</title>
<preface>번역한 머리말 (입력에 있을 때만)</preface>
<body>번역한 본문</body>
<afterword>번역한 후기 (입력에 있을 때만)</afterword>
<glossary>
이번 화에 처음 나온, 용어집에 없는 고유명사를 한 줄에 하나씩 「원문 => 번역」 형식으로 (없으면 비워 둠)
</glossary>"""


def build_episode_input(ep: Episode) -> str:
    parts = [f"<title>{ep.title}</title>"]
    if ep.preface:
        parts.append("<preface>\n" + "\n".join(ep.preface) + "\n</preface>")
    parts.append("<body>\n" + "\n".join(ep.body) + "\n</body>")
    if ep.afterword:
        parts.append("<afterword>\n" + "\n".join(ep.afterword) + "\n</afterword>")
    return "\n".join(parts)


def take_tag(text: str, tag: str) -> list[str] | None:
    m = re.search(rf"<{tag}>\n?(.*?)\n?</{tag}>", text, re.S)
    if not m:
        return None
    return m.group(1).split("\n")


class ClaudeTranslator:
    name = "claude"

    def __init__(self, model: str, effort: str):
        try:
            import anthropic
        except ImportError:
            raise NoCredentials("anthropic 패키지가 없습니다 (py -3 -m pip install anthropic)")
        self.anthropic = anthropic
        self.client = anthropic.Anthropic(max_retries=5)
        self.model = MODEL_ALIASES.get(model.lower(), model)
        self.effort = effort
        self.name = f"claude ({self.model}, effort {effort})"

    def _call(self, system: str, user: str, max_tokens: int) -> str:
        a = self.anthropic
        req = dict(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
            thinking={"type": "adaptive"},
            output_config={"effort": self.effort},
        )
        try:
            if self.model.startswith("claude-haiku"):
                # Haiku에는 거절 시 다른 모델로 넘기는 서버 기능이 없다.
                stream_ctx = self.client.messages.stream(**req)
            else:
                # 안전 분류기가 거절하면 서버가 다른 모델로 이어서 번역하게 한다.
                stream_ctx = self.client.beta.messages.stream(
                    **req, betas=["server-side-fallback-2026-07-01"], fallbacks="default")
            with stream_ctx as stream:
                msg = stream.get_final_message()
        except TypeError as e:  # 인증 정보를 찾지 못했을 때 SDK가 내는 오류
            if "authentication" in str(e).lower():
                raise NoCredentials(str(e))
            raise
        except a.AuthenticationError as e:
            raise NoCredentials(f"API 키가 올바르지 않습니다: {e.message}")
        if msg.stop_reason == "refusal":
            cat = getattr(msg.stop_details, "category", None) if msg.stop_details else None
            raise RuntimeError(f"모델이 번역을 거절했습니다 (분류: {cat})")
        if msg.stop_reason == "max_tokens":
            raise RuntimeError("출력 길이 제한에 걸려 번역이 잘렸습니다")
        return "".join(b.text for b in msg.content if b.type == "text")

    def translate_short(self, text: str) -> str:
        out = self._call("일본어를 한국어로 번역합니다. 번역문 한 줄만 출력하세요.", text, 2000)
        return out.strip().splitlines()[0].strip() if out.strip() else text

    def translate_episode(self, ep: Episode, glossary: dict[str, str]):
        system = SYSTEM_PROMPT
        if glossary:
            system += "\n\n용어집 (원문 => 번역):\n" + "\n".join(f"{k} => {v}" for k, v in glossary.items())
        out = self._call(system, build_episode_input(ep), 64000)
        body = take_tag(out, "body")
        if body is None:
            raise RuntimeError("번역 결과에서 본문을 찾지 못했습니다")
        new_terms = {}
        for line in take_tag(out, "glossary") or []:
            if "=>" in line:
                k, v = (x.strip(" 「」-・") for x in line.split("=>", 1))
                if k and v and k not in glossary:
                    new_terms[k] = v
        title = (take_tag(out, "title") or [ep.title])[0].strip()
        return Episode(ep.no, title, take_tag(out, "preface") or [], body,
                       take_tag(out, "afterword") or []), new_terms


class GoogleTranslator:
    name = "google"
    URL = "https://translate.googleapis.com/translate_a/single"

    def __init__(self):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA

    def _one(self, text: str) -> str:
        for attempt in range(5):
            try:
                r = self.s.post(self.URL, params={"client": "gtx", "sl": "ja", "tl": "ko", "dt": "t"},
                                data={"q": text}, timeout=30)
                if r.status_code == 200:
                    return "".join(seg[0] for seg in r.json()[0] if seg and seg[0])
            except (requests.RequestException, ValueError):
                pass
            time.sleep(5 * (attempt + 1))
        raise RuntimeError("구글 번역에 실패했습니다 (요청이 막혔을 수 있습니다. 잠시 뒤 다시 해 보세요)")

    def _lines(self, lines: list[str]) -> list[str]:
        """줄 구성을 지키려고 빈 줄은 건너뛰고, 내용 있는 줄을 묶어 보낸 뒤 다시 줄별로 나눈다."""
        out = list(lines)
        idx = [i for i, l in enumerate(lines) if l.strip()]
        chunk: list[int] = []
        size = 0

        def flush():
            nonlocal chunk, size
            if not chunk:
                return
            res = self._one("\n".join(lines[i].strip() for i in chunk)).split("\n")
            if len(res) != len(chunk):  # 줄 수가 어긋나면 한 줄씩 다시
                res = [self._one(lines[i].strip()) for i in chunk]
            for i, t in zip(chunk, res):
                out[i] = t.strip()
            chunk, size = [], 0
            time.sleep(0.5)

        for i in idx:
            if size + len(lines[i]) > 1500:
                flush()
            chunk.append(i)
            size += len(lines[i]) + 1
        flush()
        return [fix_quotes(l) for l in out]

    def translate_short(self, text: str) -> str:
        return self._one(text).strip()

    def translate_episode(self, ep: Episode, glossary: dict[str, str]):
        return Episode(ep.no, fix_quotes(self.translate_short(ep.title)), self._lines(ep.preface),
                       self._lines(ep.body), self._lines(ep.afterword)), {}


def fix_quotes(s: str) -> str:
    return (s.replace("「", "“").replace("」", "”").replace("『", "‘").replace("』", "’")
            .lstrip("　 "))


# ---------------------------------------------------------------- 저장

def safe_name(s: str, limit: int = 60) -> str:
    s = re.sub(r'[\\/:*?"<>|\r\n\t]', "_", s).strip(" .")
    return s[:limit] or "untitled"


def episode_text(ep: Episode, short: bool) -> str:
    head = ep.title if short else f"제{ep.no}화 {ep.title}"
    parts = [head, ""]
    if ep.preface:
        parts += ["[머리말]", *ep.preface, "", "─" * 20, ""]
    parts += ep.body
    if ep.afterword:
        parts += ["", "─" * 20, "[후기]", *ep.afterword]
    return "\n".join(parts).rstrip() + "\n"


def load_glossary(path: Path) -> dict[str, str]:
    g = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=>" in line and not line.lstrip().startswith("#"):
                k, v = (x.strip() for x in line.split("=>", 1))
                if k and v:
                    g[k] = v
    return g


def save_glossary(path: Path, g: dict[str, str]):
    lines = ["# 고유명사 용어집 (원문 => 번역). 직접 고치면 다음 번역부터 그대로 씁니다.", ""]
    lines += [f"{k} => {v}" for k, v in g.items()]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- 실행

def parse_range(s: str, total: int) -> tuple[int, int]:
    s = s.strip(STRIP).lower()
    if s in ("all", "전체"):
        return 1, total
    m = re.fullmatch(r"(\d+)\s*(?:-\s*(\d*))?", s)
    if not m:
        raise SystemExit(f"화 범위를 알아볼 수 없습니다: {s}  (예: 5, 1-10, 30-, all)")
    a = int(m.group(1))
    b = a if m.group(2) is None else (int(m.group(2)) if m.group(2) else total)
    return a, b


def make_translator(engine: str, model: str, effort: str):
    if engine == "google":
        return GoogleTranslator()
    try:
        return ClaudeTranslator(model, effort)
    except NoCredentials as e:
        if engine == "claude":
            raise SystemExit(f"Claude를 쓸 수 없습니다: {e}")
        print(f"※ Claude를 쓸 수 없어 구글 번역으로 합니다: {e}")
        return GoogleTranslator()


def main():
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    ap = argparse.ArgumentParser(description="syosetu 소설을 한국어로 번역해 .txt로 저장합니다.")
    ap.add_argument("novel", nargs="?",
                    help="소설 주소 또는 N코드 (예: https://ncode.syosetu.com/n9669bk/ 또는 n9669bk). 생략하면 물어봄")
    ap.add_argument("range", nargs="?", help="화 범위: 5 / 1-10 / 30- (끝까지) / all. 생략하면 물어봄")
    ap.add_argument("--engine", choices=["auto", "claude", "google"], default="auto",
                    help="번역 엔진 (기본 auto: Claude, 안 되면 구글)")
    ap.add_argument("--model", default=DEFAULT_MODEL,
                    help=f"Claude 모델: sonnet / haiku / opus 또는 모델 ID (기본 {DEFAULT_MODEL})")
    ap.add_argument("--effort", default="medium", choices=["low", "medium", "high", "xhigh", "max"],
                    help="Claude가 얼마나 공들여 생각할지 (기본 medium)")
    ap.add_argument("-o", "--out", default="번역", help="저장할 폴더 (기본: ./번역)")
    ap.add_argument("--delay", type=float, default=1.5, help="syosetu 페이지 요청 사이 간격(초)")
    ap.add_argument("--save-original", action="store_true", help="일본어 원문도 함께 저장")
    ap.add_argument("--force", action="store_true", help="이미 번역한 화도 다시 번역")
    ap.add_argument("--no-merge", action="store_true", help="범위 전체를 한 파일로 합치지 않음")
    args = ap.parse_args()
    while not (args.novel or "").strip():
        args.novel = input("소설 주소 또는 N코드: ").strip(STRIP)

    f = Fetcher(args.delay)
    host, ncode = parse_target(args.novel)
    nv = get_novel(f, host, ncode)
    if nv.total < 1:
        raise SystemExit("화 목록을 찾지 못했습니다.")
    while not (args.range or "").strip():
        args.range = input(f"《{nv.title}》 전 {nv.total}화 — 화 범위 (예: 1-10, 5, 30-, all): ").strip(STRIP)
    a, b = parse_range(args.range, nv.total)
    if a < 1 or a > nv.total:
        raise SystemExit(f"이 소설은 1~{nv.total}화까지 있습니다.")
    b = min(b, nv.total)
    if b < a:
        raise SystemExit("화 범위의 끝이 시작보다 앞입니다.")

    print(f"《{nv.title}》 {nv.writer}  (전 {nv.total}화{', 단편' if nv.short else ''})")
    tr = make_translator(args.engine, args.model, args.effort)

    folder = Path(args.out) / f"{safe_name(nv.title, 40)} [{ncode}]"
    folder.mkdir(parents=True, exist_ok=True)
    info_path = folder / "정보.json"
    info = json.loads(info_path.read_text(encoding="utf-8")) if info_path.exists() else {}
    if not info.get("title_ko"):
        try:
            info["title_ko"] = tr.translate_short(nv.title)
        except NoCredentials as e:
            if args.engine == "claude":
                raise SystemExit(f"Claude를 쓸 수 없습니다: {e}")
            print(f"※ Claude 인증 정보가 없어 구글 번역으로 합니다.\n  ({e})")
            tr = GoogleTranslator()
            info["title_ko"] = tr.translate_short(nv.title)
    info.update(ncode=ncode, url=f"https://{host}/{ncode}/", title=nv.title, writer=nv.writer)
    info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"한국어 제목: {info['title_ko']}\n저장 위치: {folder.resolve()}\n번역 엔진: {tr.name}\n")

    gl_path = folder / "용어집.txt"
    glossary = load_glossary(gl_path)
    width = len(str(nv.total))
    done, failed, missing = [], [], []

    for no in range(a, b + 1):
        out_path = folder / f"{no:0{width}d}화.txt"
        if out_path.exists() and not args.force:
            print(f"[{no}화] 이미 번역됨, 건너뜀")
            done.append(no)
            continue
        print(f"[{no}화] 받는 중…", end=" ", flush=True)
        ep = get_episode(f, nv, no)
        if ep is None:
            print("없음 (삭제된 화일 수 있음)")
            missing.append(no)
            continue
        n_chars = sum(len(l) for l in ep.preface + ep.body + ep.afterword)
        print(f"「{ep.title}」 {n_chars}자 → 번역 중…", end=" ", flush=True)
        if args.save_original:
            (folder / "원문").mkdir(exist_ok=True)
            (folder / "원문" / f"{no:0{width}d}.txt").write_text(
                episode_text(ep, nv.short).replace(f"제{no}화 ", f"第{no}話 ", 1), encoding="utf-8")
        t0 = time.time()
        try:
            try:
                ko, new_terms = tr.translate_episode(ep, glossary)
            except NoCredentials as e:
                if args.engine != "auto":
                    raise SystemExit(f"\nClaude 인증 오류: {e}")
                print("\n※ Claude 인증 정보가 없어 구글 번역으로 합니다…", end=" ", flush=True)
                tr = GoogleTranslator()
                ko, new_terms = tr.translate_episode(ep, glossary)
        except Exception as e:  # 한 화가 실패해도 나머지는 계속
            print(f"실패: {e}")
            failed.append(no)
            continue
        out_path.write_text(episode_text(ko, nv.short), encoding="utf-8")
        if new_terms:
            glossary.update(new_terms)
            save_glossary(gl_path, glossary)
        print(f"완료 ({time.time() - t0:.0f}초{f', 새 용어 {len(new_terms)}개' if new_terms else ''})")
        done.append(no)

    if done and not args.no_merge and len(done) > 1:
        merged = folder / f"{safe_name(info['title_ko'], 40)} {min(done)}-{max(done)}화.txt"
        texts = [(folder / f"{n:0{width}d}화.txt").read_text(encoding="utf-8") for n in sorted(done)]
        header = f"{info['title_ko']}\n({nv.title} / {nv.writer})\n{info['url']}\n\n"
        merged.write_text(header + ("\n\n" + "=" * 30 + "\n\n").join(texts), encoding="utf-8")
        print(f"\n합친 파일: {merged.resolve()}")

    print(f"\n완료 {len(done)}화" + (f", 실패 {failed}" if failed else "")
          + (f", 없는 화 {missing}" if missing else ""))
    if failed:
        print("실패한 화는 같은 명령을 다시 실행하면 그 화만 다시 번역합니다.")
        sys.exit(1)


if __name__ == "__main__":
    main()
