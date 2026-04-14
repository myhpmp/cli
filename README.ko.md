# @myhpmp/cli

한국어 | [English](./README.md)

AI 코딩 도구 사용량을 RPG 게임처럼 보여주는 대시보드.

레벨, HP, MP, EXP를 추적하며 코딩하세요.

<p align="center">
  <img src="./assets/statusline-preview.svg" alt="상태 바 미리보기" width="100%"/>
</p>

## 지원 도구

| 도구 | 트래킹 | 방식 |
|------|--------|------|
| **Claude Code** | 자동 | PostToolUse hook |
| **Gemini CLI** | 자동 | AfterModel hook |
| **Codex CLI** | 자동 | Stop hook |

## 빠른 시작

```bash
npm install -g @myhpmp/cli
```

### 1. Hook 설치

```bash
myhpmp setup
```

설정할 AI 도구를 선택하세요. Hook이 자동으로 설치되어 토큰 사용량을 추적합니다.

### 2. 언어 설정

```bash
myhpmp locale
```

한국어와 영어를 지원합니다. 건너뛰면 시스템 로캘에서 자동 감지합니다.

### 3. AI 도구 재시작

끝! 다음 세션부터 EXP가 자동으로 쌓입니다.

### 4. (선택) 클라우드 동기화

```bash
myhpmp init
```

GitHub OAuth로 여러 기기에서 스탯을 동기화할 수 있습니다.

## 대시보드

`myhpmp usage`로 RPG 대시보드를 확인하세요:

<p align="center">
  <img src="./assets/usage-preview.svg" alt="대시보드 미리보기" width="640"/>
</p>

`myhpmp dashboard`로 프로바이더별 인터랙티브 TUI 대시보드를 확인하세요:

```
  All       Claude    Gemini    Codex
  ───────────────────────────────────
  Date         Tokens       EXP
  2026-04-14   12,500        12
  2026-04-13    8,300         8
  2026-04-12   24,100        24

  ←→ 탭 이동  ↑↓ 스크롤  q 종료
```

## 스탯

| 스탯 | 설명 |
|------|------|
| **❤️ HP** | 5시간 사용량 잔여 (%) + 리셋 타이머 |
| **💙 MP** | 7일 주간 한도 잔여 (%) + 리셋 타이머 |
| **🧠 CTX** | 현재 컨텍스트 윈도우 사용률 (%) |
| **⭐ EXP** | 다음 레벨까지 경험치 |

## 레벨 티어

| 레벨 | 칭호 | 레벨당 EXP | 누적 EXP |
|------|------|-----------|----------|
| 1-5 | 🌱 프롬프트 뉴비 | 100 | 500 |
| 6-10 | ⚔️ 토큰 익스플로러 | 300 | 2,000 |
| 11-15 | 🛠️ 프롬프트 엔지니어 | 600 | 5,000 |
| 16-20 | 🏗️ 컨텍스트 아키텍트 | 1,200 | 11,000 |
| 21-30 | 🔮 프롬프트 소서러 | 3,500 | 46,000 |
| 31-40 | 👑 모델 마스터 | 8,000 | 126,000 |
| 41-50 | 🐉 컨텍스트 오버로드 | 15,000 | 276,000 |
| 50+ | ⚡ 신서틱 마인드 | 25,000 | ∞ |

초반 레벨은 빠르게 올라갑니다. 후반 티어는 꾸준한 사용이 필요합니다.

## EXP 획득 방식

| 행동 | EXP |
|------|-----|
| 토큰 사용 | 1K 토큰당 1 EXP |

EXP는 프로바이더별로 추적되며, 웹 대시보드 분석을 위해 프로바이더 정보와 함께 저장됩니다.

## 명령어

| 명령어 | 설명 |
|--------|------|
| `myhpmp setup` | Hook 설정 (AI 도구 선택) |
| `myhpmp usage` | RPG 대시보드 상세 보기 |
| `myhpmp dashboard` | 인터랙티브 TUI 대시보드 (프로바이더별 분석) |
| `myhpmp sync` | 수동으로 클라우드 동기화 |
| `myhpmp statusline` | 상태 바 켜기/끄기 토글 (Claude Code 전용) |
| `myhpmp locale` | 표시 언어 변경 (한국어/English) |
| `myhpmp init` | 인증 설정 (크로스 디바이스 동기화) |
| `myhpmp uninstall` | 모든 Hook 제거 및 로컬 데이터 삭제 (선택) |

## 크로스 디바이스 동기화

여러 기기에서 스탯(레벨, EXP)을 동기화:

```bash
myhpmp init
```

**GitHub OAuth** 인증을 지원합니다.

| 시점 | 동작 |
|------|------|
| 세션 시작 | 클라우드에서 최신 데이터 가져오기 |
| 5분마다 | 사용 중 자동 동기화 |
| `myhpmp sync` | 수동 즉시 동기화 |

데이터는 `~/.myhpmp/data.json`에 로컬 저장되며 완전한 오프라인 동작을 지원합니다. 로컬 데이터는 항상 보존됩니다.

## 커스터마이징

### 상태 바 순서

`~/.myhpmp/config.json`에서 표시할 세그먼트와 순서를 설정:

```json
{
  "statusLineOrder": ["title", "hp", "mp", "ctx", "project"]
}
```

사용 가능: `title`, `hp`, `mp`, `ctx`, `project`

### 다국어

```
📂 ~/…/myhpmp-cli (main*)
KO: 🔮 프롬프트 소서러 Lv.21 ★ | ❤️ 80% ⏱️4h34m | 💙 64% ⏱️5일 | 🧠 2%

📂 ~/…/myhpmp-cli (main*)
EN: 🔮 Prompt Sorcerer Lv.21 ★ | ❤️ 80% ⏱️4h34m | 💙 64% ⏱️5d | 🧠 2%
```

## 요구 사항

- Node.js >= 18
- 지원되는 AI 코딩 도구 하나 이상

## 지원 플랫폼

- **Windows** / **macOS** / **Linux**

## 라이선스

MIT
