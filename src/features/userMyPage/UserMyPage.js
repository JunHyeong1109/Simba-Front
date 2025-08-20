import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api";
import "./UserMyPage.css";

export default function MyPage() {
  const outletCtx = useOutletContext();
  const [user, setUser] = useState(outletCtx?.user || null);

  // 리뷰
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // 바우처
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState("ISSUED"); // ISSUED | USED | EXPIRED

  // 유저
  const [loadingUser, setLoadingUser] = useState(!outletCtx?.user);

  const email = user?.email || "";
  const initial = (user?.name || user?.email || "U").toString().slice(0, 1).toUpperCase();
  const displayName = user?.username || user?.name || user?.email || "사용자";

  // 유저 확보
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
    return () => { alive = false; };
  }, [outletCtx?.user]);

  // 리뷰 로드
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
    return () => { alive = false; };
  }, [user?.id]);

  // 바우처 로드 함수
  const fetchVouchers = async (filter) => {
    if (!user?.id) return;
    setLoadingVouchers(true);
    try {
      const { data } = await api.get("/itda/me/vouchers", {
        params: { filter: (filter || voucherFilter) || "ISSUED" },
      });
      const list = Array.isArray(data) ? data : data?.items || [];

      // 응답 필드 정규화
      const normalized = list.map((v) => {
        const storeName = v.storeName || v.store?.name || "";
        const title = v.title || v.name || "바우처";
        const id = v.id ?? v.voucherId ?? v.uuid ?? v.code;
        const status = (v.status || filter || "ISSUED").toString().toUpperCase();
        const start = v.startAt || v.startDate || v.validFrom || v.validFromAt || null;
        const end   = v.endAt   || v.endDate   || v.validTo   || v.validToAt   || null;
        return { ...v, id, storeName, title, status, start, end };
      });

      setVouchers(normalized);
    } catch {
      setVouchers([]);
    } finally {
      setLoadingVouchers(false);
    }
  };

  // 바우처 로드 (필터 변경/유저 준비 후)
  useEffect(() => {
    if (!user?.id) return;
    fetchVouchers(voucherFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, voucherFilter]);

  // 상태 라벨/칩 클래스
  const statusMeta = useMemo(() => ({
    ISSUED:  { label: "발급됨",  chip: "success" },
    USED:    { label: "사용됨",  chip: "warn" },
    EXPIRED: { label: "만료됨",  chip: "muted" },
  }), []);

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    } catch {}
    return String(d).slice(0, 10);
  };

  // 바우처 사용 처리
  const handleUseVoucher = async (voucherId) => {
    if (!voucherId) return;
    if (!window.confirm("이 바우처를 사용 처리하시겠습니까?")) return;

    try {
      await api.patch(`/itda/me/vouchers/${voucherId}/use`);
      // 성공 후 목록 갱신 (현재 필터 유지)
      fetchVouchers();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "사용 처리 중 오류가 발생했습니다.";
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
          <div className="mypage-avatar" aria-hidden>{initial}</div>
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
                    <div className="mypage-store-thumb" aria-hidden>📷</div>
                    <div className="mypage-store-info">
                      <div className="mypage-store-name">{review.storeName}</div>
                      {review.address && (
                        <div className="mypage-store-addr" title={review.address}>
                          {review.address}
                        </div>
                      )}
                      {review.category && (
                        <div className="mypage-store-cat">{review.category}</div>
                      )}
                    </div>
                  </div>

                  {/* 리뷰 내용 */}
                  <div className="mypage-review">
                    <div className="mypage-avatar sm" aria-hidden>👤</div>
                    <div className="mypage-review-body">
                      <div className="mypage-review-meta">
                        <span className="mypage-review-author">{displayName}</span>
                        {review.date && <time className="mypage-review-date">{review.date}</time>}
                      </div>
                      {review.text && <p className="mypage-review-text">{review.text}</p>}
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

            {/* 필터 탭 */}
            <div className="mypage-tabs" role="tablist" aria-label="바우처 상태 필터">
              {["ISSUED", "USED", "EXPIRED"].map((key) => (
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
                    <div className={`mypage-chip ${meta.chip}`}>{meta.label}</div>

                    <div className="mypage-reward-body">
                      <div className="mypage-reward-title">
                        {v.storeName ? `[${v.storeName}] ` : ""}{v.title}
                      </div>
                      <div className="mypage-reward-period">
                        사용기간: {fmtDate(v.start)} ~ {fmtDate(v.end)}
                      </div>
                    </div>

                    {/* ISSUED 상태에서만 사용 버튼 노출 */}
                    {v.status === "ISSUED" && (
                      <div style={{ marginLeft: "auto" }}>
                        <button
                          type="button"
                          className="mypage-btn use"
                          onClick={() => handleUseVoucher(v.id)}
                          title="바우처 사용 처리"
                        >
                          사용 처리
                        </button>
                      </div>
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
