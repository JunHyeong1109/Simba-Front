// dev 전용: axios 인스턴스(api)를 가로채 응답을 모의합니다.
import MockAdapter from "axios-mock-adapter";

export default function setupAxiosMock(api) {
  const mock = new MockAdapter(api, { delayResponse: 400 });

  const LS_KEY = "MOCK_CURRENT_USER";

  // ── 간단한 인메모리 DB
  const db = {
    users: [
      { id: 1, username: "owner1",    email: "owner1@itda.com",    role: "OWNER",    password: "password123" },
      { id: 2, username: "reviewer1", email: "reviewer1@itda.com", role: "REVIEWER", password: "password123" },
      { id: 3, username: "admin",     email: "admin@itda.com",     role: "ADMIN",    password: "password123" },
    ],
    stores: [
      { id: 10, name: "카페 모카", latitude: 37.5665, longitude: 126.9780, address: "서울 중구 세종대로 110" },
      { id: 11, name: "김밥천국", latitude: 37.5650, longitude: 126.9900, address: "서울 종로구" },
    ],
    missions: [
      {
        id: 100,
        title: "아메리카노 1+1",
        description: "사진 후기 올리면 1+1",
        startAt: "2025-08-01T00:00:00",
        endAt: "2025-08-31T23:59:59",
        storeId: 10,
        posterUrl: "",
      },
    ],
  };
  db.missions.forEach((m) => (m.store = db.stores.find((s) => s.id === m.storeId)));

  const getCurrentUser = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
  };
  const setCurrentUser = (user) => {
    if (!user) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(
      LS_KEY,
      JSON.stringify({ id: user.id, username: user.username, email: user.email, role: user.role })
    );
  };

  // ── Auth
  mock.onPost("/auth/register").reply((config) => {
    const { username, password, email } = JSON.parse(config.data || "{}");
    if (!username || !password || !email) return [400, { message: "필수 항목 누락" }];
    if (username.length < 4 || username.length > 15) return [400, { message: "아이디는 4~15자" }];
    if (password.length < 8 || password.length > 20) return [400, { message: "비밀번호는 8~20자" }];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [400, { message: "올바른 이메일을 입력하세요." }];
    if (db.users.some((u) => u.username === username)) return [409, { message: "이미 사용 중인 아이디" }];
    if (db.users.some((u) => u.email === email)) return [409, { message: "이미 사용 중인 이메일" }];

    const id = Math.max(...db.users.map((u) => u.id)) + 1;
    const user = { id, username, email, role: "REVIEWER", password };
    db.users.push(user);
    return [201, { id, username, email, role: "REVIEWER" }];
  });

  mock.onPost("/auth/login").reply((config) => {
    const { username, password } = JSON.parse(config.data || "{}");
    const user = db.users.find(
      (u) => (u.username === username || u.email === username) && u.password === password
    );
    if (!user) return [401, { message: "아이디 또는 비밀번호가 올바르지 않습니다." }];
    setCurrentUser(user);
    return [200, { id: user.id, username: user.username, email: user.email, role: user.role }];
  });

  mock.onPost("/auth/logout").reply(() => {
    setCurrentUser(null);
    return [204];
  });

  mock.onGet("/itda/me").reply(() => {
    const me = getCurrentUser();
    if (!me) return [401, { message: "Unauthorized" }];
    return [200, me];
  });

  // ── 도메인 API 간단 모의
  mock.onGet("/itda/missions/joinable").reply(() => [200, db.missions]);
  mock.onPost("/itda/missions").reply(() => [201, { message: "미션 생성(모의)" }]);

  mock.onGet("/itda/stores").reply(() => [200, db.stores]);
  mock.onPost("/itda/stores").reply((config) => {
    const body = JSON.parse(config.data || "{}");
    const id = Math.max(...db.stores.map((s) => s.id)) + 1;
    const store = {
      id,
      name: body.name || "새 매장",
      latitude: Number(body.latitude) || 37.5665,
      longitude: Number(body.longitude) || 126.9780,
      address: body.address || "",
    };
    db.stores.push(store);
    return [201, store];
  });
  mock.onGet(/\/itda\/stores\/\d+\/summary/).reply((config) => {
    const id = Number(config.url.match(/\/itda\/stores\/(\d+)\/summary/)[1]);
    const store = db.stores.find((s) => s.id === id);
    if (!store) return [404, { message: "매장을 찾을 수 없습니다." }];
    return [200, { summary: `${store.name}은(는) 친절하고 가성비가 좋아요.` }];
  });

  mock.onGet("/itda/reviews").reply(() => {
    return [200, [
      { id: 1, storeName: db.stores[0]?.name, address: db.stores[0]?.address, category: "카페", date: "2025-08-10", text: "분위기 굿" },
    ]];
  });

  mock.onGet("/itda/rewards").reply(() => {
    return [200, [
      { id: 1, storeName: db.stores[0]?.name, title: "무료 아메리카노 쿠폰", startDate: "2025-08-10", endDate: "2025-09-10" },
    ]];
  });

  return mock;
}
