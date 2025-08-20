import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../../api";
import "./ReviewApproval.css";

/** 백엔드 확정 시 여기만 바꿔주세요 */
const ENDPOINTS = {
  myStores: ["/itda/me/stores", "/itda/stores"], // 1순위 실패 시 2순위
  storeReviews: () => `/itda/reviews`,           // GET /itda/reviews?storeId={storeId}
  storeSummary: (storeId) => `/itda/stores/${storeId}/summary`,
  reviewApprove: (id) => [
    { method: "patch", url: `/itda/reviews/${id}/approve`, body: { approve: true } },
    { method: "patch", url: `/itda/reviews/${id}`,         body: { status: "APPROVED" } },
  ],
  voucherIssue: (payload) => [
    { method: "post", url: `/itda/vouchers/issue`, body: payload },
    { method: "post", url: `/itda/vouchers`,       body: payload },
  ],
};

export default function ReviewApprovalPage() {
  const { user } = useOutletContext() || {};
  const navigate = useNavigate();

  // ───────── 접근 가드 (OWNER만)
  useEffect(() => {
    const role = (user?.role || "").toString().toUpperCase();
    if (!user) return; // 상위(AppLayout)에서 로딩 대기
    if (role !== "OWNER") {
      alert("사장님 전용 페이지입니다.");
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // ───────── 매장 목록
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeErr, setStoreErr] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  // ───────── 리뷰 목록
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewErr, setReviewErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING"); // PENDING | APPROVED

  // ───────── 매장 요약(옵션)
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // ───────── 보상 모달
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [rewardTitle, setRewardTitle] = useState("리뷰 보상");
  const [rewardStart, setRewardStart] = useState("");
  const [rewardEnd, setRewardEnd] = useState("");
  const [rewardSubmitting, setRewardSubmitting] = useState(false);

  // 매장 불러오기 (내 매장 → 실패 시 전체 매장)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingStores(true);
        setStoreErr("");
        let list = [];
        try {
          const { data } = await api.get(ENDPOINTS.myStores[0]);
          list = Array.isArray(data) ? data : data?.items || [];
        } catch {
          const { data } = await api.get(ENDPOINTS.myStores[1]);
          list = Array.isArray(data) ? data : data?.items || [];
          // ownerId 필드가 있으면 내 것만 필터
          if (user?.id && list.length && list[0]?.ownerId != null) {
            list = list.filter((s) => String(s.ownerId) === String(user.id));
          }
        }
        if (!alive) return;
        setStores(list);
        if (list.length > 0) {
          setSelectedStoreId(String(list[0].id ?? list[0].storeId));
        }
      } catch (e) {
        if (!alive) return;
        setStoreErr(e?.response?.data?.message || "매장 목록을 불러오지 못했습니다.");
        setStores([]);
      } finally {
        if (alive) setLoadingStores(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // 리뷰 불러오기 (GET /itda/reviews?storeId=)
  const normalizeReview = (r) => {
    let st = (r.status || "").toString().toUpperCase();
    if (!st) {
      const ok = r.approved === true || !!r.approvedAt;
      st = ok ? "APPROVED" : "PENDING";
    }
    return {
      id: r.id ?? r.reviewId,
      // 여러 케이스에서 userId 안전 추출
      userId: r.userId ?? r.reviewerId ?? r.writerId ?? r.user?.id ?? r.accountId,
      userName: r.userName ?? r.nickname ?? r.username ?? r.user?.name ?? "사용자",
      rating: r.rating ?? r.stars ?? 0,
      text: r.text ?? r.content ?? "",
      date: r.date ?? r.createdAt ?? r.created_at ?? "",
      images: r.images ?? r.photos ?? [],
      status: st,
    };
  };

  const fetchReviews = async (storeId) => {
    if (!storeId) return;
    setLoadingReviews(true);
    setReviewErr("");
    try {
      const { data } = await api.get(ENDPOINTS.storeReviews(), {
        params: { storeId },
      });
      const list = Array.isArray(data) ? data : data?.items || [];
      const normalized = list.map(normalizeReview);
      setReviews(normalized);
    } catch (e) {
      setReviews([]);
      setReviewErr(e?.response?.data?.message || "리뷰를 불러오지 못했습니다.");
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (!selectedStoreId) return;
    fetchReviews(selectedStoreId);
  }, [selectedStoreId]);

  // 요약 불러오기 (옵션)
  useEffect(() => {
    if (!selectedStoreId) return;
    let alive = true;
    (async () => {
      try {
        setLoadingSummary(true);
        const { data } = await api.get(ENDPOINTS.storeSummary(selectedStoreId));
        if (!alive) return;
        setSummary(data || null);
      } catch {
        setSummary(null);
      } finally {
        if (alive) setLoadingSummary(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedStoreId]);

  const filtered = useMemo(() => {
    const key = statusFilter.toUpperCase();
    return reviews.filter((r) => r.status === key);
  }, [reviews, statusFilter]);

  // ───────── 단일 액션: 보상 (승인 → 바우처 발급)
  const openReward = (review) => {
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    setRewardTarget(review);
    setRewardTitle("리뷰 보상");
    setRewardStart(iso(today));
    setRewardEnd(iso(new Date(today.getTime() + 1000 * 60 * 60 * 24 * 30))); // +30일
    setRewardOpen(true);
  };

  const submitReward = async () => {
    try {
      if (!rewardTarget) return;
      const userId =
        rewardTarget.userId ??
        rewardTarget.reviewerId ??
        rewardTarget.writerId ??
        rewardTarget.user?.id;
      if (!userId) {
        alert("리뷰 작성자 ID를 찾을 수 없어 보상을 발급할 수 없습니다.");
        return;
      }

      setRewardSubmitting(true);

      // 1) 승인(필요 시)
      if (rewardTarget.status !== "APPROVED") {
        const trials = ENDPOINTS.reviewApprove(rewardTarget.id);
        let ok = false, err;
        for (const t of trials) {
          try {
            await api[t.method](t.url, t.body);
            ok = true;
            break;
          } catch (e) { err = e; }
        }
        if (!ok) throw err;
      }

      // 2) 바우처 발급
      const payload = {
        userId,                                  // 🎯 수령자
        storeId: Number(selectedStoreId),        // 숫자 변환 (백엔드가 number 기대하는 경우 대비)
        title: rewardTitle,
        startAt: rewardStart,
        endAt: rewardEnd,
      };
      const trials2 = ENDPOINTS.voucherIssue(payload);
      let ok2 = false, err2;
      for (const t of trials2) {
        try {
          await api[t.method](t.url, t.body);
          ok2 = true;
          break;
        } catch (e) { err2 = e; }
      }
      if (!ok2) throw err2;

      // ✅ UI 즉시 반영 (낙관적 업데이트 + 탭 이동)
      setReviews((prev) =>
        prev.map((r) =>
          r.id === rewardTarget.id ? { ...r, status: "APPROVED" } : r
        )
      );
      setRewardOpen(false);
      setRewardTarget(null);
      setStatusFilter("APPROVED"); // 탭을 이동시켜 변화가 눈에 보이게
      alert("보상이 발급되었습니다.");

      // (선택) 서버 최신화 다시 가져오고 싶으면 주석 해제
      // await fetchReviews(selectedStoreId);
    } catch (e) {
      console.warn("voucher issue failed:", e);
      const msg = e?.response?.data?.message || e?.message || "보상 발급 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setRewardSubmitting(false);
    }
  };

  return (
    <div className="rvap-root">
      <header className="rvap-head">
        <h1 className="rvap-title">리뷰 확인 및 완료처리</h1>

        <div className="rvap-controls">
          {/* 매장 선택 */}
          <select
            className="rvap-select"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            disabled={loadingStores || stores.length === 0}
          >
            {stores.map((s) => {
              const id = s.id ?? s.storeId;
              return (
                <option key={id} value={id}>
                  {s.name || s.storeName || `매장#${id}`}
                </option>
              );
            })}
          </select>

          {/* 상태 필터: PENDING / APPROVED 만 사용 */}
          <div className="rvap-tabs" role="tablist" aria-label="리뷰 상태">
            {["PENDING", "APPROVED"].map((k) => (
              <button
                key={k}
                type="button"
                className={`rvap-tab ${statusFilter === k ? "active" : ""}`}
                role="tab"
                aria-selected={statusFilter === k}
                onClick={() => setStatusFilter(k)}
              >
                {k === "PENDING" ? "검수 대기" : "승인됨"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* (옵션) 매장 요약 */}
      {!loadingStores && !storeErr && selectedStoreId && (
        <section className="rvap-summary">
          {loadingSummary ? (
            <div className="rvap-chip muted">요약 불러오는 중…</div>
          ) : summary ? (
            <div className="rvap-summary-grid">
              <div className="rvap-summary-item">총 리뷰: {summary.total ?? "-"}</div>
              <div className="rvap-summary-item">평균 별점: {summary.avgRating ?? "-"}</div>
              <div className="rvap-summary-item">긍정: {summary.pos ?? "-"}</div>
              <div className="rvap-summary-item">부정: {summary.neg ?? "-"}</div>
            </div>
          ) : (
            <div className="rvap-chip muted">요약 없음</div>
          )}
        </section>
      )}

      {/* 매장 로딩/에러 */}
      {loadingStores && <div className="rvap-empty">매장 목록을 불러오는 중…</div>}
      {!loadingStores && storeErr && <div className="rvap-error">{storeErr}</div>}

      {/* 리뷰 리스트 */}
      {!loadingStores && !storeErr && (
        <section className="rvap-list">
          {loadingReviews ? (
            <>
              <div className="rvap-card rvap-skeleton" />
              <div className="rvap-card rvap-skeleton" />
            </>
          ) : reviewErr ? (
            <div className="rvap-error">{reviewErr}</div>
          ) : filtered.length === 0 ? (
            <div className="rvap-empty">해당 상태의 리뷰가 없습니다.</div>
          ) : (
            filtered.map((r) => (
              <article key={r.id} className="rvap-card">
                <div className="rvap-card-head">
                  <div className="rvap-avatar">👤</div>
                  <div className="rvap-meta">
                    <div className="rvap-user">{r.userName}</div>
                    <div className="rvap-date">{r.date}</div>
                    <div className="rvap-stars">
                      {"★".repeat(r.rating || 0)}
                      {"☆".repeat(Math.max(0, 5 - (r.rating || 0)))}
                    </div>
                  </div>
                </div>

                <div className="rvap-text">{r.text}</div>

                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="rvap-images">
                    {r.images.map((src, i) => (
                      <img key={i} src={src} alt={`review-${r.id}-${i}`} />
                    ))}
                  </div>
                )}

                <div className="rvap-actions">
                  <button type="button" className="rvap-btn gift" onClick={() => openReward(r)}>
                    보상
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* 보상 모달 */}
      {rewardOpen && (
        <div className="rvap-modal-backdrop" onClick={() => !rewardSubmitting && setRewardOpen(false)}>
          <div className="rvap-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="rvap-modal-title">보상(바우처) 발급</h3>
            <div className="rvap-modal-body">
              <label className="rvap-field">
                <span className="rvap-label">제목</span>
                <input
                  className="rvap-input"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                />
              </label>
              <div className="rvap-grid2">
                <label className="rvap-field">
                  <span className="rvap-label">시작일</span>
                  <input
                    className="rvap-input"
                    type="date"
                    value={rewardStart}
                    onChange={(e) => setRewardStart(e.target.value)}
                  />
                </label>
                <label className="rvap-field">
                  <span className="rvap-label">종료일</span>
                  <input
                    className="rvap-input"
                    type="date"
                    value={rewardEnd}
                    onChange={(e) => setRewardEnd(e.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="rvap-modal-actions">
              <button className="rvap-btn ghost" onClick={() => !rewardSubmitting && setRewardOpen(false)}>
                취소
              </button>
              <button className="rvap-btn gift" disabled={rewardSubmitting} onClick={submitReward}>
                {rewardSubmitting ? "발급 중…" : "발급"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
