/* =============================================================
 *  app.js — 입장 · 이름(프로필) · 허브 · 문서(피드백/댓글/범위)
 * ============================================================= */
(function () {
  const cfg = window.APP_CONFIG || {};
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const TYPE = {
    question: { icon: "?", label: "궁금한 점", cls: "q" },
    impression: { icon: "!", label: "인상 깊은 점", cls: "i" }
  };
  const CUSTOM = "__custom__";

  // ---------- 유틸 ----------
  async function sha256(t) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  function timeAgo(iso) {
    if (!iso) return "방금 전";
    const d = new Date(iso), s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "방금 전";
    if (s < 3600) return Math.floor(s / 60) + "분 전";
    if (s < 86400) return Math.floor(s / 3600) + "시간 전";
    if (s < 604800) return Math.floor(s / 86400) + "일 전";
    return d.toLocaleDateString("ko-KR");
  }

  // ---------- 화면 ----------
  const V = { gate: $("#gate-view"), name: $("#name-view"), hub: $("#hub-view"), doc: $("#doc-view") };
  function show(view) {
    Object.values(V).forEach((v) => v.classList.toggle("active", v === view));
    window.scrollTo(0, 0);
  }

  // ---------- 정적 텍스트 ----------
  const T = (k, d) => (cfg[k] != null ? cfg[k] : d);
  $$(".js-site-title").forEach((el) => (el.textContent = T("SITE_TITLE", "Feedback Haven")));
  $$(".js-site-subtitle").forEach((el) => (el.textContent = T("SITE_SUBTITLE", "")));
  $$(".js-kicker").forEach((el) => (el.textContent = T("KICKER", "")));
  $$(".js-gate-help").forEach((el) => (el.textContent = T("GATE_HELP", "")));
  $$(".js-deadline").forEach((el) => (el.textContent = T("DEADLINE_NOTE", "")));
  document.title = T("SITE_TITLE", "Feedback Haven");
  $("#guide-steps").innerHTML = (cfg.GUIDE || [])
    .map((s, i) => `<div class="guide__step"><span class="guide__n">${i + 1}</span><span class="guide__body">${esc(s)}</span></div>`)
    .join("");

  let currentUser = localStorage.getItem("fh_name") || "";   // 닉네임 = 작성자
  let currentReal = localStorage.getItem("fh_real") || "";   // 선생님 실명
  function setWho() { $$(".js-me").forEach((el) => (el.textContent = currentUser + " 님")); }

  // ---------- 프로필 ----------
  function normNames() {
    return (cfg.NAMES || [])
      .map((n) => (typeof n === "string" ? { nick: n, name: "" } : { nick: n.nick || n.name || "", name: n.name || "" }))
      .filter((p) => p.nick);
  }
  function customProfiles() {
    try { return JSON.parse(localStorage.getItem("fh_profiles") || "[]"); } catch { return []; }
  }
  function saveCustomProfile(p) {
    const arr = customProfiles();
    if (!arr.some((x) => x.nick === p.nick)) { arr.push(p); localStorage.setItem("fh_profiles", JSON.stringify(arr)); }
  }
  function allProfiles() {
    const seen = {}, out = [];
    normNames().concat(customProfiles()).forEach((p) => { if (p.nick && !seen[p.nick]) { seen[p.nick] = 1; out.push(p); } });
    return out;
  }

  // =============================================================
  //  1) 입장 (암호)
  // =============================================================
  const pwForm = $("#pw-form"), pwInput = $("#pw-input"), pwError = $("#pw-error"), pwLen = $("#pw-len");

  async function checkPassword(v) {
    if (cfg.PASSWORD_HASH) { const h = await sha256(v); return h === cfg.PASSWORD_HASH.toLowerCase(); }
    return v.trim().toLowerCase() === String(cfg.PASSWORD_PLAIN || "").toLowerCase();
  }
  const refreshLen = () => (pwLen.textContent = pwInput.value.length ? pwInput.value.length + "자" : "");
  pwInput.addEventListener("input", () => { pwError.textContent = ""; refreshLen(); });

  (function keypad() {
    const kb = $("#pw-keyboard");
    ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].forEach((row) => {
      const r = document.createElement("div"); r.className = "keypad__row";
      row.split("").forEach((ch) => {
        const k = document.createElement("button");
        k.type = "button"; k.className = "key"; k.textContent = ch;
        k.addEventListener("click", () => { pwInput.value += ch; pwError.textContent = ""; refreshLen(); pwInput.focus(); });
        r.appendChild(k);
      });
      kb.appendChild(r);
    });
    const r = document.createElement("div"); r.className = "keypad__row";
    const mk = (label, fn) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "key key--wide"; b.textContent = label;
      b.addEventListener("click", () => { fn(); refreshLen(); pwInput.focus(); });
      return b;
    };
    r.appendChild(mk("지우기", () => (pwInput.value = pwInput.value.slice(0, -1))));
    r.appendChild(mk("전체삭제", () => (pwInput.value = "")));
    kb.appendChild(r);
  })();

  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault(); pwError.textContent = "";
    if (await checkPassword(pwInput.value)) { buildNameGrid(); show(V.name); }
    else { pwError.textContent = "암호가 맞지 않아요. 다시 확인해 주세요."; pwInput.value = ""; refreshLen(); pwInput.focus(); }
  });

  // =============================================================
  //  2) 이름 선택 (프로필)
  // =============================================================
  const nameGrid = $("#name-grid"), customBox = $("#name-custom-box"),
    nickInput = $("#name-nick"), realInput = $("#name-real"),
    nameEnter = $("#name-enter"), nameHint = $("#name-hint");
  let picked = null; // {nick,name} 또는 {custom:true}

  function buildNameGrid() {
    const profs = allProfiles();
    nameGrid.innerHTML = profs.map((p) =>
      `<button class="person" data-nick="${esc(p.nick)}">
        <span class="person__name">${esc(p.nick)}</span>
        <span class="person__role">${p.name ? esc(p.name) + " 선생님" : "선생님"}</span>
      </button>`).join("") +
      `<button class="person person--add" data-nick="${CUSTOM}">
        <span class="person__name">+ 직접 입력</span>
        <span class="person__role">닉네임·성함 추가</span>
      </button>`;
    picked = null; customBox.hidden = true; nickInput.value = ""; realInput.value = "";
    updateNameUI();
    $$(".person", nameGrid).forEach((btn) =>
      btn.addEventListener("click", () => {
        const nick = btn.dataset.nick;
        $$(".person", nameGrid).forEach((x) => x.classList.toggle("selected", x === btn));
        if (nick === CUSTOM) { picked = { custom: true }; customBox.hidden = false; setTimeout(() => nickInput.focus(), 40); }
        else { const p = profs.find((x) => x.nick === nick); picked = { nick: p.nick, name: p.name }; customBox.hidden = true; }
        updateNameUI();
      }));
  }
  function chosenProfile() {
    if (!picked) return null;
    if (picked.custom) { const nick = nickInput.value.trim(); return nick ? { nick, name: realInput.value.trim() } : null; }
    return picked;
  }
  function updateNameUI() {
    const p = chosenProfile();
    nameEnter.disabled = !p;
    nameHint.textContent = p ? (p.nick + (p.name ? " · " + p.name : "") + " 님으로 입장합니다.") : "이름을 먼저 선택해 주세요.";
  }
  nickInput.addEventListener("input", updateNameUI);
  realInput.addEventListener("input", updateNameUI);
  [nickInput, realInput].forEach((i) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); nameEnter.click(); } }));

  nameEnter.addEventListener("click", () => {
    const p = chosenProfile();
    if (!p) return;
    if (picked && picked.custom) saveCustomProfile(p);
    currentUser = p.nick; currentReal = p.name || "";
    localStorage.setItem("fh_name", p.nick);
    localStorage.setItem("fh_real", currentReal);
    sessionStorage.setItem("fh_unlocked", "1");
    enterHub();
  });

  function enterHub() { setWho(); buildHub(); show(V.hub); }

  $("#hub-signout").addEventListener("click", () => {
    sessionStorage.removeItem("fh_unlocked");
    closeReader(); pwInput.value = ""; refreshLen(); show(V.gate);
    setTimeout(() => pwInput.focus(), 60);
  });

  if (sessionStorage.getItem("fh_unlocked") === "1" && currentUser) enterHub();
  else { show(V.gate); setTimeout(() => pwInput.focus(), 100); }

  // =============================================================
  //  3) 허브 (선생님별 문서)
  // =============================================================
  function buildHub() {
    const el = $("#teacher-list");
    const pdfs = cfg.PDFS || [];
    if (!pdfs.length) {
      el.innerHTML = '<p class="empty">아직 등록된 문서가 없습니다. <code>assets/js/config.js</code> 의 <code>PDFS</code> 목록에 추가하세요.</p>';
      return;
    }
    const order = [], map = {};
    pdfs.forEach((p) => {
      const t = p.teacher || "기타";
      if (!map[t]) { map[t] = { name: t, grade: p.grade || "", docs: [] }; order.push(t); }
      if (!map[t].grade && p.grade) map[t].grade = p.grade;
      map[t].docs.push(p);
    });
    el.innerHTML = order.map((t) => {
      const g = map[t];
      const docs = g.docs.map((d) => {
        const kind = d.category || "자료";
        const kc = kind === "평가계획" ? "q" : kind === "학습자료" ? "i" : "n";
        return `<button class="docbtn docbtn--${kc}" data-id="${esc(d.id)}">
          <span class="kind kind--${kc}">${esc(kind)}</span>
          <span class="docbtn__title">${esc(d.title)}</span>
          <span class="docbtn__meta">${esc(d.meta || "")}</span>
        </button>`;
      }).join("");
      return `<div class="teacher">
        <div class="teacher__head">
          <span class="teacher__avatar">${esc(g.name.slice(0, 1))}</span>
          <span class="teacher__name">${esc(g.name)}</span>
          ${g.grade ? `<span class="teacher__grade">${esc(g.grade)}</span>` : ""}
        </div>
        <div class="teacher__docs">${docs}</div>
      </div>`;
    }).join("");
    $$(".docbtn", el).forEach((b) => b.addEventListener("click", () => openDoc(b.dataset.id)));
  }

  // =============================================================
  //  4) 문서 (PDF + 피드백 + 댓글 + 범위)
  // =============================================================
  const pageWrap = $("#pdf-pages"), fbListEl = $("#fb-list"), fbCountEl = $("#fb-count"),
    docTitleEl = $("#doc-title"), docOwnerEl = $("#doc-owner"),
    qCountEl = $("#doc-qcount"), iCountEl = $("#doc-icount"),
    pageInfo = $("#pdf-pageinfo"), progBar = $("#pdf-progress-bar");
  let current = null;

  async function openDoc(id) {
    const doc = (cfg.PDFS || []).find((p) => p.id === id);
    if (!doc) return;
    closeReader();
    setWho();
    docTitleEl.textContent = doc.title;
    docOwnerEl.textContent = doc.teacher ? doc.teacher + (doc.grade ? " · " + doc.grade : "") : "";
    show(V.doc);
    pageWrap.innerHTML = '<div class="loading">문서를 불러오는 중…</div>';
    fbListEl.innerHTML = "";
    pageInfo.textContent = "… / …"; progBar.style.width = "0%";
    current = { doc, viewer: null, items: [], comments: [], filter: "all", unsub: null, draft: null, openCommentFor: null, commentText: "" };

    try {
      current.viewer = await PDFViewer.render("pdfs/" + doc.file, pageWrap, { onSelect: openComposer });
    } catch (err) {
      pageWrap.innerHTML = '<div class="loading error">PDF를 불러오지 못했습니다.<br><small>' + esc("pdfs/" + doc.file) + " 파일이 있는지 확인하세요.</small></div>";
      console.error(err); return;
    }
    updateProgress();
    await refresh();
    current.unsub = Store.subscribe(doc.id, () => refresh());
  }

  function closeReader() {
    if (current && current.unsub) current.unsub();
    closeComposer(); current = null;
  }

  async function refresh() {
    if (!current) return;
    const docId = current.doc.id;
    const [items, comments] = await Promise.all([Store.list(docId), Store.listComments(docId)]);
    if (!current || current.doc.id !== docId) return;
    current.items = items; current.comments = comments;
    renderMarks(); renderPanel(); updateCounts();
  }

  const commentsFor = (fid) => (current ? current.comments.filter((c) => c.feedback_id === fid) : []);
  function visibleItems() {
    if (!current) return [];
    const arr = current.filter === "all" ? current.items : current.items.filter((f) => f.type === current.filter);
    return arr.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  function updateCounts() {
    const q = current.items.filter((f) => f.type === "question").length;
    const i = current.items.filter((f) => f.type === "impression").length;
    qCountEl.innerHTML = "<b>?</b> " + q; iCountEl.innerHTML = "<b>!</b> " + i;
  }

  // ---- 표시(점 핀 / 범위 형광펜) ----
  function renderMarks() {
    if (!current || !current.viewer) return;
    $$(".marker, .region", pageWrap).forEach((m) => m.remove());
    visibleItems().forEach((f) => {
      const layer = current.viewer.getLayer(f.page);
      if (!layer) return;
      const t = TYPE[f.type] || TYPE.question;
      let el;
      if (f.w > 0 && f.h > 0) {
        el = document.createElement("button");
        el.className = "region " + t.cls;
        el.style.left = f.x * 100 + "%"; el.style.top = f.y * 100 + "%";
        el.style.width = f.w * 100 + "%"; el.style.height = f.h * 100 + "%";
        el.innerHTML = `<span class="region__badge">${t.icon}</span>`;
      } else {
        el = document.createElement("button");
        el.className = "marker " + t.cls;
        el.style.left = f.x * 100 + "%"; el.style.top = f.y * 100 + "%";
        el.textContent = t.icon;
      }
      el.dataset.id = f.id;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const r = el.getBoundingClientRect();
        openMarkPopup(f, r.left + r.width / 2, r.top + Math.min(r.height, 30) / 2);
        flashCard(f.id);
        hideTip();
      });
      el.addEventListener("mouseenter", () => showTip(f, el));
      el.addEventListener("mouseleave", hideTip);
      layer.appendChild(el);
    });
  }
  function flashMark(fid) {
    const el = $(`.marker[data-id="${CSS.escape(fid)}"], .region[data-id="${CSS.escape(fid)}"]`, pageWrap);
    if (el) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  }
  function flashCard(fid) {
    const card = $(`.fb-card[data-id="${CSS.escape(fid)}"]`, fbListEl);
    if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash"); }
  }

  // ---- 마크 호버 말풍선 ----
  const markTip = $("#mark-tip");
  function showTip(f, el) {
    if (markPop.classList.contains("show")) return;
    const t = TYPE[f.type] || TYPE.question;
    markTip.className = "marktip " + t.cls;
    markTip.innerHTML = `<b>${esc(f.author || "익명")}</b>${esc(f.comment) || "<i>내용 없음</i>"}`;
    markTip.style.visibility = "hidden"; markTip.classList.add("show");
    const tw = markTip.offsetWidth, th = markTip.offsetHeight;
    markTip.style.visibility = "";
    const r = el.getBoundingClientRect();
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10;
    markTip.style.left = left + "px"; markTip.style.top = top + "px";
  }
  function hideTip() { markTip.classList.remove("show"); }

  // ---- 마크 클릭 팝업 (내용 보기 · 수정 · 삭제) ----
  const markPop = $("#mark-pop");
  function markPopHTML(f, editing) {
    const t = TYPE[f.type] || TYPE.question;
    const range = f.w > 0 && f.h > 0 ? '<span class="fb-card__range">범위</span>' : "";
    const body = editing
      ? `<textarea class="markpop__edit">${esc(f.comment)}</textarea>`
      : `<div class="markpop__text">${esc(f.comment) || "<i>내용 없음</i>"}</div>`;
    let actions = "";
    if (f.mine) {
      actions = editing
        ? `<button type="button" class="btn btn--soft btn--sm" data-mp="cancel">취소</button>
           <button type="button" class="btn btn--primary btn--sm" data-mp="save">저장</button>`
        : `<button type="button" class="btn btn--soft btn--sm" data-mp="edit">수정</button>
           <button type="button" class="btn btn--del btn--sm" data-mp="del">삭제</button>`;
    }
    return `<div class="markpop__head">
        <span class="mark mark--${t.cls}">${t.icon}</span>
        <span class="markpop__who">${esc(f.author || "익명")}</span>
        ${range}
        <span class="markpop__when">${timeAgo(f.created_at)}</span>
        <button type="button" class="markpop__close" data-mp="close" aria-label="닫기">✕</button>
      </div>
      ${body}
      ${actions ? `<div class="markpop__actions">${actions}</div>` : ""}`;
  }
  function openMarkPopup(f, ax, ay, editing) {
    const t = TYPE[f.type] || TYPE.question;
    markPop.className = "markpop " + t.cls;
    markPop.innerHTML = markPopHTML(f, !!editing);
    positionFixed(markPop, ax, ay);
    markPop.classList.add("show");
    if (editing) { const ta = markPop.querySelector(".markpop__edit"); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }
    markPop.querySelectorAll("[data-mp]").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const act = btn.dataset.mp;
        if (act === "close") return closeMarkPopup();
        if (act === "edit") return openMarkPopup(f, ax, ay, true);
        if (act === "cancel") return openMarkPopup(f, ax, ay, false);
        if (act === "del") {
          if (!confirm("이 피드백과 댓글을 삭제할까요?")) return;
          await Store.remove(f.id); closeMarkPopup(); await refresh(); return;
        }
        if (act === "save") {
          const txt = (markPop.querySelector(".markpop__edit").value || "").trim();
          if (!txt) return;
          try { await Store.update(f.id, { w: f.w, h: f.h, comment: txt }); closeMarkPopup(); await refresh(); }
          catch (err) { alert("수정에 실패했습니다."); console.error(err); }
        }
      }));
  }
  function closeMarkPopup() { markPop.classList.remove("show"); }

  // ---- 우측 패널 ----
  function renderPanel() {
    const items = visibleItems();
    fbCountEl.textContent = items.length + "개";
    if (!items.length) {
      fbListEl.innerHTML = `<div class="fb-empty"><div class="fb-empty__title">아직 비어 있어요</div><div class="fb-empty__body">문서를 클릭하거나 드래그해 첫 피드백을 남겨주세요.</div></div>`;
      return;
    }
    fbListEl.innerHTML = items.map((f) => {
      const t = TYPE[f.type] || TYPE.question;
      const cs = commentsFor(f.id);
      const rangeTag = f.w > 0 && f.h > 0 ? '<span class="fb-card__range">범위</span>' : "";
      const thread = cs.map((c) => `<div class="cmt">
          <span class="cmt__avatar">${esc((c.author || "익").slice(0, 1))}</span>
          <div class="cmt__body">
            <div class="cmt__author">${esc(c.author || "익명")}${c.mine ? ` <button class="cmt__del" data-del-cmt="${esc(c.id)}" title="삭제">✕</button>` : ""}</div>
            <div class="cmt__text">${esc(c.comment)}</div>
          </div>
        </div>`).join("");
      const compose = current.openCommentFor === f.id
        ? `<div class="cmt-compose">
             <textarea class="cmt-input" placeholder="댓글로 반응을 남겨보세요">${esc(current.commentText || "")}</textarea>
             <div class="cmt-compose__actions">
               <button class="btn btn--soft btn--sm" data-cmt-cancel>취소</button>
               <button class="btn btn--green btn--sm" data-cmt-save="${esc(f.id)}">댓글 등록</button>
             </div>
           </div>`
        : `<button class="cmt-add" data-cmt-open="${esc(f.id)}">${cs.length ? "댓글 " + cs.length + " · 이어서 남기기" : "댓글 남기기"}</button>`;
      return `<article class="fb-card ${t.cls}" data-id="${esc(f.id)}">
        <div class="fb-card__head">
          <span class="mark mark--${t.cls}">${t.icon}</span>
          <span class="fb-card__author">${esc(f.author || "익명")}</span>
          ${rangeTag}
          <span class="fb-card__when">${timeAgo(f.created_at)}</span>
          ${f.mine ? `<button class="fb-card__del" data-del-fb="${esc(f.id)}" title="삭제">✕</button>` : ""}
        </div>
        <div class="fb-card__text">${esc(f.comment) || "<i>내용 없음</i>"}</div>
        <div class="fb-thread">${thread}${compose}</div>
      </article>`;
    }).join("");
    bindPanel();
    if (current.openCommentFor) {
      const inp = $(".cmt-input", fbListEl);
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
  }

  function bindPanel() {
    $$(".fb-card", fbListEl).forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("textarea")) return;
        const f = current.items.find((x) => x.id === card.dataset.id);
        if (f && current.viewer) current.viewer.scrollToPage(f.page);
        flashMark(card.dataset.id);
      });
    });
    $$("[data-del-fb]", fbListEl).forEach((b) =>
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("이 피드백과 댓글을 삭제할까요?")) return;
        await Store.remove(b.dataset.delFb); await refresh();
      }));
    $$("[data-del-cmt]", fbListEl).forEach((b) =>
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("이 댓글을 삭제할까요?")) return;
        await Store.removeComment(b.dataset.delCmt); await refresh();
      }));
    $$("[data-cmt-open]", fbListEl).forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); current.openCommentFor = b.dataset.cmtOpen; current.commentText = ""; renderPanel(); }));
    $$("[data-cmt-cancel]", fbListEl).forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); current.openCommentFor = null; current.commentText = ""; renderPanel(); }));
    $$(".cmt-input", fbListEl).forEach((t) => t.addEventListener("input", () => { current.commentText = t.value; }));
    $$("[data-cmt-save]", fbListEl).forEach((b) =>
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const text = (current.commentText || "").trim();
        if (!text) return;
        const fid = b.dataset.cmtSave;
        current.openCommentFor = null; current.commentText = "";
        try { await Store.addComment({ feedback_id: fid, pdf_id: current.doc.id, comment: text, author: currentUser }); await refresh(); }
        catch (err) { alert("댓글 저장에 실패했습니다."); console.error(err); }
      }));
  }

  $$(".fb-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".fb-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (current) current.filter = btn.dataset.filter;
      renderMarks(); renderPanel();
    }));

  $("#doc-back").addEventListener("click", () => { closeReader(); show(V.hub); });

  // ---- 진행바 ----
  function updateProgress() {
    const pages = $$(".page", pageWrap);
    if (!pages.length) { pageInfo.textContent = "0 / 0"; progBar.style.width = "0%"; return; }
    const cr = pageWrap.getBoundingClientRect();
    const mark = cr.top + cr.height * 0.35;
    let cur = 1;
    pages.forEach((pe, i) => { if (pe.getBoundingClientRect().top <= mark) cur = i + 1; });
    pageInfo.textContent = cur + " / " + pages.length;
    progBar.style.width = (cur / pages.length * 100) + "%";
  }

  // 진행바의 특정 지점 클릭 → 해당 페이지로 이동
  $(".pdf-progress__track").addEventListener("click", (e) => {
    if (!current || !current.viewer) return;
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const total = current.viewer.numPages || 1;
    let pg = Math.round(frac * total) || 1;
    pg = Math.max(1, Math.min(total, pg));
    current.viewer.scrollToPage(pg);
  });

  // =============================================================
  //  작성 팝업 (클릭=점 / 드래그=범위)
  // =============================================================
  const composer = $("#composer"), composerText = $("#composer-text"), composerHint = $("#composer-hint");
  let composerType = "question";

  function setComposerType(type) {
    composerType = type;
    $$(".draft-type", composer).forEach((b) => b.classList.toggle("active", b.dataset.type === type));
    composerText.placeholder = type === "question" ? "이 부분에서 궁금한 점을 적어주세요" : "이 부분에서 인상 깊었던 점을 적어주세요";
  }
  $$(".draft-type", composer).forEach((b) => b.addEventListener("click", () => setComposerType(b.dataset.type)));

  function openComposer(ctx) {
    if (!current) return;
    current.draft = { page: ctx.page, x: ctx.x, y: ctx.y, w: ctx.w || 0, h: ctx.h || 0 };
    setComposerType("question");
    composerText.value = ""; composerHint.textContent = "";
    positionFixed(composer, ctx.clientX, ctx.clientY);
    composer.classList.add("show");
    setTimeout(() => composerText.focus(), 30);
  }
  function closeComposer() { composer.classList.remove("show"); if (current) current.draft = null; }
  $("#composer-cancel").addEventListener("click", closeComposer);

  $("#composer-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!current || !current.draft) return;
    const text = composerText.value.trim();
    if (!text) { composerHint.textContent = "내용을 적어주세요."; return; }
    const d = current.draft;
    closeComposer();
    try {
      await Store.add({ pdf_id: current.doc.id, page: d.page, x: d.x, y: d.y, w: d.w, h: d.h, type: composerType, comment: text, author: currentUser });
      await refresh();
    } catch (err) { alert("저장에 실패했습니다. 잠시 후 다시 시도해주세요."); console.error(err); }
  });

  function positionFixed(el, ax, ay) {
    if (el.parentElement !== document.body) document.body.appendChild(el);
    el.style.visibility = "hidden"; el.classList.add("show");
    const w = el.offsetWidth, h = el.offsetHeight;
    el.classList.remove("show"); el.style.visibility = "";
    const gap = 14;
    let left = ax + gap;
    if (left + w > window.innerWidth - 8) left = ax - gap - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = ay - h / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    el.style.left = left + "px"; el.style.top = top + "px";
  }

  pageWrap.addEventListener("scroll", () => { closeComposer(); closeMarkPopup(); hideTip(); updateProgress(); });
  window.addEventListener("resize", updateProgress);
  document.addEventListener("mousedown", (e) => {
    if (e.target.closest(".marker, .region")) return;
    if (composer.classList.contains("show") && !composer.contains(e.target)) closeComposer();
    if (markPop.classList.contains("show") && !markPop.contains(e.target)) closeMarkPopup();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeComposer(); closeMarkPopup(); } });
})();
