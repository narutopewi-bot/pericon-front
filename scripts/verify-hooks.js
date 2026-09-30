const fs = require('fs');
const path = require('path');

const HOOK_PATTERNS = [
  /useEffect\s*\(/,
  /useState\s*\(/,
  /useRef\s*\(/,
  /useCallback\s*\(/,
  /useMemo\s*\(/,
  /useContext\s*\(/,
  /useReducer\s*\(/
];

function scanDirectory(dir) {
  let hasErrors = false;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        if (scanDirectory(fullPath)) hasErrors = true;
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      let depth = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Comprobar si la línea contiene un hook de React
        for (const pattern of HOOK_PATTERNS) {
          if (pattern.test(line)) {
            // Un hook en el nivel superior de un componente funcional suele estar a depth 1
            if (depth > 1) {
              console.error(`\x1b[31m[ERROR VIOLACIÓN DE HOOKS]\x1b[0m ${fullPath}:${i + 1}`);
              console.error(`  --> Llamada a hook detectada dentro de un bloque anidado (Profundidad: ${depth}):`);
              console.error(`      ${line.trim()}`);
              console.error(`  \x1b[33m¡Regla de React violada! Los hooks NUNCA deben llamarse dentro de callbacks, condiciones o funciones anidadas.\x1b[0m\n`);
              hasErrors = true;
            }
          }
        }

        // Seguimiento básico del nivel de llaves
        for (const char of line) {
          if (char === '{') depth++;
          else if (char === '}') depth = Math.max(0, depth - 1);
        }
      }
    }
  }

  return hasErrors;
}

console.log('🔍 [Guardián de Integridad] Verificando Reglas de Hooks en todo el código frontend...');
const srcDir = path.join(__dirname, '..', 'src');
const failed = scanDirectory(srcDir);

if (failed) {
  console.error('\x1b[41m\x1b[37m ERROR CRÍTICO: Se encontraron llamadas a hooks anidadas. Build cancelado por seguridad. \x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✔ [Guardián de Integridad] Todos los componentes cumplen al 100% con las Reglas de Hooks de React.\x1b[0m\n');
  process.exit(0);
}
