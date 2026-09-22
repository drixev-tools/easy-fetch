// esbuild.js
import { build, context } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rmSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const tscPath = require.resolve('typescript/bin/tsc');

const watch = process.argv.includes('--watch');
const outdir = 'dist';

const sharedOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  treeShaking: true,
  sourcemap: false,
  target: 'es2020',
  legalComments: 'none',
  platform: 'neutral',
};

// package.json has "type": "module", so under moduleResolution node16/nodenext
// a plain sibling .d.ts is ESM-format by default. A require()'d .d.cts entry
// point can't import those directly, so we mirror every .d.ts into a .d.cts
// sibling with relative specifiers repointed at .cjs, which TS resolves to the
// mirrored (CJS-format) declaration file instead.
function mirrorDeclarationsAsCjs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      mirrorDeclarationsAsCjs(fullPath);
    } else if (entry.name.endsWith('.d.ts')) {
      const content = readFileSync(fullPath, 'utf8');
      const cjsContent = content.replace(
        /(\b(?:from|import)\s*\(?\s*['"])(\.[^'"]+?)\.js(['"])/g,
        '$1$2.cjs$3',
      );
      writeFileSync(fullPath.replace(/\.d\.ts$/, '.d.cts'), cjsContent);
    }
  }
}

function emitTypes() {
  execFileSync(
    process.execPath,
    [tscPath, '--emitDeclarationOnly', '--declaration', '--outDir', outdir],
    { stdio: 'inherit' },
  );
  mirrorDeclarationsAsCjs(outdir);
}

if (watch) {
  const esmCtx = await context({
    ...sharedOptions,
    format: 'esm',
    outfile: `${outdir}/index.js`,
  });
  const cjsCtx = await context({
    ...sharedOptions,
    format: 'cjs',
    outfile: `${outdir}/index.cjs`,
  });

  emitTypes();
  await Promise.all([esmCtx.watch(), cjsCtx.watch()]);
  console.log('Watching for changes...');
} else {
  rmSync(outdir, { recursive: true, force: true });

  await Promise.all([
    build({ ...sharedOptions, format: 'esm', outfile: `${outdir}/index.js` }),
    build({
      ...sharedOptions,
      format: 'cjs',
      outfile: `${outdir}/index.cjs`,
    }),
  ]);

  emitTypes();
}
