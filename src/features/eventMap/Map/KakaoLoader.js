// src/features/eventMap/map/KakaoLoader.js
let kakaoLoadingPromise = null;

export default function loadKakaoMaps(appKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao SDK must run in browser"));
  }
  if (window.kakao?.maps) return Promise.resolve(window.kakao);
  if (kakaoLoadingPromise) return kakaoLoadingPromise;

  kakaoLoadingPromise = new Promise((resolve, reject) => {
    const scriptId = "kakao-maps-sdk";
    const existing = document.getElementById(scriptId);

    if (existing) {
      // 이미 로드 완료라면 즉시 resolve
      if (window.kakao?.maps) return resolve(window.kakao);

      // 아직 로딩 중이면 load/error 대기
      existing.addEventListener("load", () => resolve(window.kakao), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Kakao SDK(existing)")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    // https 고정 권장 (혼합콘텐츠 방지)
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services,clusterer&autoload=false`;
    script.onload = () => {
      if (!window.kakao) return reject(new Error("Kakao SDK loaded but window.kakao is undefined"));
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => reject(new Error("Failed to load Kakao SDK"));
    document.head.appendChild(script);
  });

  return kakaoLoadingPromise;
}
