// src/pages/MyPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api";
import "./UserMyPage.css";

// 바우처 필터 탭 순서 (전체를 맨 앞에)
const FILTERS = ["ALL", "ISSUED", "USED", "EXPIRED"];

export default function MyPage() {
  const outletCtx = useOutletContext();
  const [user, setUser] = useState(outletCtx?.user || null);

  // 리뷰
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // 바우처
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState("ISSUED");

  // 유저
  const [loadingUser, setLoadingUser] = useState(!outletCtx?.user);

  const email = user?.email || "";
  const initial = (user?.name || user?.email || "U").toString().slice(0, 1).toUpperCase();
  const displayName = user?.username || user?.name || user?.email || "사용자";

  // 유저 확보 (mock 제거)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (outletCtx?.user) {
          if (alive) {
            setUser(outletCtx.user);
            setLoadingUser(false);
          }
          return;
        }
        setLoadingUser(true);
        const { data } = await api.get("/itda/me");
        if (alive) setUser(data || null);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoadingUser(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [outletCtx?.user]);

  // 리뷰 로드 (mock 제거)
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        setLoadingReviews(true);
        const { data } = await api.get("/itda/reviews", { params: { userId: user.id } });
        if (alive) setReviews(Array.isArray(data) ? data : data?.items || []);
      } catch {
        if (alive) setReviews([]);
      } finally {
        if (alive) setLoadingReviews(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // 바우처 로드 함수 (ALL은 클라이언트에서 3상태 병합)
  const fetchVouchers = async (filter) => {
    if (!user?.id) return;
    setLoadingVouchers(true);

    const normalize = (list, assumedFilter) =>
      list.map((v) => {
        const storeName = v.storeName || v.store?.name || "";
        const title = v.title || v.name || "바우처";
        const id = v.id ?? v.voucherId ?? v.uuid ?? v.code;
        const status =
          assumedFilter === "ALL"
            ? (v.vstatus || v.status || "ISSUED").toString().toUpperCase()
            : (v.vstatus || assumedFilter || "ISSUED").toString().toUpperCase();
        const start = v.startAt || v.startDate || v.validFrom || v.validFromAt || null;
        const end = v.endAt || v.endDate || v.validTo || v.validToAt || null;
        return { ...v, id, storeName, title, status, start, end };
      });

    try {
      const effective = filter || voucherFilter || "ISSUED";
      if (effective === "ALL") {
        const statusList = ["ISSUED", "USED", "EXPIRED"];
        const results = await Promise.all(
          statusList.map((f) =>
            api
              .get("/itda/me/vouchers", { params: { filter: f } })
              .then(({ data }) => (Array.isArray(data) ? data : data?.items || []))
              .catch(() => [])
          )
        );
        const merged = [...results[0], ...results[1], ...results[2]];
        const seen = new Set();
        const deduped = merged.filter((v) => {
          const vid = v.id ?? v.voucherId ?? v.uuid ?? v.code;
          if (seen.has(vid)) return false;
          seen.add(vid);
          return true;
        });
        setVouchers(normalize(deduped, "ALL"));
      } else {
        const { data } = await api.get("/itda/me/vouchers", { params: { filter: effective } });
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

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return String(d).slice(0, 10);
  };

  const handleUseVoucher = async (voucherId) => {
    if (!voucherId) return;
    if (!window.confirm("이 바우처를 사용 처리하시겠습니까?")) return;

    try {
      await api.patch(`/itda/me/vouchers/${voucherId}/use`);
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
              reviews.map((review) => (
                <article key={review.id} className="mypage-card">
                  {/* 가게 정보 */}
                  <div className="mypage-store">
                    <div className="mypage-store-thumb" aria-hidden>
                      📷
                    </div>
                    <div className="mypage-store-info">
                      <div className="mypage-store-name">{review.storeName}</div>
                    </div>
                  </div>

                  {/* 리뷰 내용 */}
                  <div className="mypage-review">
                    <div className="mypage-avatar sm" aria-hidden>
                      👤
                    </div>
                    <div className="mypage-review-body">
                      <div className="mypage-review-meta">
                        <span className="mypage-review-author">{displayName}</span>
                      </div>
                      {review.content && (
                        <p className="mypage-review-text">{review.content}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* 바우처 섹션 */}
        <section className="mypage-section" aria-label="바우처 목록">
          <div className="mypage-section-head">
            <h2 className="mypage-section-title">바우처 목록</h2>

            {/* 탭: 전체 | 발급 | 사용 | 만료 */}
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
                    {/* 왼쪽: (칩 + 본문) 묶음 */}
                    <div className="mypage-reward-left">
                      {/* 상태 칩 (ALL에서는 각 항목 고유 상태 칩 노출) */}
                      <div className={`mypage-chip ${meta.chip}`}>
                        {statusMeta[v.status]?.label ?? meta.label}
                      </div>

                      <div className="mypage-reward-body">
                        <div className="mypage-reward-title">
                          {v.storeName ? `[${v.storeName}] ` : ""}
                          {v.title}
                        </div>
                        <div className="mypage-reward-period">
                          사용기간: {fmtDate(v.start)} ~ {fmtDate(v.end)}
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: '사용 처리' 버튼 (발급 상태에서만 표시) */}
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
