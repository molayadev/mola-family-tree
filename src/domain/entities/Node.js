export const generateId = () => {
  const array = new Uint8Array(7);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(36).padStart(2, '0')).join('').slice(0, 9);
};

export function createNode({ id, x, y, firstName, lastName, gender, birthYear, deathYear, additionalInfo }) {
  return {
    id: id || generateId(),
    x: x || 0,
    y: y || 0,
    data: {
      firstName: firstName || '',
      lastName: lastName || '',
      gender: gender || 'unknown',
      birthYear: birthYear || '',
      deathYear: deathYear || '',
      additionalInfo: additionalInfo || '',
    },
  };
}
