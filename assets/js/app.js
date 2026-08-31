/* =============================================================
 *  app.js — 화면 전환, 잠금, 튜토리얼, 리더, 피드백(?/!) 로직
 * ============================================================= */
(function () {
  const cfg = window.APP_CONFIG || {};
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  const TYPE = {
    question: { icon: "?", label: "궁금한 점", cls: "q" },
    impression: { icon: "!", label: "인상깊은 점", cls: "i" }
  };

  // ---------- 유틸 ----------
  async function sha256(text) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  function timeAgo(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "방금 전";
    if (s < 3600) return Math.floor(s / 60) + "분 전";
    if (s < 86400) return Math.floor(s / 3600) + "시간 전";
    if (s < 604800) return Math.floor(s / 86400) + "일 전";
    return d.toLocaleDateString("ko-KR");
  }

  // ---------- 화면 요소 ----------
  const lockView = $("#lock-view");
  const homeView = $("#home-view");
  const readerView = $("#reader-view");

  function show(view) {
    [lockView, homeView, readerView].forEach((v) =>
      v.classList.toggle("active", v === view)
    );
    window.scrollTo(0, 0);
  }

  // ---------- 제목 세팅 ----------
  $$(".js-site-title").forEach((el) => (el.textContent = cfg.SITE_TITLE || "Feedback Haven"));
  $$(".js-site-subtitle").forEach((el) => (el.textContent = cfg.SITE_SUBTITLE || ""));
  document.title = cfg.SITE_TITLE || "Feedback Haven";

  // 저장 모드 배지
  const modeBadge = $("#store-mode");
  if (modeBadge) {
    if (Store.mode === "shared") {
      modeBadge.textContent = "공유 저장 · 모두가 함께 봅니다";
      modeBadge.classList.add("ok");
    } else {
      modeBadge.textContent = "이 브라우저에만 저장 (Supabase 미설정)";
      modeBadge.classList.add("warn");
    }
  }

  // =============================================================
  //  1) 잠금(암호) 화면
  // =============================================================
  let currentUser = localStorage.getItem("fh_name") || "";
  const CUSTOM = "__custom__";

  const pwForm = $("#pw-form");
  const pwInput = $("#pw-input");
  const pwError = $("#pw-error");
  const nameForm = $("#name-form");
  const nameSelect = $("#name-select");
  const nameCustom = $("#name-custom");
  const nameError = $("#name-error");

  async function checkPassword(value) {
    if (cfg.PASSWORD_HASH) {
      const h = await sha256(value);
      return h === cfg.PASSWORD_HASH.toLowerCase();
    }
    return value === (cfg.PASSWORD_PLAIN || "");
  }

  function gotoStep(step) {
    $$(".lock-step").forEach((s) => s.classList.remove("active"));
    step.classList.add("active");
  }

  function buildNameOptions() {
    const names = (cfg.NAMES || []).filter(Boolean);
    nameSelect.innerHTML =
      names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("") +
      `<option value="${CUSTOM}">직접 입력…</option>`;
    if (currentUser && names.includes(currentUser)) nameSelect.value = currentUser;
    else if (!names.length) nameSelect.value = CUSTOM;
    toggleCustom();
  }
  function toggleCustom() {
    const custom = nameSelect.value === CUSTOM;
    nameCustom.hidden = !custom;
    if (custom) setTimeout(() => nameCustom.focus(), 50);
  }
  nameSelect.addEventListener("change", toggleCustom);
  function chosenName() {
    return nameSelect.value === CUSTOM ? nameCustom.value.trim() : nameSelect.value;
  }

  function updateUserChip() {
    const chip = $("#user-chip");
    if (!chip || !currentUser) return;
    chip.querySelector(".user-chip__avatar").textContent = currentUser.slice(0, 1);
    chip.querySelector(".user-chip__name").textContent = currentUser + "님";
  }

  function unlockToHome() {
    sessionStorage.setItem("fh_unlocked", "1");
    updateUserChip();
    buildHome();
    show(homeView);
  }

  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    pwError.textContent = "";
    const ok = await checkPassword(pwInput.value);
    if (ok) {
      buildNameOptions();
      gotoStep(nameForm);
    } else {
      pwError.textContent = "암호가 올바르지 않습니다.";
      pwInput.select();
    }
  });

  nameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    nameError.textContent = "";
    const name = chosenName();
    if (!name) {
      nameError.textContent = "이름을 선택하거나 입력하세요.";
      return;
    }
    currentUser = name;
    localStorage.setItem("fh_name", name);
    unlockToHome();
  });

  // 이름 바꾸기 (헤더 칩 클릭)
  $("#user-chip").addEventListener("click", () => {
    buildNameOptions();
    gotoStep(nameForm);
    show(lockView);
  });

  // 이미 이번 세션에서 인증 + 이름이 있으면 통과
  if (sessionStorage.getItem("fh_unlocked") === "1" && currentUser) {
    updateUserChip();
    buildHome();
    show(homeView);
  } else {
    show(lockView);
    gotoStep(pwForm);
    setTimeout(() => pwInput.focus(), 100);
  }

  // =============================================================
  //  2) 홈 / 튜토리얼 화면
  // =============================================================
  function buildHome() {
    const listEl = $("#doc-list");
    const pdfs = cfg.PDFS || [];
    if (!pdfs.length) {
      listEl.innerHTML =
        '<p class="empty">아직 등록된 문서가 없습니다. <code>assets/js/config.js</code> 의 <code>PDFS</code> 목록에 문서를 추가하세요.</p>';
      return;
    }
    // 카테고리별 그룹
    const groups = {};
    pdfs.forEach((p) => {
      const c = p.category || "기타";
      (groups[c] = groups[c] || []).push(p);
    });

    listEl.innerHTML = Object.keys(groups)
      .map((cat) => {
        const cards = groups[cat]
          .map(
            (p) => `
          <button class="doc-card" data-id="${esc(p.id)}">
            <span class="doc-card__icon">📄</span>
            <span class="doc-card__body">
              <span class="doc-card__title">${esc(p.title)}</span>
              ${p.teacher ? `<span class="doc-card__teacher">${esc(p.teacher)} 선생님</span>` : ""}
            </span>
            <span class="doc-card__go">읽고 피드백 →</span>
          </button>`
          )
          .join("");
        return `<section class="doc-group">
            <h3 class="doc-group__title">${esc(cat)}</h3>
            <div class="doc-group__cards">${cards}</div>
          </section>`;
      })
      .join("");

    $$(".doc-card", listEl).forEach((btn) =>
      btn.addEventListener("click", () => openReader(btn.dataset.id))
    );
  }

  // 튜토리얼 접기/펼치기 기억
  const tut = $("#tutorial");
  const tutToggle = $("#tutorial-toggle");
  if (tutToggle) {
    const collapsed = localStorage.getItem("fh_tut_collapsed") === "1";
    tut.classList.toggle("collapsed", collapsed);
    tutToggle.addEventListener("click", () => {
      const c = tut.classList.toggle("collapsed");
      localStorage.setItem("fh_tut_collapsed", c ? "1" : "0");
    });
  }

  // =============================================================
  //  3) 리더 화면 (PDF + 피드백)
  // =============================================================
  const pageWrap = $("#pdf-pages");
  const fbListEl = $("#fb-list");
  const fbCountEl = $("#fb-count");
  const readerTitle = $("#reader-title");
  let current = null; // { doc, viewer, items:[], filter, unsub }

  async function openReader(id) {
    const doc = (cfg.PDFS || []).find((p) => p.id === id);
    if (!doc) return;
    closeReader();
    readerTitle.textContent = doc.title;
    show(readerView);
    pageWrap.innerHTML = '<div class="loading">문서를 불러오는 중…</div>';
    fbListEl.innerHTML = "";

    current = {
      doc, viewer: null, items: [], comments: [],
      filter: "all", unsub: null, openId: null
    };

    try {
      const viewer = await PDFViewer.render("pdfs/" + doc.file, pageWrap, {
        onPageClick: openComposer
      });
      current.viewer = viewer;
    } catch (err) {
      pageWrap.innerHTML =
        '<div class="loading error">PDF를 불러오지 못했습니다.<br><small>' +
        esc("pdfs/" + doc.file) +
        " 파일이 있는지 확인하세요.</small></div>";
      console.error(err);
      return;
    }

    await refreshFeedback();

    // 실시간 구독 (공유 모드일 때만 실제 동작)
    current.unsub = Store.subscribe(doc.id, () => refreshFeedback());
  }

  function closeReader() {
    if (current && current.unsub) current.unsub();
    closeComposer();
    closeMarkerPopup();
    current = null;
  }

  async function refreshFeedback() {
    if (!current) return;
    const docId = current.doc.id;
    const [items, comments] = await Promise.all([
      Store.list(docId),
      Store.listComments(docId)
    ]);
    if (!current || current.doc.id !== docId) return; // 그 사이 문서가 바뀐 경우
    current.items = items;
    current.comments = comments;
    renderMarkers();
    renderFbList();
    updateCount();
    updateOpenPopup();
  }

  function commentsFor(fid) {
    return current ? current.comments.filter((c) => c.feedback_id === fid) : [];
  }

  function visibleItems() {
    if (!current) return [];
    if (current.filter === "all") return current.items;
    return current.items.filter((f) => f.type === current.filter);
  }

  function updateCount() {
    const q = current.items.filter((f) => f.type === "question").length;
    const i = current.items.filter((f) => f.type === "impression").length;
    fbCountEl.innerHTML =
      `<span class="chip q">? ${q}</span><span class="chip i">! ${i}</span>`;
  }

  // ---- 마커 렌더링 ----
  function renderMarkers() {
    if (!current || !current.viewer) return;
    // 기존 마커 제거
    $$(".marker", pageWrap).forEach((m) => m.remove());
    visibleItems().forEach((f) => {
      const layer = current.viewer.getLayer(f.page);
      if (!layer) return;
      const t = TYPE[f.type] || TYPE.question;
      const m = document.createElement("button");
      m.className = "marker " + t.cls;
      m.dataset.id = f.id;
      m.style.left = f.x * 100 + "%";
      m.style.top = f.y * 100 + "%";
      m.textContent = t.icon;
      m.title = (f.author ? f.author + ": " : "") + f.comment;
      const cc = commentsFor(f.id).length;
      if (cc > 0) {
        const b = document.createElement("span");
        b.className = "marker__count";
        b.textContent = cc;
        m.appendChild(b);
      }
      m.addEventListener("click", (e) => {
        e.stopPropagation();
        openMarkerPopup(f, m);
      });
      layer.appendChild(m);
    });
  }

  // ---- 피드백 목록(우측 패널) ----
  function renderFbList() {
    const items = visibleItems();
    if (!items.length) {
      fbListEl.innerHTML =
        '<p class="empty">아직 피드백이 없습니다.<br>PDF의 원하는 지점을 클릭해 남겨보세요.</p>';
      return;
    }
    fbListEl.innerHTML = items
      .map((f) => {
        const t = TYPE[f.type] || TYPE.question;
        const cc = commentsFor(f.id).length;
        return `<article class="fb-item ${t.cls}" data-id="${esc(f.id)}">
          <div class="fb-item__head">
            <span class="fb-badge ${t.cls}">${t.icon}</span>
            <span class="fb-item__meta">
              <b>${esc(f.author || "익명")}</b>
              <span class="fb-item__page">p.${f.page}</span>
              <span class="fb-item__time">${timeAgo(f.created_at)}</span>
            </span>
            ${f.mine ? `<button class="fb-del" data-del="${esc(f.id)}" title="삭제">✕</button>` : ""}
          </div>
          <p class="fb-item__text">${esc(f.comment) || "<i>내용 없음</i>"}</p>
          <div class="fb-item__foot">💬 댓글 ${cc}${cc ? "" : " · 눌러서 남기기"}</div>
        </article>`;
      })
      .join("");

    $$(".fb-item", fbListEl).forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".fb-del")) return;
        const f = current.items.find((x) => x.id === el.dataset.id);
        if (f && current.viewer) {
          current.viewer.scrollToPage(f.page);
          const m = $(`.marker[data-id="${CSS.escape(f.id)}"]`, pageWrap);
          if (m) {
            m.classList.add("pulse");
            setTimeout(() => m.classList.remove("pulse"), 1500);
          }
          openMarkerPopup(f, m || el);
        }
      });
    });
    $$(".fb-del", fbListEl).forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("이 피드백을 삭제할까요?")) return;
        await Store.remove(btn.dataset.del);
        await refreshFeedback();
      })
    );
  }

  // ---- 필터 버튼 ----
  $$(".fb-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".fb-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (current) current.filter = btn.dataset.filter;
      renderMarkers();
      renderFbList();
    })
  );

  // 뒤로가기
  $("#reader-back").addEventListener("click", () => {
    closeReader();
    buildHome();
    show(homeView);
  });

  // =============================================================
  //  4) 피드백 작성 팝업 (클릭 지점에 ? / ! 남기기)
  // =============================================================
  const composer = $("#composer");
  let composerCtx = null;

  function openComposer(ctx) {
    closeMarkerPopup();
    composerCtx = ctx;
    composer.querySelector("#composer-comment").value = "";
    composer.querySelector("#composer-as").textContent = currentUser || "익명";
    composer.querySelector("#composer-hint").textContent = "";
    // 타입 초기화
    $$(".composer-type", composer).forEach((b) => b.classList.remove("active"));
    composer.dataset.type = "";
    positionFixed(composer, ctx.clientX, ctx.clientY);
    composer.classList.add("show");
    composer.querySelector("#composer-comment").focus();
  }
  function closeComposer() {
    composer.classList.remove("show");
    composerCtx = null;
  }

  $$(".composer-type", composer).forEach((b) =>
    b.addEventListener("click", () => {
      $$(".composer-type", composer).forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      composer.dataset.type = b.dataset.type;
      composer.querySelector("#composer-hint").textContent = "";
    })
  );

  $("#composer-cancel").addEventListener("click", closeComposer);

  $("#composer-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!composerCtx) return;
    const type = composer.dataset.type;
    if (!type) {
      composer.querySelector("#composer-hint").textContent =
        "먼저 ? 또는 ! 를 선택하세요.";
      return;
    }
    const comment = composer.querySelector("#composer-comment").value.trim();
    const payload = {
      pdf_id: current.doc.id,
      page: composerCtx.page,
      x: composerCtx.x,
      y: composerCtx.y,
      type,
      comment,
      author: currentUser
    };
    closeComposer();
    try {
      await Store.add(payload);
      await refreshFeedback();
    } catch (err) {
      alert("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
      console.error(err);
    }
  });

  // =============================================================
  //  5) 마커 클릭 시 내용 + 댓글 팝업
  // =============================================================
  const mpop = $("#marker-popup");

  function renderCommentsHTML(comments) {
    if (!comments.length)
      return '<p class="thread__empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>';
    return comments
      .map(
        (c) => `<div class="cmt">
          <div class="cmt__meta">
            <b>${esc(c.author || "익명")}</b>
            <span class="cmt__time">${timeAgo(c.created_at)}</span>
            ${c.mine ? `<button class="cmt__del" data-del-cmt="${esc(c.id)}" title="삭제">✕</button>` : ""}
          </div>
          <p class="cmt__text">${esc(c.comment)}</p>
        </div>`
      )
      .join("");
  }

  function openMarkerPopup(f, anchorEl) {
    closeComposer();
    current.openId = f.id;
    const t = TYPE[f.type] || TYPE.question;
    const comments = commentsFor(f.id);
    mpop.className = "popup marker-popup " + t.cls;
    mpop.innerHTML = `
      <div class="popup__head">
        <span class="fb-badge ${t.cls}">${t.icon}</span>
        <span class="popup__title">${t.label}</span>
        <button class="popup__close" aria-label="닫기">✕</button>
      </div>
      <p class="popup__text">${esc(f.comment) || "<i>내용 없음</i>"}</p>
      <div class="popup__meta">
        <b>${esc(f.author || "익명")}</b> · ${timeAgo(f.created_at)} · p.${f.page}
        ${f.mine ? '<button class="popup__del">삭제</button>' : ""}
      </div>
      <div class="thread">
        <div class="thread__title">💬 댓글 <span class="thread__count">${comments.length}</span></div>
        <div class="thread__list">${renderCommentsHTML(comments)}</div>
        <form class="thread__form">
          <input class="thread__input" type="text" maxlength="500"
                 placeholder="${esc(currentUser || "익명")}(으)로 댓글 달기…" />
          <button type="submit" class="btn btn--primary thread__send">등록</button>
        </form>
      </div>
    `;
    positionFixed(mpop, anchorEl);
    mpop.classList.add("show");
    bindPopupHandlers(f);
    const inp = mpop.querySelector(".thread__input");
    if (inp) inp.focus();
  }

  function bindPopupHandlers(f) {
    mpop.querySelector(".popup__close").addEventListener("click", closeMarkerPopup);
    const del = mpop.querySelector(".popup__del");
    if (del)
      del.addEventListener("click", async () => {
        if (!confirm("이 피드백과 댓글을 삭제할까요?")) return;
        await Store.remove(f.id);
        closeMarkerPopup();
        await refreshFeedback();
      });
    bindCommentDeletes();
    mpop.querySelector(".thread__form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = mpop.querySelector(".thread__input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      try {
        await Store.addComment({
          feedback_id: f.id,
          pdf_id: current.doc.id,
          comment: text,
          author: currentUser
        });
        await refreshFeedback();
        const again = mpop.querySelector(".thread__input");
        if (again) again.focus();
      } catch (err) {
        alert("댓글 저장에 실패했습니다.");
        console.error(err);
        input.value = text;
      }
    });
  }

  function bindCommentDeletes() {
    $$(".cmt__del", mpop).forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("이 댓글을 삭제할까요?")) return;
        await Store.removeComment(btn.dataset.delCmt);
        await refreshFeedback();
      })
    );
  }

  // 실시간/새로고침 시 열려있는 팝업의 댓글만 갱신 (입력 중인 내용은 보존)
  function updateOpenPopup() {
    if (!current || !current.openId || !mpop.classList.contains("show")) return;
    const f = current.items.find((x) => x.id === current.openId);
    if (!f) {
      closeMarkerPopup();
      return;
    }
    const comments = commentsFor(f.id);
    const listEl = mpop.querySelector(".thread__list");
    const countEl = mpop.querySelector(".thread__count");
    if (countEl) countEl.textContent = comments.length;
    if (listEl) {
      listEl.innerHTML = renderCommentsHTML(comments);
      bindCommentDeletes();
    }
  }

  function closeMarkerPopup() {
    mpop.classList.remove("show");
    if (current) current.openId = null;
  }

  // ---- 팝업을 화면 좌표에 배치 (요소 또는 좌표 기준, 화면 밖으로 나가지 않게) ----
  function positionFixed(popup, anchorOrX, maybeY) {
    if (popup.parentElement !== document.body) document.body.appendChild(popup);
    popup.style.position = "fixed";
    // 크기 측정을 위해 잠시 보이되 눈에는 안 띄게
    popup.style.visibility = "hidden";
    popup.classList.add("show");
    const pw = popup.offsetWidth;
    const ph = popup.offsetHeight;
    popup.classList.remove("show");
    popup.style.visibility = "";

    let ax, ay;
    if (typeof anchorOrX === "number") {
      ax = anchorOrX;
      ay = maybeY;
    } else if (anchorOrX && anchorOrX.getBoundingClientRect) {
      const r = anchorOrX.getBoundingClientRect();
      ax = r.left + r.width / 2;
      ay = r.top + r.height / 2;
    } else {
      ax = window.innerWidth / 2;
      ay = window.innerHeight / 2;
    }
    const gap = 14;
    let left = ax + gap;
    if (left + pw > window.innerWidth - 8) left = ax - gap - pw;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = ay - ph / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));
    popup.style.left = left + "px";
    popup.style.top = top + "px";
  }

  // PDF 스크롤 시 팝업 닫기 (좌표가 어긋나지 않도록)
  pageWrap.addEventListener("scroll", () => {
    closeComposer();
    closeMarkerPopup();
  });

  // 바깥 클릭 시 팝업 닫기
  document.addEventListener("mousedown", (e) => {
    if (e.target.closest(".marker")) return; // 마커 클릭은 팝업 열기
    if (composer.classList.contains("show") && !composer.contains(e.target)) {
      closeComposer();
    }
    if (mpop.classList.contains("show") && !mpop.contains(e.target)) {
      closeMarkerPopup();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeComposer();
      closeMarkerPopup();
    }
  });
})();
