import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "./ReviewApproval.css";
import api from "../../api";

/** 필요 시 유지하세요 */
const JSON_HDR = {
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
};

const ENDPOINTS = {
  myStores: ["/itda/me/stores", "/itda/stores"],
  storeReviews: () => `/itda/reviews`,

  // ✅ 바디 없이, /itda/reviews/{id}/status 로 호출 + status는 params로
  reviewApprove: (id) => ({
    method: "patch",
    url: `/itda/reviews/${id}/status`,
    config: { params: { status: "APPROVED" }, ...JSON_HDR },
  }),
  reviewReject: (id) => ({
    method: "patch",
    url: `/itda/reviews/${id}/status`,
    config: { params: { status: "REJECTED" }, ...JSON_HDR },
  }),
};

// 표시용(그대로 유지)
const fmtDisplay = (iso) => {
  if (!iso) return "-";
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${y}.${m}.${d}` : String(iso);
};

export default function ReviewApprovalPage() {
  const { user } = useOutletContext() || {};
  const navigate = useNavigate();

  // ───────── 접근 가드
  useEffect(() => {
    const role = (user?.role || "").toString().toUpperCase();
    if (!user) return;
    if (role !== "OWNER") {
      alert("사장님 전용 페이지입니다.");
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // ───────── 상태
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeErr, setStoreErr] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewErr, setReviewErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING"); // ALL | PENDING | APPROVED(=완료)

  const [summary, setSummary] = useState(null);

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [decision, setDecision] = useState("APPROVE"); // APPROVE | REJECT

  // ───────── 매장 불러오기
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

  // ───────── 리뷰 불러오기 (+ 요약 계산)
  const normalizeReview = (r) => {
    let st = (r.status || "").toString().toUpperCase();
    if (!st) {
      const ok = r.approved === true || !!r.approvedAt;
      st = ok ? "APPROVED" : "PENDING";
    }
    const ratingRaw = r.rating ?? r.stars ?? 0;
    const ratingNum = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw) || 0;

    return {
      id: r.id ?? r.reviewId,
      userId: r.userId ?? r.reviewerId ?? r.writerId ?? r.user?.id ?? r.accountId,
      userName: r.userName ?? r.nickname ?? r.username ?? r.user?.name ?? "사용자",
      rating: ratingNum,
      text: r.text ?? r.content ?? "",
      date: r.date ?? r.createdAt ?? r.created_at ?? "",
      images: r.images ?? r.photos ?? [],
      status: st, // PENDING | APPROVED | REJECTED
      rewardStart: r.rewardStart,
      rewardEnd: r.rewardEnd,
    };
  };

  const computeSummary = (rawData, list) => {
    const fromApiTotal = rawData?.total ?? rawData?.count;
    const fromApiAvg = rawData?.avgRating ?? rawData?.averageRating ?? rawData?.avg;
    const total = typeof fromApiTotal === "number" ? fromApiTotal : list.length;
    const avg =
      typeof fromApiAvg === "number"
        ? fromApiAvg
        : (list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / (list.length || 1));
    return { total, avgRating: Math.round((avg || 0) * 10) / 10 };
  };

  const fetchReviews = async (storeId) => {
    if (!storeId) return;
    setLoadingReviews(true);
    setReviewErr("");
    try {
      const { data } = await api.get(ENDPOINTS.storeReviews(), { params: { storeId } });
      const list = Array.isArray(data) ? data : data?.items || [];
      const normalized = list.map(normalizeReview);
      setReviews(normalized);
      setSummary(computeSummary(data, normalized));
    } catch (e) {
      setReviews([]);
      setSummary({ total: 0, avgRating: 0 });
      setReviewErr(e?.response?.data?.message || "리뷰를 불러오지 못했습니다.");
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (!selectedStoreId) return;
    fetchReviews(selectedStoreId);
  }, [selectedStoreId]);

  // ───────── 필터 계산
  const filtered = useMemo(() => {
    const key = (statusFilter || "").toUpperCase();
    if (key === "ALL") return reviews;
    if (key === "APPROVED") return reviews.filter((r) => r.status !== "PENDING");
    return reviews.filter((r) => r.status === key);
  }, [reviews, statusFilter]);

  // ───────── 모달 열기 (이제 날짜/제목 없음)
  const openReward = (review) => {
    setRewardTarget(review);
    setDecision("APPROVE");
    setRewardOpen(true);
  };

  // ───────── 바디 없이 PATCH (axios.patch(url, null, config))
  const patchNoBody = (url, config) => api.patch(url, null, config);

  // ───────── 승인/비승인 처리
  const submitDecision = async () => {
    try {
      if (!rewardTarget) return;

      setRewardSubmitting(true);

      if (decision === "REJECT") {
        const t = ENDPOINTS.reviewReject(rewardTarget.id);
        await patchNoBody(t.url, t.config);

        setReviews((prev) =>
          prev.map((r) => (r.id === rewardTarget.id ? { ...r, status: "REJECTED" } : r))
        );
        setRewardOpen(false);
        setRewardTarget(null);
        setStatusFilter("APPROVED");
        alert("비승인 처리되었습니다.");
        return;
      }

      // APPROVE
      if (rewardTarget.status !== "APPROVED") {
        const t = ENDPOINTS.reviewApprove(rewardTarget.id);
        await patchNoBody(t.url, t.config);
      }

      // UI 반영
      setReviews((prev) =>
        prev.map((r) => (r.id === rewardTarget.id ? { ...r, status: "APPROVED" } : r))
      );

      setRewardOpen(false);
      setRewardTarget(null);
      setStatusFilter("APPROVED");
      alert("승인 처리되었습니다.");
    } catch (e) {
      console.warn("submitDecision failed:", e);
      const msg = e?.response?.data?.message || e?.message || "처리 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setRewardSubmitting(false);
    }
  };

  const handleCardKey = (e, review) => {
    if (review.status !== "PENDING") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openReward(review);
    }
  };

  return (
    <div className="rvap-root">
      <header className="rvap-head">
        <h1 className="rvap-title">리뷰 확인 및 완료처리</h1>

        <div className="rvap-controls">
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

          <div className="rvap-tabs" role="tablist" aria-label="리뷰 상태">
            {[
              { key: "ALL", label: "모든 리뷰" },
              { key: "PENDING", label: "검수 대기" },
              { key: "APPROVED", label: "검수 완료" }, // 완료 = APPROVED + REJECTED
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`rvap-tab ${statusFilter === t.key ? "active" : ""}`}
                role="tab"
                aria-selected={statusFilter === t.key}
                onClick={() => setStatusFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!loadingStores && !storeErr && selectedStoreId && (
        <section className="rvap-summary">
          {loadingReviews ? (
            <div className="rvap-chip muted">요약 불러오는 중…</div>
          ) : summary ? (
            <div className="rvap-summary-grid">
              <div className="rvap-summary-item">총 리뷰: {summary.total ?? "-"}</div>
              <div className="rvap-summary-item">평균 별점: {summary.avgRating ?? "-"}</div>
            </div>
          ) : (
            <div className="rvap-chip muted">요약 없음</div>
          )}
        </section>
      )}

      {loadingStores && <div className="rvap-empty">매장 목록을 불러오는 중…</div>}
      {!loadingStores && storeErr && <div className="rvap-error">{storeErr}</div>}

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
              <article
                key={r.id}
                className={`rvap-card ${r.status === "PENDING" ? "rvap-clickable" : ""}`}
                onClick={() => r.status === "PENDING" && openReward(r)}
                role={r.status === "PENDING" ? "button" : undefined}
                tabIndex={r.status === "PENDING" ? 0 : undefined}
                onKeyDown={(e) => handleCardKey(e, r)}
                aria-label={r.status === "PENDING" ? "리뷰 카드: 클릭하여 검수" : undefined}
              >
                <div className="rvap-card-head">
                  <div className="rvap-avatar">👤</div>
                  <div className="rvap-meta">
                    <div className="rvap-user">{r.userName}</div>
                    <div className="rvap-date">{r.date}</div>
                    <div className="rvap-stars">
                      {"★".repeat(Math.max(0, Math.floor(r.rating || 0)))}
                      {"☆".repeat(Math.max(0, 5 - Math.floor(r.rating || 0)))}
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
                  {r.status === "APPROVED" ? (
                    <span className="rvap-chip ok">승인됨</span>
                  ) : r.status === "REJECTED" ? (
                    statusFilter === "APPROVED" ? (
                      <span className="rvap-chip danger">비승인</span>
                    ) : (
                      <button type="button" className="rvap-btn" disabled aria-disabled="true">
                        비승인
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="rvap-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openReward(r);
                      }}
                    >
                      검수
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* 보상/검수 모달 (이제 라디오만) */}
      {rewardOpen && (
        <div className="rvap-modal-backdrop" onClick={() => !rewardSubmitting && setRewardOpen(false)}>
          <div className="rvap-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="rvap-modal-title">검수 처리</h3>
            <div className="rvap-modal-body">
              <div className="rvap-field">
                <span className="rvap-label">검수 결과</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="rvap-decision"
                      value="APPROVE"
                      checked={decision === "APPROVE"}
                      onChange={() => setDecision("APPROVE")}
                    />
                    승인
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="rvap-decision"
                      value="REJECT"
                      checked={decision === "REJECT"}
                      onChange={() => setDecision("REJECT")}
                    />
                    비승인
                  </label>
                </div>
              </div>
            </div>

            <div className="rvap-modal-actions">
              <button className="rvap-btn ghost" onClick={() => !rewardSubmitting && setRewardOpen(false)}>
                취소
              </button>
              <button className="rvap-btn ok" disabled={rewardSubmitting} onClick={submitDecision}>
                {rewardSubmitting ? "처리 중…" : "완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
