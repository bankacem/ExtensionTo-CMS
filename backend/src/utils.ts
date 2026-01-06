
const hashString = (str: string): number => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) + hash) + char;
    }
    return hash;
  };

  const dbInstances = ['DB_1', 'DB_2', 'DB_3'];

  export const getDbForSlug = (slug: string) => {
    const hash = hashString(slug);
    const index = Math.abs(hash) % dbInstances.length;
    return dbInstances[index];
  };
