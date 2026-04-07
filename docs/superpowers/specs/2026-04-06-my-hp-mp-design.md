# My HP/MP - Gamified Usage Dashboard

## Overview

Claude Code의 사용량 데이터를 RPG 게임 스타일로 시각화하는 도구.
`/usage` slash command로 상세보기, Claude Code status line으로 상시 한줄 표시.
Supabase를 통해 여러 로컬 디바이스 간 데이터 동기화.

## 핵심 기능

1. **레벨 & 칭호 시스템** — EXP 기반 성장
2. **HP** — 현재 세션 토큰 사용량 + 리셋 시간
3. **MP** — 주간 한도 잔여량
4. **Context** — 현재 세션 context window 사용률
5. **Streak** — 연속 사용일수
6. **다국어** — 한국어 / 영어

---

## 1. 레벨 & 칭호 시스템

### 티어 테이블

| 레벨 | 칭호 | 레벨당 필요 EXP | 누적 EXP |
|------|------|-----------------|----------|
| 1-5 | 🌱 초보 모험가 / Novice Adventurer | 100 | 500 |
| 6-10 | ⚔️ 견습 전사 / Apprentice Warrior | 300 | 2,000 |
| 11-15 | 🛡️ 숙련 기사 / Skilled Knight | 600 | 5,000 |
| 16-20 | 🧙 마법사 / Mage | 1,200 | 11,000 |
| 21-30 | 🔮 대마법사 / Archmage | 2,500 | 36,000 |
| 31-40 | 👑 아크메이지 / Grand Archmage | 5,000 | 86,000 |
| 41-50 | 🐉 전설의 코드드래곤 / Legendary Code Dragon | 8,000 | 166,000 |
| 50+ | ⚡ 초월자 / Transcendent | 12,000 | ∞ |

### 별 등급

같은 티어 내 레벨 진행도를 ★로 표시.
5레벨 구간 티어: ★ ~ ★★★★★, 10레벨 구간 티어: 2레벨당 ★ 1개.

예: Lv.13 (🧙 마법사 티어 3번째 레벨) → 🧙 마법사 ★★★

### EXP 획득 방식

| 행동 | EXP | 비고 |
|------|-----|------|
| 토큰 사용 | 1K 토큰당 1 EXP | Claude 실제 사용량 기반 |
| 세션 완료 | 25 EXP | session-end hook |
| 연속 사용 보너스 | streak일수 × 5 EXP | session-start hook에서 지급 |
| 주간 MP 70%+ 달성 | 100 EXP | 주 1회 체크 |

---

## 2. 스탯 정의

### HP (현재 세션)

- **데이터 소스:** Claude Code `/usage`의 세션 토큰 사용량 + 리셋 시간
- **계산:** `(남은 토큰 / 세션 한도) × 100%`
- **시간:** 리셋까지 남은 시간 표시 (⏱️3h30m)
- **경고:** 20% 이하 시 빨간색

### MP (주간 한도)

- **데이터 소스:** Claude Code `/usage`의 주간 사용량/한도
- **계산:** `(남은 주간 토큰 / 주간 한도) × 100%`
- **리셋:** 주간 리셋 시 자동 100% 복구

### Context (컨텍스트 사용률)

- **데이터 소스:** 현재 세션의 context window 사용량
- **계산:** `(사용 중인 context / 최대 context) × 100%`
- **아이콘:** 🧠

### Streak (연속 사용일수)

- **조건:** 하루 최소 1세션 완료 시 유지
- **기준:** 자정 (로컬 타임존)
- **동기화:** Supabase에 마지막 활동일 저장

---

## 3. 표시 형태

### 상시 표시 (Status Line)

```
⚔️ 견습 전사 Lv.9 ★★★ | ❤️ 89% ⏱️3h30m | 💙 80% | 🧠 6% | 🔥2일
```

영어:
```
⚔️ Apprentice Warrior Lv.9 ★★★ | ❤️ 89% ⏱️3h30m | 💙 80% | 🧠 6% | 🔥2d
```

### 상세보기 (/usage slash command)

```
🎮 ⚔️ 견습 전사 Lv.9 ★★★                    🔥 Streak: 2일
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❤️ HP  ████████░░  89%  (82,341 / 92,500 tokens)  ⏱️ 3h30m
💙 MP  ████████░░  80%  (1.6M / 2.0M tokens)
🧠 CTX █░░░░░░░░░   6%  (60K / 1M context)
⭐ EXP ██████░░░░  62%  (186 / 300 → Lv.10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 총 누적 EXP: 2,886  |  총 세션: 47회
```

---

## 4. 아키텍처

### 디렉토리 구조

