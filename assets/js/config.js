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
  SITE_SUBTITLE: "평가계획 · 학습자료 피드백 공간",

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
   * 4) 이름 목록
   *   입장할 때 드롭다운에서 이름을 고릅니다.
   *   여기서 고른 이름으로 피드백(?/!)과 댓글이 작성됩니다.
   *   (목록에 없으면 '직접 입력'을 선택해 새 이름을 넣을 수 있어요)
   * --------------------------------------------------------- */
  NAMES: ["김선생", "이선생", "박선생", "최선생", "정선생"],

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
    // 예시입니다. pdfs/ 폴더에 실제 파일을 넣고 아래를 바꿔주세요.
    {
      id: "sample-plan-01",
      title: "1학기 수학 평가계획 (예시)",
      category: "평가계획",
      file: "sample-plan-01.pdf",
      teacher: "김선생"
    },
    {
      id: "sample-material-01",
      title: "함수 단원 학습자료 (예시)",
      category: "학습자료",
      file: "sample-material-01.pdf",
      teacher: "이선생"
    }
  ]
};
