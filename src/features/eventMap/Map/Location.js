function getCurrentLocation(callback) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      callback(lat, lng);
    },
    (error) => {
      console.error("위치 정보 에러:", error);
    }
  );
}

export default getCurrentLocation;