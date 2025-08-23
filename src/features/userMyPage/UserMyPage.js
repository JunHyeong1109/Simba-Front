// src/pages/MyPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api";
import "./UserMyPage.css";

const FILTERS = ["ALL", "ISSUED", "USED", "EXPIRED"];
const WITH_CREDENTIALS = { withCredentials: true };

export default function MyPage() {
  const outletCtx = useOutletContext();
  const initialUser = outletCtx?.user?.id ? outletCtx.user : null;

  const [user, setUser] = useState(initialUser);
  const [loadingUser, setLoadingUser] = useState(!initialUser);

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState("ISSUED");

  const email = user?.email || "";
  const initial = (user?.name || user?.email || "U").toString().slice(0, 1).toUpperCase();
  const displayName = user?.username || user?.name || user?.email || "사용자";

  // 유저 확보
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (outletCtx?.user?.id) {
          if (alive) {
            setUser(outletCtx.user);
            setLoadingUser(false);
          }
          return;
        }
        setLoadingUser(true);
        const { data } = await api.get("/itda/me", WITH_CREDENTIALS);
        if (alive) setUser(data?.id ? data : null);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();
    return () => { alive = false; };
  }, [outletCtx?.user?.id]);

  // 리뷰 로드
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        setLoadingReviews(true);
        const { data } = await api.get("/itda/reviews", {
          params: { userId: user.id },
          ...WITH_CREDENTIALS,
        });
        if (alive) setReviews(Array.isArray(data) ? data : data?.items || []);
      } catch {
        if (alive) setReviews([]);
      } finally {
        if (alive) setLoadingReviews(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // 날짜 포맷 (문자열/ISO/오프셋/epoch 모두 지원)
  const fmtDate = (d) => {
    if (d === null || d === undefined || d === "") return "-";
    if (typeof d === "number") {
      const ms = d > 1e12 ? d : d * 1000;
      const dt = new Date(ms);
      return isNaN(dt.getTime()) ? "-" : dt.toISOString().slice(0, 10);
    }
    const s = String(d).trim();
    if (!s) return "-";
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? s.slice(0, 10) : dt.toISOString().slice(0, 10);
  };

  // 바우처 로드
  const fetchVouchers = async (filter) => {
    if (!user?.id) return;
    setLoadingVouchers(true);

    const normalize = (list, assumedFilter) =>
      list.map((v) => {
        // ID 통일
        const id =
          v.id ?? v.voucherId ?? v.voucherID ?? v.uuid ?? v.code ?? v._id;

        // 상태 통일
        const rawStatus = (v.vstatus || v.status || assumedFilter || "ISSUED")
          .toString()
          .toUpperCase();
        const status = assumedFilter === "ALL" ? rawStatus : rawStatus;

        // 사용처(매장명)
        const storeName =
          v.storeName ||
          v.store?.name ||
          v.mission?.storeName ||
          v.mission?.store?.name ||
          "";

        // 🔑 보상명(제목) — rewardContent를 최우선 사용
        const rewardTitle =
          v.rewardContent ||                    // ✅ 아이스 아메리카노 1잔
          v.rewardName;

        // 최종 제목 텍스트
        const pureTitle = rewardTitle || v.title || v.name;

        // 화면 표시용 제목: [매장명]보상내용  (중간 공백 없이)
        const displayTitle = `${storeName ? `[${storeName}]` : ""}${pureTitle}`;

        // 사용기간(시작/끝) — 다양한 키 흡수
        const start =
          v.validFrom ??
          v.startAt ??
          v.start_date ??
          v.startDate ??
          v.issuedAt ??
          null;

        const end =
          v.validTo ??
          v.endAt ??
          v.end_date ??
          v.endDate ??
          v.expireAt ??
          v.expirationDate ??
          null;

        return {
          ...v,
          id,
          status,
          storeName,
          title: displayTitle, // ✅ 바로 표시용으로 저장
          start,
          end,
        };
      });

    try {
      const effective = filter || voucherFilter || "ISSUED";
      if (effective === "ALL") {
        const statusList = ["ISSUED", "USED", "EXPIRED"];
        const results = await Promise.all(
          statusList.map((f) =>
            api
              .get("/itda/me/vouchers", { params: { filter: f }, ...WITH_CREDENTIALS })
              .then(({ data }) => (Array.isArray(data) ? data : data?.items || []))
              .catch(() => [])
          )
        );
        const merged = [...results[0], ...results[1], ...results[2]];
        const seen = new Set();
        const deduped = merged.filter((v) => {
          const vid = v.id ?? v.voucherId ?? v.uuid ?? v.code ?? v._id;
          if (seen.has(vid)) return false;
          seen.add(vid);
          return true;
        });
        setVouchers(normalize(deduped, "ALL"));
      } else {
        const { data } = await api.get("/itda/me/vouchers", {
          params: { filter: effective },
          ...WITH_CREDENTIALS,
        });
        const list = Array.isArray(data) ? data : data?.items || [];
        setVouchers(normalize(list, effective));
      }
    } catch {
      setVouchers([]);
    } finally {
      setLoadingVouchers(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchVouchers(voucherFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, voucherFilter]);

  const statusMeta = useMemo(
    () => ({
      ALL: { label: "전체", chip: "" },
      ISSUED: { label: "발급", chip: "success" },
      USED: { label: "사용", chip: "warn" },
      EXPIRED: { label: "만료", chip: "muted" },
    }),
    []
  );

  const reviewStatusMeta = useMemo(
    () => ({
      APPROVED: { label: "승인됨", chip: "success" },
      PENDING: { label: "대기중", chip: "warn" },
      REJECTED: { label: "비승인", chip: "muted" },
    }),
    []
  );

  const handleUseVoucher = async (voucherId) => {
    if (!voucherId) return;
    if (!window.confirm("이 바우처를 사용 처리하시겠습니까?")) return;

    try {
      await api.patch(`/itda/me/vouchers/${voucherId}/use`, null, WITH_CREDENTIALS);
      fetchVouchers(voucherFilter);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "사용 처리 중 오류가 발생했습니다.";
      alert(msg);
    }
  };

  return (
    <div className="mypage-root">
      {/* 헤더 */}
      <header className="mypage-header">
        <div className="logo-text">리뷰어 마이페이지</div>

        <div className="mypage-user">
          <div className="mypage-user-meta">
            <span className="mypage-user-name">{displayName}</span>
            {email && <span className="mypage-user-mail">{email}</span>}
          </div>
          <div className="mypage-avatar" aria-hidden>
            {initial}
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="mypage-main">
        {/* 리뷰 섹션 */}
        <section className="mypage-section" aria-label="리뷰 목록">
          <div className="mypage-section-head">
            <h2 className="mypage-section-title">리뷰 목록</h2>
          </div>

          <div className="mypage-list">
            {loadingReviews ? (
              <>
                <div className="mypage-card mypage-skeleton" />
                <div className="mypage-card mypage-skeleton" />
              </>
            ) : reviews.length === 0 ? (
              <div className="mypage-empty">아직 작성한 리뷰가 없습니다.</div>
            ) : (
              reviews.map((review) => {
                const statusKey =
                  (review.status || "").toString().toUpperCase();
                const statusInfo =
                  reviewStatusMeta[statusKey] || reviewStatusMeta.PENDING;

                return (
                  <article key={review.id} className="mypage-card">
                    {/* 가게 정보 */}
                    <div className="mypage-store">
                      <div className="mypage-store-thumb" aria-hidden>
                        📷
                      </div>
                      <div className="mypage-store-info">
                        <div className="mypage-store-name">
                          {review.storeName}
                        </div>
                      </div>
                    </div>

                    {/* 리뷰 내용 */}
                    <div className="mypage-review">
                      <div className="mypage-avatar sm" aria-hidden>
                        👤
                      </div>
                      <div className="mypage-review-body">
                        <div className="mypage-review-meta">
                          <span className="mypage-review-author">
                            {displayName}
                          </span>
                          {/* 상태 칩 */}
                          <span className={`mypage-chip ${statusInfo.chip}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        {review.content && (
                          <p className="mypage-review-text">
                            {review.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* 바우처 섹션 */}
        <section className="mypage-section" aria-label="바우처 목록">
          <div className="mypage-section-head">
            <h2 className="mypage-section-title">바우처 목록</h2>

            {/* 탭 */}
            <div className="mypage-tabs" role="tablist" aria-label="바우처 상태 필터">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`mypage-tab ${voucherFilter === key ? "active" : ""}`}
                  role="tab"
                  aria-selected={voucherFilter === key}
                  onClick={() => setVoucherFilter(key)}
                >
                  {statusMeta[key]?.label || key}
                </button>
              ))}
            </div>
          </div>

          <div className="mypage-list">
            {loadingVouchers ? (
              <>
                <div className="mypage-card mypage-skeleton" />
                <div className="mypage-card mypage-skeleton" />
              </>
            ) : vouchers.length === 0 ? (
              <div className="mypage-empty">해당 상태의 바우처가 없습니다.</div>
            ) : (
              vouchers.map((v) => {
                const meta = statusMeta[v.status] || statusMeta.ISSUED;
                return (
                  <article key={v.id} className="mypage-card mypage-reward">
                    {/* 왼쪽 */}
                    <div className="mypage-reward-left">
                      <div className={`mypage-chip ${meta.chip}`}>
                        {statusMeta[v.status]?.label ?? meta.label}
                      </div>

                      <div className="mypage-reward-body">
                        {/* 제목: [매장명]보상내용 */}
                        <div className="mypage-reward-title">{v.title}</div>

                        <div className="mypage-reward-period">
                          {v.start || v.end ? (
                            <>사용기간: {fmtDate(v.start)} ~ {fmtDate(v.end)}</>
                          ) : (
                            <>사용기간: -</>
                          )}
                          <span className="mypage-reward-place">
                            {" "}
                            · 사용처: {v.storeName || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 발급 상태에서만 버튼 */}
                    {v.status === "ISSUED" && (
                      <button
                        type="button"
                        className="mypage-btn use"
                        onClick={() => handleUseVoucher(v.id)}
                        title="바우처 사용 처리"
                      >
                        사용 처리
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
