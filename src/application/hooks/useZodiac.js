import { useCallback } from 'react';
import { MakeTime, SunPosition, EclipticGeoMoon, SiderealTime, e_tilt } from 'astronomy-engine';

/**
 * Maps an ecliptic longitude (0–360°) to its zodiac sign value.
 */
function longitudeToSign(lon) {
  const signs = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
  return signs[idx];
}

/**
 * Calculate the Sun sign from an ecliptic longitude.
 * Requires: birthDate (YYYY-MM-DD).
 * Uses noon UTC as fallback when no birth time is given.
 */
function calcSunSign(birthDate, birthTime) {
  const [y, m, d] = birthDate.split('-').map(Number);
  const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0];
  const utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const t = MakeTime(utc);
  const sun = SunPosition(t);
  return longitudeToSign(sun.elon);
}

/**
 * Calculate the Moon sign from an ecliptic longitude.
 * Requires: birthDate (YYYY-MM-DD) + birthTime (HH:mm).
 */
function calcMoonSign(birthDate, birthTime) {
  const [y, m, d] = birthDate.split('-').map(Number);
  const [hh, mm] = birthTime.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const t = MakeTime(utc);
  const moon = EclipticGeoMoon(t);
  return longitudeToSign(moon.lon);
}

/**
 * Calculate the Ascendant sign.
 * Requires: birthDate + birthTime + latitude + longitude.
 */
function calcAscendantSign(birthDate, birthTime, lat, lon) {
  const [y, m, d] = birthDate.split('-').map(Number);
  const [hh, mm] = birthTime.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const t = MakeTime(utc);

  const obliquity = e_tilt(t);
  const oblRad = obliquity.mobl * Math.PI / 180;

  const gmst = SiderealTime(t); // hours
  const lst = gmst + lon / 15;  // local sidereal time in hours
  const ramcRad = (lst * 15) * Math.PI / 180; // convert to degrees then radians
  const latRad = lat * Math.PI / 180;

  const ascRad = Math.atan2(
    Math.cos(ramcRad),
    -(Math.sin(ramcRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad)),
  );
  let ascDeg = ascRad * 180 / Math.PI;
  if (ascDeg < 0) ascDeg += 360;

  return longitudeToSign(ascDeg);
}

/**
 * React hook that exposes a function to auto-calculate zodiac signs.
 *
 * Returns `{ calculateZodiac }` where `calculateZodiac(formData)` returns
 * `{ sunSign, moonSign, ascendantSign, errors }`.
 *
 * `errors` is an array of human-readable strings describing what is missing
 * for each sign that could NOT be computed.
 */
export default function useZodiac() {
  const calculateZodiac = useCallback((formData) => {
    const { birthDate, birthTime, birthLatitude, birthLongitude } = formData;
    const errors = [];
    let sunSign = '';
    let moonSign = '';
    let ascendantSign = '';

    const hasDate = Boolean(birthDate);
    const hasTime = Boolean(birthTime);
    const hasLocation = birthLatitude !== '' && birthLatitude !== undefined && birthLatitude !== null
      && birthLongitude !== '' && birthLongitude !== undefined && birthLongitude !== null;

    // Sun sign – needs date
    if (hasDate) {
      sunSign = calcSunSign(birthDate, birthTime);
    } else {
      errors.push('Sol: se requiere la fecha de nacimiento.');
    }

    // Moon sign – needs date + time
    if (hasDate && hasTime) {
      moonSign = calcMoonSign(birthDate, birthTime);
    } else {
      errors.push('Luna: se requiere la fecha y hora de nacimiento.');
    }

    // Ascendant – needs date + time + location
    if (hasDate && hasTime && hasLocation) {
      ascendantSign = calcAscendantSign(
        birthDate, birthTime,
        Number(birthLatitude), Number(birthLongitude),
      );
    } else {
      errors.push('Ascendente: se requiere fecha, hora y localización (latitud, longitud).');
    }

    return { sunSign, moonSign, ascendantSign, errors };
  }, []);

  return { calculateZodiac };
}
