export const generateId = () => Math.random().toString(36).substr(2, 9);

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
