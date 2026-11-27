
import { useCallback, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

import {
  ExternalLink,
  Crosshair,
  MapPin,
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import './LocationMap.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

/*
 * Fallback map center for manual location selection.
 * This is NOT the user's detected location.
 * The user must select a location before it is submitted.
 */
const FALLBACK_CENTER = [9.5916, 76.5222];
const INITIAL_ZOOM = 13;
const SELECTED_LOCATION_ZOOM = 16;

/* --------------------------------------------------
   LEAFLET MARKER CONFIGURATION
-------------------------------------------------- */

const civicFixMarker = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* --------------------------------------------------
   VALIDATE COORDINATES
-------------------------------------------------- */

function getValidCoordinates(latitude, longitude) {
  if (
    latitude === '' ||
    longitude === '' ||
    latitude === null ||
    longitude === null ||
    latitude === undefined ||
    longitude === undefined
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
}

/* --------------------------------------------------
   HANDLE MAP CLICKS
-------------------------------------------------- */

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

/* --------------------------------------------------
   UPDATE MAP POSITION
-------------------------------------------------- */

function MapPositionUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) {
      return;
    }

    const currentCenter = map.getCenter();

    const sameCenter =
      Math.abs(currentCenter.lat - center[0]) < 0.000001 &&
      Math.abs(currentCenter.lng - center[1]) < 0.000001;

    if (!sameCenter) {
      map.flyTo(center, Math.max(map.getZoom(), SELECTED_LOCATION_ZOOM), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [center, map]);

  return null;
}

/* --------------------------------------------------
   MAIN LOCATION MAP COMPONENT
-------------------------------------------------- */

export default function LocationMap({
  latitude,
  longitude,
  title = 'Selected location',
  onCoordinateChange,
}) {
  const center = getValidCoordinates(latitude, longitude);

  /*
   * Always provide a valid map center.
   * When coordinates are unavailable, show the fallback
   * map so the user can manually select a location.
   */
  const mapCenter = center || FALLBACK_CENTER;

  const updateCoordinate = useCallback(
    (field, value) => {
      if (typeof onCoordinateChange === 'function') {
        onCoordinateChange(field, value);
      }
    },
    [onCoordinateChange]
  );

  /* --------------------------------------------------
     UPDATE COORDINATES AFTER MAP CLICK
  -------------------------------------------------- */

  const handleMapPick = useCallback(
    (lat, lng) => {
      updateCoordinate('latitude', lat.toFixed(6));
      updateCoordinate('longitude', lng.toFixed(6));
    },
    [updateCoordinate]
  );

  /* --------------------------------------------------
     EXTERNAL OPENSTREETMAP LINK
  -------------------------------------------------- */

  const openMapUrl = center
    ? `https://www.openstreetmap.org/?mlat=${center[0]}&mlon=${center[1]}#map=17/${center[0]}/${center[1]}`
    : 'https://www.openstreetmap.org/';

  /* --------------------------------------------------
     RENDER COMPONENT
  -------------------------------------------------- */

  return (
    <div className="cfx-map-wrap">
      {/* MAP HEADER */}

      <div className="cfx-map-heading">
        <span>
          <MapPin size={16} />
          {title}
        </span>

        <a
          href={openMapUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open interactive map
          <ExternalLink size={13} />
        </a>
      </div>

      {/* MAP
          Always render the map, even without coordinates.
      */}

      <div
        className="cfx-click-map"
        style={{
          height: 320,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <MapContainer
          key="civicfix-location-map"
          center={mapCenter}
          zoom={center ? SELECTED_LOCATION_ZOOM : INITIAL_ZOOM}
          minZoom={3}
          maxZoom={19}
          scrollWheelZoom={true}
          style={{
            height: '100%',
            width: '100%',
            background: '#e8edf3',
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            minZoom={3}
            maxZoom={19}
            keepBuffer={4}
          />

          <MapPositionUpdater center={center} />

          <MapClickHandler onPick={handleMapPick} />

          {/* Show a marker only for valid selected coordinates. */}

          {center && (
            <Marker
              position={center}
              icon={civicFixMarker}
            />
          )}
        </MapContainer>
      </div>

      {/* MAP INSTRUCTIONS */}

      {center ? (
        <p className="cfx-map-note">
          The marker follows the selected coordinates.
          Click the map to correct the location if necessary.
        </p>
      ) : (
        <div className="cfx-map-empty">
          <MapPin size={22} />

          <span>
            Your current location has not been selected.
            Click directly on the map to select the complaint
            location, or use the location button above to try
            automatic detection again.
          </span>
        </div>
      )}

      {/* COORDINATE EDITOR */}

      {typeof onCoordinateChange === 'function' && (
        <div className="cfx-coordinate-editor">
          <div className="cfx-coordinate-editor-title">
            <Crosshair size={15} />
            Correct your location
          </div>

          <label>
            Latitude

            <input
              type="number"
              min="-90"
              max="90"
              step="any"
              value={latitude ?? ''}
              onChange={(event) =>
                updateCoordinate('latitude', event.target.value)
              }
              placeholder="Enter latitude"
            />
          </label>

          <label>
            Longitude

            <input
              type="number"
              min="-180"
              max="180"
              step="any"
              value={longitude ?? ''}
              onChange={(event) =>
                updateCoordinate('longitude', event.target.value)
              }
              placeholder="Enter longitude"
            />
          </label>

          <div className="cfx-coordinate-values">
            <p>
              <strong>Selected latitude:</strong>{' '}
              {center ? center[0].toFixed(6) : 'Not selected'}
            </p>

            <p>
              <strong>Selected longitude:</strong>{' '}
              {center ? center[1].toFixed(6) : 'Not selected'}
            </p>
          </div>
        </div>
      )}

      {/* LOCATION ACCURACY NOTICE */}

      <p className="cfx-map-note">
        Browser location accuracy depends on your device and
        location provider. Verify the marker before submitting.
      </p>
    </div>
  );
}

