import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "./ReviewApproval.css";
import api from "../../api";

const ENDPOINTS = {
  myStores: ["/itda/me/stores", "/itda/stores"],
  storeReviews: () => `/itda/reviews`,
  // ✅ 승인/거부: 쿼리스트링으로 전달
  reviewApprove: (id) => [
    { method: "patch", url: `/itda/reviews/${id}?status=APPROVED` },
  ],
  reviewReject: (id) => (
    { method: "patch", url: `/itda/reviews/${id}?status=REJECTED` }
  ),
  voucherIssue: (payload) => [
    { method: "post", url: `/itda/vouchers/issue`, body: payload },
    { method: "post", url: `/itda/vouchers`, body: payload },
  ],
};

/* ===== 로컬 날짜 유틸 (UTC 보정 없이 yyyy-mm-dd) ===== */
const isoLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDaysLocal = (date, n) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
};
const fmtDisplay = (iso) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
};

export default function ReviewApprovalPage() {
  // 🔄 라우터 컨텍스트에서 user를 받습니다
  const { user } = useOutletContext() || {};
  const navigate = useNavigate();

  // ───────── 접근 가드
  useEffect(() => {
    const role = (user?.role || "").toString().toUpperCase();
    if (!user) return; // 상위(AppLayout)에서 로딩 대기
    if (role !== "OWNER") {
      alert("사장님 전용 페이지입니다.");
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // ───────── 매장/리뷰/요약 상태
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeErr, setStoreErr] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewErr, setReviewErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING"); // "ALL" | "PENDING" | "APPROVED"(=완료)

  // ✅ 요약은 /itda/reviews 응답 기반으로 직접 계산/반영
  const [summary, setSummary] = useState(null);

  // ───────── 보상/검수 모달 상태
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [rewardTitle, setRewardTitle] = useState("리뷰 보상");
  const [rewardStart, setRewardStart] = useState(""); // ISO yyyy-mm-dd
  const [rewardEnd, setRewardEnd] = useState("");     // ISO yyyy-mm-dd
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [decision, setDecision] = useState("APPROVE"); // "APPROVE" | "REJECT"

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
          // ownerId가 있으면 내 것만 필터
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
      status: st, // "PENDING" | "APPROVED" | "REJECTED"
      rewardStart: r.rewardStart,
      rewardEnd: r.rewardEnd,
    };
  };

  const computeSummary = (rawData, list) => {
    // 백엔드가 집계값을 실어주는 경우 우선 사용
    const fromApiTotal = rawData?.total ?? rawData?.count;
    const fromApiAvg = rawData?.avgRating ?? rawData?.averageRating ?? rawData?.avg;

    const total = typeof fromApiTotal === "number" ? fromApiTotal : list.length;
    const avg =
      typeof fromApiAvg === "number"
        ? fromApiAvg
        : (list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / (list.length || 1));

    return {
      total,
      avgRating: Math.round((avg || 0) * 10) / 10, // 소수점 1자리
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

      // ✅ 리뷰 API 기반 요약 계산/반영
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

  // ───────── 보상/검수 모달 열기 (고정 기간: 오늘 ~ 오늘+7)
  const openReward = (review) => {
    const today = new Date();
    const startIso = isoLocal(today);
    const endIso = isoLocal(addDaysLocal(today, 7));
    setRewardTarget(review);
    setRewardTitle("리뷰 보상");
    setRewardStart(startIso);
    setRewardEnd(endIso);
    setDecision("APPROVE"); // 기본값: 승인
    setRewardOpen(true);
  };

  // 카드 키보드 접근(Enter/Space로 모달)
  const handleCardKey = (e, review) => {
    if (review.status !== "PENDING") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openReward(review);
    }
  };

  // ───────── 완료(승인/비승인 처리 + 보상 발급)
  const submitDecision = async () => {
    try {
      if (!rewardTarget) return;

      // 비승인 처리
      if (decision === "REJECT") {
        setRewardSubmitting(true);
        const rej = ENDPOINTS.reviewReject(rewardTarget.id);
        await api[rej.method](rej.url, rej.body);

        setReviews((prev) =>
          prev.map((r) =>
            r.id === rewardTarget.id ? { ...r, status: "REJECTED" } : r
          )
        );
        // 요약(평균/갯수)은 상태 변경과 무관하므로 그대로 둠

        setRewardOpen(false);
        setRewardTarget(null);
        setStatusFilter("APPROVED"); // 비승인도 검수 완료 탭에서 보이도록
        alert("비승인 처리되었습니다.");
        return;
      }

      // 승인 처리 + 바우처 발급 (기간 고정)
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

      // 2) 바우처 발급 (고정 기간)
      const payload = {
        userId,
        storeId: Number(selectedStoreId),
        title: rewardTitle,
        startAt: rewardStart, // 오늘
        endAt: rewardEnd,     // 오늘+7
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

      // ✅ UI 즉시 반영 (승인됨 + 기간 표기)
      setReviews((prev) =>
        prev.map((r) =>
          r.id === rewardTarget.id
            ? { ...r, status: "APPROVED", rewardStart, rewardEnd }
            : r
        )
      );
      // 평균/총 건수는 변화 없음(동일 리뷰 수, 별점은 고정)

      setRewardOpen(false);
      setRewardTarget(null);
      setStatusFilter("APPROVED");
      alert("승인 및 보상 발급이 완료되었습니다.");
    } catch (e) {
      console.warn("submitDecision failed:", e);
      const msg = e?.response?.data?.message || e?.message || "처리 중 오류가 발생했습니다.";
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

          {/* 상태 필터: ALL / PENDING / APPROVED(검수 완료) */}
          <div className="rvap-tabs" role="tablist" aria-label="리뷰 상태">
            {[
              { key: "ALL", label: "모든 리뷰" },
              { key: "PENDING", label: "검수 대기" },
              { key: "APPROVED", label: "검수 완료" }, // 완료=APPROVED+REJECTED
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
              <article
                key={r.id}
                className={`rvap-card ${r.status === "PENDING" ? "rvap-clickable" : ""}`}
                onClick={() => {
                  if (r.status === "PENDING") openReward(r);
                }}
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
                    <>
                      <span className="rvap-chip ok">승인됨</span>
                      {r.rewardStart && r.rewardEnd && (
                        <span className="rvap-chip muted">
                          {fmtDisplay(r.rewardStart)} ~ {fmtDisplay(r.rewardEnd)}
                        </span>
                      )}
                    </>
                  ) : r.status === "REJECTED" ? (
                    /* ✅ 검수 완료 탭(=APPROVED 필터)에서는 빨간 칩, 그 외 탭에서는 비활성 버튼 */
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
                      className="rvap-btn gift"
                      onClick={(e) => {
                        e.stopPropagation();
                        openReward(r);
                      }}
                    >
                      보상
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* 보상/검수 모달 */}
      {rewardOpen && (
        <div
          className="rvap-modal-backdrop"
          onClick={() => !rewardSubmitting && setRewardOpen(false)}
        >
          <div className="rvap-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="rvap-modal-title">검수 처리</h3>
            <div className="rvap-modal-body">
              {/* 승인/비승인 선택 */}
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

              {/* 입력칸은 항상 표시. REJECT일 때 disabled 처리 */}
              <label className="rvap-field">
                <span className="rvap-label">보상 제목</span>
                <input
                  className="rvap-input"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  disabled={decision === "REJECT"}
                />
              </label>

              <div className="rvap-grid2">
                <label className="rvap-field">
                  <span className="rvap-label">시작일</span>
                  <input
                    className="rvap-input"
                    type="text"
                    value={fmtDisplay(rewardStart)}
                    readOnly
                    disabled={decision === "REJECT"}
                  />
                </label>
                <label className="rvap-field">
                  <span className="rvap-label">만료일</span>
                  <input
                    className="rvap-input"
                    type="text"
                    value={fmtDisplay(rewardEnd)}
                    readOnly
                    disabled={decision === "REJECT"}
                  />
                </label>
              </div>
            </div>

            <div className="rvap-modal-actions">
              <button
                className="rvap-btn ghost"
                onClick={() => !rewardSubmitting && setRewardOpen(false)}
              >
                취소
              </button>
              <button
                className="rvap-btn ok"
                disabled={rewardSubmitting}
                onClick={submitDecision}
              >
                {rewardSubmitting ? "처리 중…" : "완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
