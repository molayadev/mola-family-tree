export const generateId = () => {
  const array = new Uint8Array(7);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(36).padStart(2, '0')).join('').slice(0, 9);
};

export function createNode({
  id,
  x,
  y,
  firstName,
  lastName,
  gender,
  birthDate,
  birthTime,
  deathDate,
  ascendantSign,
  sunSign,
  moonSign,
  twinType,
  birthOrder,
  birthLatitude,
  birthLongitude,
  additionalInfo,
}) {
  return {
    id: id || generateId(),
    x: x || 0,
    y: y || 0,
    data: {
      firstName: firstName || '',
      lastName: lastName || '',
      gender: gender || 'unknown',
      birthDate: birthDate || '',
      birthTime: birthTime || '',
      deathDate: deathDate || '',
      ascendantSign: ascendantSign || '',
      sunSign: sunSign || '',
      moonSign: moonSign || '',
      twinType: twinType || '',
      birthOrder: birthOrder || '',
      birthLatitude: birthLatitude || '',
      birthLongitude: birthLongitude || '',
      additionalInfo: additionalInfo || '',
    },
  };
}
