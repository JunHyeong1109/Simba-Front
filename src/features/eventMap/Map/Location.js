// src/features/eventMap/map/Location.js
export default function getCurrentLocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error("Geolocation not supported"));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess(pos.coords.latitude, pos.coords.longitude),
    (err) => {
      console.error("위치 정보 에러:", err);
      onError?.(err); // ⚠️ 실패해도 반드시 콜백 호출
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}
