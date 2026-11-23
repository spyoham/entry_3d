# syosetu 번역기

소설가가 되자(`ncode.syosetu.com`, 성인판 `novel18.syosetu.com`)의 소설을 원하는 화 범위만큼 받아서 한국어로 번역해 `.txt`로 저장합니다.

## 준비

```
py -3 -m pip install -r requirements.txt
```

Claude로 번역하려면 API 키가 있어야 합니다 (https://platform.claude.com 에서 발급).

```
setx ANTHROPIC_API_KEY "sk-ant-..."     # 한 번 설정한 뒤 터미널을 새로 열 것
```

키가 없으면 무료 구글 번역으로 자동으로 넘어갑니다 (품질은 떨어짐).

## 쓰는 법

```
py -3 syosetu_translate.py <소설 주소 또는 N코드> <화 범위> [옵션]
```

| 화 범위 | 뜻 |
|---|---|
| `5` | 5화만 |
| `1-10` | 1화부터 10화까지 |
| `30-` | 30화부터 마지막 화까지 |
| `all` | 전부 |

예:

```
py -3 syosetu_translate.py https://ncode.syosetu.com/n9669bk/ 1-10
py -3 syosetu_translate.py n9669bk 11-20 --engine google
```

`번역.bat`을 더블클릭하면 주소와 범위를 물어봅니다.

### 옵션

| 옵션 | 설명 |
|---|---|
| `--engine auto/claude/google` | 번역 엔진. 기본 `auto` (Claude, 안 되면 구글) |
| `--model` | Claude 모델 (기본 `claude-opus-5-5`) |
| `--effort low/medium/high/...` | Claude가 생각하는 깊이 (기본 `medium`). 높을수록 느리고 비쌈 |
| `-o 폴더` | 저장 폴더 (기본 `./번역`) |
| `--save-original` | 일본어 원문도 `원문/` 폴더에 저장 |
| `--force` | 이미 번역한 화도 다시 번역 |
| `--no-merge` | 범위 전체를 합친 파일을 만들지 않음 |
| `--delay 초` | syosetu 페이지 요청 간격 (기본 1.5초) |

## 저장되는 것

```
번역/
  無職転生 … [n9669bk]/
    001화.txt ~ 010화.txt        화별 번역본
    무직 전생 1-10화.txt          범위 전체를 합친 파일
    용어집.txt                    인명·지명 번역 (Claude 엔진)
    정보.json                     원제, 작가, 한국어 제목
```

- 이미 번역한 화는 건너뛰므로, 중간에 끊기거나 실패한 화가 있으면 같은 명령을 다시 실행하면 됩니다.
- **용어집**: Claude가 화마다 새로 나온 고유명사를 적어 두고 다음 화부터 같은 번역을 씁니다. `용어집.txt`를 직접 고치면 (예: `ルーデウス => 루데우스`) 이후 번역에 반영됩니다.
- 한국어 제목이 마음에 안 들면 `정보.json`의 `title_ko`를 고치면 됩니다.

## 비용 (Claude)

한 화(일본어 5천 자 정도)에 대략 입력 5천 토큰, 출력 6~8천 토큰(생각 포함)이 들어, Opus 5.5 기준 한 화에 0.1~0.2달러 정도입니다. 더 싸게 하려면 `--model claude-sonnet-5-5`(약 절반)나 `--effort low`를 쓰세요.

Claude가 내용 때문에 번역을 거절하면 서버가 자동으로 다른 모델로 이어서 번역합니다(`fallbacks: "default"`). 그래도 거절되면 그 화는 실패로 표시됩니다.

## 주의

개인적으로 읽기 위한 용도로만 쓰세요. 번역본을 인터넷에 올리거나 배포하는 것은 원작자의 저작권을 침해합니다.
