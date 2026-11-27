const LOCATION_TIMEOUT_MS = 15000;

export function getAccurateCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          'Your browser does not support location services.'
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } =
          position.coords;

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          reject(
            new Error('The device returned invalid coordinates.')
          );
          return;
        }

        resolve(position);
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Allow location access in Edge.',
          2: 'Location is unavailable. Check Windows location services.',
          3: 'Location request timed out. Please try again.',
        };

        reject(
          new Error(
            messages[error.code] ||
              'Unable to retrieve your current location.'
          )
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: LOCATION_TIMEOUT_MS,
      }
    );
  });
}