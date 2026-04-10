# @myhpmp/cli

한국어 | [English](./README.md)

Claude Code 사용량을 RPG 게임처럼 보여주는 대시보드.

레벨, HP, MP, EXP, 연속 사용일수를 추적하고 칭호를 획득하세요.

<p align="center">
  <img src="./assets/statusline-preview.svg" alt="상태 바 미리보기" width="100%"/>
</p>

## 빠른 시작

```bash
npm install -g @myhpmp/cli
```

### 1. Hook 설치

```bash
myhpmp setup
```

Claude Code Hook이 설치되어 사용량이 자동으로 추적됩니다. 실시간 상태 바가 Claude Code 하단에 표시됩니다.

### 2. 언어 설정

```bash
myhpmp locale
```

한국어와 영어를 지원합니다. 건너뛰면 시스템 로캘에서 자동 감지합니다.

### 3. Claude Code 재시작

끝! 다음 세션부터 EXP가 자동으로 쌓입니다.

### 4. (선택) 클라우드 동기화

```bash
myhpmp init
```

GitHub 또는 Google OAuth로 여러 기기에서 스탯을 동기화할 수 있습니다.

## 대시보드

`myhpmp usage`로 전체 RPG 대시보드를 확인하세요:

<p align="center">
  <img src="./assets/usage-preview.svg" alt="대시보드 미리보기" width="640"/>
</p>

## 스탯

| 스탯 | 설명 |
|------|------|
| **❤️ HP** | 5시간 사용량 잔여 (%) + 리셋 타이머 |
| **💙 MP** | 7일 주간 한도 잔여 (%) + 리셋 타이머 |
| **🧠 CTX** | 현재 컨텍스트 윈도우 사용률 (%) |
| **🔥 연속** | 연속 사용일수 |
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
| 세션 완료 | 25 EXP |
| 연속 사용 보너스 | 연속일수 × 5 EXP (최대 30일 = 150 EXP) |
| 주간 70%+ 사용 | 100 EXP |

## 명령어

| 명령어 | 설명 |
|--------|------|
| `myhpmp setup` | Hook 자동 설정 (Claude Code) |
| `myhpmp usage` | RPG 대시보드 상세 보기 |
| `myhpmp sync` | 수동으로 클라우드 동기화 |
| `myhpmp statusline` | 상태 바 켜기/끄기 토글 |
| `myhpmp locale` | 표시 언어 변경 (한국어/English) |
| `myhpmp init` | 인증 설정 (크로스 디바이스 동기화) |
| `myhpmp uninstall` | 모든 Hook 제거 및 로컬 데이터 삭제 (선택) |

## 크로스 디바이스 동기화

여러 기기에서 스탯(레벨, EXP, 연속일수)을 동기화:

```bash
myhpmp init
```

**GitHub OAuth**와 **Google OAuth** 인증을 지원합니다.

| 시점 | 동작 |
|------|------|
| 세션 시작 | 클라우드에서 최신 데이터 가져오기 |
| 5분마다 | 사용 중 자동 동기화 |
| 세션 종료 | 최종 스탯 클라우드에 저장 |
| `myhpmp sync` | 수동 즉시 동기화 |

데이터는 `~/.myhpmp/data.json`에 로컬 저장되며 완전한 오프라인 동작을 지원합니다. 로컬 데이터는 항상 보존됩니다.

## 커스터마이징

### 상태 바 순서

`~/.myhpmp/config.json`에서 표시할 세그먼트와 순서를 설정:

```json
{
  "statusLineOrder": ["title", "hp", "mp", "ctx", "streak", "project"]
}
```

사용 가능: `title`, `hp`, `mp`, `ctx`, `streak`, `project`

### 다국어

```
KO: 🔮 프롬프트 소서러 Lv.21 ★ | ❤️ 80% ⏱️4h34m | 💙 64% ⏱️5일 | 🧠 2% | 🔥5일 | 📂 ~/…/myhpmp-cli (main*)
EN: 🔮 Prompt Sorcerer Lv.21 ★ | ❤️ 80% ⏱️4h34m | 💙 64% ⏱️5d | 🧠 2% | 🔥5d | 📂 ~/…/myhpmp-cli (main*)
```

## 요구 사항

- Node.js >= 18
- Claude Code (Pro/Max 구독)

## 지원 플랫폼

- **Windows** / **macOS** / **Linux**

## 라이선스

MIT