```
my-hp-mp/
├── src/
│   ├── core/
│   │   ├── exp-calculator.ts      # EXP 계산 로직
│   │   ├── level-system.ts        # 레벨/칭호/별 등급 판정
│   │   └── stats-aggregator.ts    # HP/MP/CTX/Streak 집계
│   ├── data/
│   │   ├── local-store.ts         # 로컬 JSON 캐시
│   │   ├── sync-engine.ts         # 동기화 엔진 (로컬 ↔ 원격)
│   │   └── providers/
│   │       ├── db-interface.ts    # DB 추상 인터페이스
│   │       └── supabase.ts        # Supabase 구현체
│   ├── hooks/
│   │   ├── post-tool-use.ts       # 툴 사용 후 토큰 추적
│   │   ├── session-start.ts       # 세션 시작 (streak 체크, 보너스)
│   │   └── session-end.ts         # 세션 종료 (세션 EXP)
│   ├── display/
│   │   ├── status-line.ts         # 상시 한줄 표시
│   │   └── detail-view.ts         # /usage 상세보기 렌더링
│   ├── i18n/
│   │   ├── index.ts               # locale 감지 + t() 함수
│   │   ├── ko.ts                  # 한국어
│   │   └── en.ts                  # 영어
│   └── commands/
│       └── usage.ts               # /usage slash command 진입점
├── package.json
├── tsconfig.json
└── .env.example                   # SUPABASE_URL, SUPABASE_ANON_KEY
```

### 데이터 흐름

```
Hook 이벤트 → stats-aggregator → exp-calculator → level-system
                    ↓                                    ↓
              local-store ←→ sync-engine ←→ supabase    display
```

### DB 추상화

`db-interface.ts`에 공통 인터페이스 정의:

```ts
interface DbProvider {
  loadUserStats(userId: string): Promise<UserStats>
  saveUserStats(userId: string, stats: UserStats): Promise<void>
  syncStreak(userId: string, lastActiveDate: string): Promise<void>
}
```

Supabase는 하나의 구현체. 향후 Firebase, Planetscale 등으로 교체 시 같은 인터페이스만 구현.

### 로컬 캐시 전략

- 모든 데이터는 먼저 로컬 JSON에 기록 (`~/.my-hp-mp/data.json`)
- 네트워크 가능 시 Supabase와 동기화
- 오프라인에서도 EXP 추적, 레벨업 정상 동작
- 동기화 충돌 시: 타임스탬프 기반 last-write-wins

---

## 5. 다국어 (i18n)

### locale 감지 우선순위

1. 설정 파일 (`~/.my-hp-mp/config.json`)의 `locale` 값
2. 환경변수 `LANG` / `LC_ALL`
3. 기본값: `en`

### 번역 범위

- 칭호명 (8개 티어)
- 상세보기 UI 라벨 (HP, MP, CTX, EXP, Streak 등)
- 시간 단위 (일/d, 시간/h, 분/m)
- EXP 획득 사유 메시지

---

## 6. 인증 (Auth)

### 지원 방식

1. **GitHub OAuth** — 브라우저 기반 인증, 개발자 친화적
2. **Email Magic Link** — 이메일 입력 → 링크 클릭 → 인증 완료

Supabase Auth를 사용하여 두 방식 모두 네이티브 지원.

### 초기 셋업 플로우

```
$ my-hp-mp init

🎮 My HP/MP 초기 설정
━━━━━━━━━━━━━━━━━━━━━━━━
로그인 방식을 선택하세요:

  1) GitHub로 로그인
  2) Email로 로그인

> 1

🌐 브라우저에서 GitHub 인증 페이지를 엽니다...
✅ 인증 완료! (jinee@github)
📁 설정 저장: ~/.my-hp-mp/config.json
```

### 토큰 관리

- 인증 토큰은 `~/.my-hp-mp/config.json`에 저장
- Supabase SDK의 자동 토큰 리프레시 활용
- 웹 대시보드 추가 시 같은 Supabase Auth를 공유하므로 계정 자동 연동

### 디렉토리 구조 추가

```
src/
├── auth/
│   ├── auth-manager.ts    # 인증 상태 관리, 토큰 리프레시
│   ├── github-oauth.ts    # GitHub OAuth 플로우
│   └── email-auth.ts      # Email Magic Link 플로우
```

---

## 7. 기술 스택

- **런타임:** Node.js + TypeScript
- **DB:** Supabase (추상화 인터페이스로 교체 가능)
- **로컬 저장:** JSON 파일 (`~/.my-hp-mp/`)
- **Claude Code 연동:** Hook 시스템 + Status Line + Slash Command

---

## 7. Supabase 테이블 스키마

```sql
-- 사용자 스탯
CREATE TABLE user_stats (
  user_id TEXT PRIMARY KEY,
  total_exp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_sessions INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_date TEXT,
  weekly_exp_bonus_claimed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXP 히스토리 (선택적, 디버깅/분석용)
CREATE TABLE exp_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES user_stats(user_id),
  amount INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
