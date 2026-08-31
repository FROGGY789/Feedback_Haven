/* =============================================================
 *  store.js — 피드백 저장소
 *  Supabase 설정이 있으면 '공유 저장', 없으면 '로컬(브라우저) 저장'.
 *  두 경우 모두 동일한 인터페이스를 제공합니다:
 *    store.list(pdfId)                -> Promise<[feedback]>
 *    store.add(feedback)              -> Promise<feedback>
 *    store.remove(id)                 -> Promise<void>
 *    store.subscribe(pdfId, onChange) -> unsubscribe()  (실시간, 로컬은 no-op)
 *    store.mode                       -> "shared" | "local"
 * ============================================================= */

const Store = (function () {
  const cfg = window.APP_CONFIG || {};
  const hasSupabase =
    !!cfg.SUPABASE_URL &&
    !!cfg.SUPABASE_ANON_KEY &&
    typeof window.supabase !== "undefined";

  // 이 브라우저를 식별하는 값 (자기 글만 삭제 버튼 노출용)
  const CLIENT_ID = (function () {
    let v = localStorage.getItem("fh_client_id");
    if (!v) {
      v = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("fh_client_id", v);
    }
    return v;
  })();

  /* -------------------- 공유(Supabase) 구현 -------------------- */
  function sharedStore() {
    const client = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );
    const TABLE = "feedback";
    const CTABLE = "comments";

    return {
      mode: "shared",
      clientId: CLIENT_ID,

      async list(pdfId) {
        const { data, error } = await client
          .from(TABLE)
          .select("*")
          .eq("pdf_id", pdfId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data || []).map(normalize);
      },

      async add(fb) {
        const row = {
          pdf_id: fb.pdf_id,
          page: fb.page,
          x: fb.x,
          y: fb.y,
          type: fb.type,
          comment: fb.comment || "",
          author: fb.author || null,
          client_id: CLIENT_ID
        };
        const { data, error } = await client
          .from(TABLE)
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        return normalize(data);
      },

      async remove(id) {
        // 관련 댓글도 함께 삭제
        await client.from(CTABLE).delete().eq("feedback_id", id);
        const { error } = await client.from(TABLE).delete().eq("id", id);
        if (error) throw error;
      },

      // --- 댓글 ---
      async listComments(pdfId) {
        const { data, error } = await client
          .from(CTABLE)
          .select("*")
          .eq("pdf_id", pdfId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data || []).map(normalizeComment);
      },

      async addComment(c) {
        const row = {
          feedback_id: c.feedback_id,
          pdf_id: c.pdf_id,
          comment: c.comment || "",
          author: c.author || null,
          client_id: CLIENT_ID
        };
        const { data, error } = await client
          .from(CTABLE)
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        return normalizeComment(data);
      },

      async removeComment(id) {
        const { error } = await client.from(CTABLE).delete().eq("id", id);
        if (error) throw error;
      },

      subscribe(pdfId, onChange) {
        const channel = client
          .channel("fb-" + pdfId)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: TABLE,
              filter: "pdf_id=eq." + pdfId
            },
            () => onChange()
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: CTABLE,
              filter: "pdf_id=eq." + pdfId
            },
            () => onChange()
          )
          .subscribe();
        return () => client.removeChannel(channel);
      }
    };
  }

  /* -------------------- 로컬(브라우저) 구현 -------------------- */
  function localStore() {
    const KEY = "fh_feedback";
    const CKEY = "fh_comments";
    const read = (k) => {
      try {
        return JSON.parse(localStorage.getItem(k) || "[]");
      } catch {
        return [];
      }
    };
    const write = (k, arr) => localStorage.setItem(k, JSON.stringify(arr));
    const uid = (p) =>
      p + Math.random().toString(36).slice(2) + Date.now().toString(36);

    return {
      mode: "local",
      clientId: CLIENT_ID,

      async list(pdfId) {
        return read(KEY)
          .filter((f) => f.pdf_id === pdfId)
          .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
          .map(normalize);
      },

      async add(fb) {
        const row = {
          id: uid("l_"),
          pdf_id: fb.pdf_id,
          page: fb.page,
          x: fb.x,
          y: fb.y,
          type: fb.type,
          comment: fb.comment || "",
          author: fb.author || null,
          client_id: CLIENT_ID,
          created_at: new Date().toISOString()
        };
        const arr = read(KEY);
        arr.push(row);
        write(KEY, arr);
        return normalize(row);
      },

      async remove(id) {
        write(KEY, read(KEY).filter((f) => f.id !== id));
        write(CKEY, read(CKEY).filter((c) => c.feedback_id !== id));
      },

      // --- 댓글 ---
      async listComments(pdfId) {
        return read(CKEY)
          .filter((c) => c.pdf_id === pdfId)
          .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
          .map(normalizeComment);
      },

      async addComment(c) {
        const row = {
          id: uid("lc_"),
          feedback_id: c.feedback_id,
          pdf_id: c.pdf_id,
          comment: c.comment || "",
          author: c.author || null,
          client_id: CLIENT_ID,
          created_at: new Date().toISOString()
        };
        const arr = read(CKEY);
        arr.push(row);
        write(CKEY, arr);
        return normalizeComment(row);
      },

      async removeComment(id) {
        write(CKEY, read(CKEY).filter((c) => c.id !== id));
      },

      subscribe() {
        return () => {};
      }
    };
  }

  function normalize(row) {
    return {
      id: row.id,
      pdf_id: row.pdf_id,
      page: Number(row.page),
      x: Number(row.x),
      y: Number(row.y),
      type: row.type,
      comment: row.comment || "",
      author: row.author || "",
      client_id: row.client_id || "",
      created_at: row.created_at,
      mine: (row.client_id || "") === CLIENT_ID
    };
  }

  function normalizeComment(row) {
    return {
      id: row.id,
      feedback_id: row.feedback_id,
      pdf_id: row.pdf_id,
      comment: row.comment || "",
      author: row.author || "",
      client_id: row.client_id || "",
      created_at: row.created_at,
      mine: (row.client_id || "") === CLIENT_ID
    };
  }

  return hasSupabase ? sharedStore() : localStore();
})();
