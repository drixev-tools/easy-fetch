// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./index.ts'],
  format: ['esm', 'cjs'],
  minify: true,
  clean: true,
  dts: true, // si quieres incluir archivos .d.ts
  splitting: false, // desactiva code-splitting si es una librería
  sourcemap: false, // desactiva si no necesitas mapas de fuente
  target: 'es2020', // más moderno = menos código
  external: ['lodash'],
  outDir: 'dist', // directorio de salida
});
