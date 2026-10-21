import next from 'eslint-config-next/core-web-vitals';

const config = [...next, { ignores: ['.next/**', 'next-env.d.ts', 'src/lib/api/schema.d.ts'] }];

export default config;
