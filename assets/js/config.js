/* =============================================================
 *  Feedback Haven — 설정 파일
 *  이 파일만 수정하면 사이트를 사용할 수 있습니다.
 *  (자세한 설명은 저장소의 README.md 참고)
 * ============================================================= */

window.APP_CONFIG = {
  /* -----------------------------------------------------------
   * 1) 사이트 제목
   * --------------------------------------------------------- */
  SITE_TITLE: "Feedback Haven",
  SITE_SUBTITLE: "평가계획과 학습자료를 읽고 서로 피드백을 주고받는 사랑방입니다.",

  // 입장 화면 상단의 작은 라벨 / 안내 문구
  KICKER: "2026 천안 영어교사 멘토링 PET",
  GATE_HELP: "PET 멤버만 이용 가능한 공간입니다. 암호는 천안신당고등학교 최유림T에게 문의하세요.",

  // 허브(문서 목록) 오른쪽 '이용 방법' 안내 단계
  GUIDE: [
    "? 는 궁금한 점, ! 는 인상 깊은 점이에요. 문서의 해당 위치를 클릭해서 남겨주세요.",
    "다른 선생님 피드백에 대한 반응은 그 피드백의 댓글로 남겨주세요.",
    "피드백은 마감 전까지 자유롭게 남겨주세요.",
    "수정 후 파일을 다시 톡방에 올려주세요.",
    "항상 고생이 많으십니다. 우리 멘티 샘들 최고!"
  ],

  // 문서 화면 하단 안내 (마감 등)
  DEADLINE_NOTE: "피드백은 9/4 (금) 자정까지 부탁드립니다.",

  /* -----------------------------------------------------------
   * 2) 입장 암호
   *   - 간단하게 쓰려면 PASSWORD_PLAIN 에 암호를 그대로 적으세요.
   *   - 저장소가 '공개(public)'라면 암호가 노출되니
   *     PASSWORD_HASH(SHA-256) 방식을 권장합니다.
   *     해시는 tools/password.html 을 브라우저로 열어 만들 수 있어요.
   *   - PASSWORD_HASH 가 채워져 있으면 그것을 우선 사용합니다.
   * --------------------------------------------------------- */
  PASSWORD_PLAIN: "PET",
  PASSWORD_HASH: "", // 예: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"

  /* -----------------------------------------------------------
   * 3) Supabase 연결 정보 (피드백 공유 저장소)
   *   Supabase 프로젝트 → Settings → API 에서 복사
   *   - URL:  Project URL
   *   - KEY:  anon public key  (공개되어도 되는 키입니다)
   *   비워두면 "이 브라우저에만 저장" 모드로 동작합니다.
   * --------------------------------------------------------- */
  SUPABASE_URL: "https://jnmsuwgjdnylsdomaaad.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubXN1d2dqZG55bHNkb21hYWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNTEyNjAsImV4cCI6MjEwMzcyNzI2MH0.2JN_mTyJ9MsnGtfzFGh8_agjUg6VCLsOSqvl9_YvylM",

  /* -----------------------------------------------------------
   * 4) 이름 목록 (입장 시 카드에서 선택)
   *   nick = 화면에 뜨는 닉네임(피드백·댓글 작성자로 표시),
   *   name = 선생님 실명(닉네임 아래에 "○○○ 선생님" 으로 표시)
   *   목록에 없으면 '직접 입력'으로 닉네임·성함을 넣어 추가할 수 있어요.
   * --------------------------------------------------------- */
  NAMES: [
    { nick: "Sol",    name: "이솔다은" },
    { nick: "Jun",    name: "이준형" },
    { nick: "Claire", name: "최유림" }
  ],

  /* -----------------------------------------------------------
   * 5) 문서 목록
   *   pdfs/ 폴더에 PDF 파일을 넣고 아래에 등록하세요.
   *   - id:        고유값(영문/숫자, 한 번 정하면 바꾸지 마세요. 피드백이 이 값으로 연결됩니다)
   *   - title:     화면에 보일 제목
   *   - category:  "평가계획" 또는 "학습자료" (원하는 다른 분류도 가능)
   *   - file:      pdfs/ 폴더 안의 파일 이름
   *   - teacher:   (선택) 작성 선생님 이름
   * --------------------------------------------------------- */
  PDFS: [
    // Sol 선생님
    { id: "isolda-eval",     title: "과정중심 수행평가", category: "평가계획", file: "isolda-eval.pdf",     teacher: "Sol" },
    { id: "isolda-material", title: "학습자료",          category: "학습자료", file: "isolda-material.pdf", teacher: "Sol" },
    // 이준형 선생님
    { id: "jun-eval",        title: "과정중심 수행평가", category: "평가계획", file: "jun-eval.pdf",        teacher: "이준형T" },
    { id: "jun-material",    title: "학습자료",          category: "학습자료", file: "jun-material.pdf",    teacher: "이준형T" },
    // 최유림 선생님 (양식)
    { id: "choi-eval",       title: "과정중심 수행평가 양식", category: "평가계획", file: "choi-eval.pdf",     teacher: "최유림T" },
    { id: "choi-material",   title: "학습자료 양식",          category: "학습자료", file: "choi-material.pdf", teacher: "최유림T" }
  ]
};
