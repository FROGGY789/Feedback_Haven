# 💬 Feedback Haven

선생님들이 작성한 **평가계획·학습자료(PDF)** 를 웹에서 함께 읽고,
궁금하거나 인상 깊은 지점을 클릭해 **피드백(❓/❗)** 을 남기고 공유하는 사이트입니다.

- 📄 PDF를 브라우저에서 바로 읽기
- 🖱️ 원하는 지점을 **클릭 → `?`(궁금한 점) / `!`(인상깊은 점)** 남기기
- 💬 각 피드백에 **댓글**로 대화하기
- 🙋 입장 시 **이름을 골라** 들어가고, 남기는 피드백·댓글에 그 이름이 표시됨
- 👀 다른 선생님이 남긴 피드백도 실시간으로 함께 보기
- 🔒 입장 암호로 접근 제한
- 👋 첫 화면에 사용 방법 튜토리얼

정적 사이트라서 **GitHub Pages** 로 무료 배포되며, 피드백은 **Supabase(무료)** 에 공유 저장됩니다.

---

## 🚀 설정 순서 (약 10분)

### 1. Supabase 프로젝트 만들기 (피드백 공유 저장소)

1. [supabase.com](https://supabase.com) 에서 무료 가입 후 **New project** 생성
2. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** 열기
3. 이 저장소의 [`supabase/schema.sql`](supabase/schema.sql) 내용을 복사해 붙여넣고 **Run**
4. 왼쪽 메뉴 **Settings → API** 에서 아래 두 값을 복사해 둡니다
   - **Project URL**
   - **anon public** 키 (공개되어도 되는 키입니다)

> Supabase를 설정하지 않아도 사이트는 동작합니다. 다만 그 경우 피드백은
> **접속한 사람 각자의 브라우저에만** 저장되고 서로 공유되지 않습니다.

### 2. `assets/js/config.js` 채우기

```js
window.APP_CONFIG = {
  SITE_TITLE: "우리 학교 피드백",          // 원하는 제목
  SITE_SUBTITLE: "평가계획 · 학습자료",

  PASSWORD_PLAIN: "우리반암호",            // 입장 암호 (아래 '암호' 참고)
  PASSWORD_HASH: "",

  SUPABASE_URL: "https://xxxx.supabase.co",   // 1번에서 복사한 값
  SUPABASE_ANON_KEY: "eyJhbGciOi...",         // 1번에서 복사한 값

  NAMES: ["이솔다은T", "Jun", "Claire"],       // 입장 시 고를 이름 목록

  // 화면 문구 (자유롭게 수정)
  KICKER: "2026 천안 영어교사 멘토링 PET",     // 입장 화면 상단 라벨
  GATE_HELP: "암호는 ○○○에게 문의하세요.",     // 입장 화면 하단 안내
  GUIDE: ["...", "..."],                       // 허브 '이용 방법' 단계들
  DEADLINE_NOTE: "피드백은 9/4까지 부탁드립니다.", // 문서 화면 하단 안내

  PDFS: [
    { id: "math-plan-1", title: "1학기 수학 평가계획", category: "평가계획",
      file: "math-plan-1.pdf", teacher: "김선생" },
    // ... 문서를 계속 추가
  ]
};
```

### 3. PDF 넣기

- PDF 파일을 [`pdfs/`](pdfs/) 폴더에 넣습니다.
- `config.js` 의 `PDFS` 목록에서 `file` 값을 그 파일 이름과 똑같이 맞춥니다.
- 허브(문서 목록)는 **`teacher` 값 기준으로 자동 그룹**됩니다. 같은 선생님 문서끼리 한 카드에 묶여요.
- 선택 항목: `grade`(선생님 카드의 학년/과목 뱃지), `meta`(문서 버튼의 부가 설명, 예: "PDF · 12쪽").
- `category` 는 `"평가계획"`(주황) / `"학습자료"`(초록) 로 색이 구분됩니다.
- ⚠️ `id` 는 문서마다 **고유**해야 하며, 한 번 정하면 바꾸지 마세요.
  (피드백이 이 `id` 로 연결되므로, 바꾸면 기존 피드백과 어긋납니다.)

### 4. GitHub Pages 로 배포

1. 이 저장소를 GitHub 에 push
2. 저장소 **Settings → Pages**
3. **Source** 를 `Deploy from a branch` 로 두고, 브랜치를 선택(예: `main` / 폴더 `/root`) 후 저장
4. 잠시 뒤 안내되는 주소(예: `https://<사용자>.github.io/Feedback_Haven/`)로 접속

---

## 🔒 암호에 대하여

- 가장 간단하게: `PASSWORD_PLAIN` 에 암호를 그대로 적으면 됩니다.
- **저장소가 공개(public)** 라면 누구나 소스에서 암호를 볼 수 있으니,
  [`tools/password.html`](tools/password.html) 을 브라우저로 열어 **SHA-256 해시**를 만든 뒤
  `PASSWORD_HASH` 에 넣고 `PASSWORD_PLAIN` 은 비워두세요.
- 이 암호는 편의를 위한 **간단한 접근 제한**입니다. 브라우저에서 검사하므로
  민감한 자료의 강력한 보안 수단은 아니라는 점을 참고하세요.

---

## 🧭 사용 방법 (접속한 선생님용)

1. 첫 화면에서 **입장 암호** 입력 → **이름 선택** 후 입장
   (목록에 없으면 ‘직접 입력’으로 새 이름 사용 / 오른쪽 위 이름표를 눌러 언제든 변경)
2. 목록에서 문서를 골라 열기
3. PDF에서 표시를 남기고 싶은 **지점을 클릭**
4. **`?` 궁금한 점** 또는 **`!` 인상깊은 점** 을 고르고 내용 입력 후 저장 (선택한 이름으로 등록)
5. PDF 위의 표시나 오른쪽 목록을 눌러 내용 확인
6. 팝업 아래에서 **댓글**로 서로 이야기 나누기 (자기 글·댓글은 삭제 가능)

---

## 📁 폴더 구조

```
index.html              메인 페이지 (잠금 · 튜토리얼 · 리더 화면)
assets/
  css/style.css         스타일
  js/config.js          ← 여기만 수정하면 됩니다
  js/store.js           피드백 저장 (Supabase 또는 브라우저)
  js/pdf-viewer.js      PDF 렌더링 + 클릭 감지
  js/app.js             화면 전환 · 피드백 로직
pdfs/                   PDF 파일을 여기에
supabase/schema.sql     Supabase 테이블 생성 SQL
tools/password.html     암호 해시 생성기
```

---

## ❓ 자주 겪는 문제

- **PDF가 안 열려요** → `pdfs/` 안의 파일 이름과 `config.js` 의 `file` 값이 정확히 같은지 확인하세요(대소문자 포함).
- **피드백이 공유되지 않아요** → `SUPABASE_URL`, `SUPABASE_ANON_KEY` 가 채워졌는지, `schema.sql` 을 실행했는지 확인하세요. 상단 배지가 “공유 저장”인지 확인할 수 있습니다.
- **실시간으로 안 떠요** → `schema.sql` 마지막의 realtime publication 구문이 실행됐는지 확인하세요. 새로고침하면 최신 내용은 항상 보입니다.
