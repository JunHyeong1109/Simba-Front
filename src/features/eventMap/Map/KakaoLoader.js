let kakaoLoadingPromise = null;

function loadKakaoMaps(appKey) {
  if (window.kakao && window.kakao.maps) return Promise.resolve(window.kakao);
  if (kakaoLoadingPromise) return kakaoLoadingPromise;

  kakaoLoadingPromise = new Promise((resolve, reject) => {
    const scriptId = "kakao-maps-sdk";
    if (document.getElementById(scriptId)) {
      document.getElementById(scriptId).addEventListener("load", () => resolve(window.kakao), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.onload = () => {
      if (!window.kakao) return reject(new Error("Kakao SDK loaded but window.kakao is undefined"));
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => reject(new Error("Failed to load Kakao SDK"));
    document.head.appendChild(script);
  });

  return kakaoLoadingPromise;
}

export default loadKakaoMaps;