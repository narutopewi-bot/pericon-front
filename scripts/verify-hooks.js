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

const FORBIDDEN_SECURITY_PATTERNS = [
  { pattern: /Steven\.09/, desc: "Contraseña maestra Steven.09 detectada en el cliente" },
  { pattern: /Guardian\.2026/, desc: "Contraseña maestra legacy detectada en el cliente" },
  { pattern: /Guardian_SecKey/, desc: "Clave secreta HMAC del servidor detectada en el cliente" },
  { pattern: /password:\s*["'][^"']+["']/, desc: "Contraseña estática quemada en el código del frontend" }
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

        // 1. Escaneo de Reglas de Hooks de React
        for (const pattern of HOOK_PATTERNS) {
          if (pattern.test(line)) {
            if (depth > 1) {
              console.error(`\x1b[31m[ERROR VIOLACIÓN DE HOOKS]\x1b[0m ${fullPath}:${i + 1}`);
              console.error(`  --> Llamada a hook detectada dentro de un bloque anidado (Profundidad: ${depth}):`);
              console.error(`      ${line.trim()}`);
              console.error(`  \x1b[33m¡Regla de React violada! Los hooks NUNCA deben llamarse dentro de callbacks o condiciones.\x1b[0m\n`);
              hasErrors = true;
            }
          }
        }

        // 2. Escaneo Estricto de Ciberseguridad (Zero Hardcoded Secrets)
        for (const sec of FORBIDDEN_SECURITY_PATTERNS) {
          if (sec.pattern.test(line)) {
            console.error(`\x1b[41m\x1b[37m[ERROR CRÍTICO DE SEGURIDAD]\x1b[0m ${fullPath}:${i + 1}`);
            console.error(`  --> ${sec.desc}:`);
            console.error(`      ${line.trim()}`);
            console.error(`  \x1b[33m¡Regla de Seguridad violada! CERO credenciales o secretos en el código frontend.\x1b[0m\n`);
            hasErrors = true;
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

console.log('🔍 [Guardián de Integridad & Seguridad] Verificando Código Frontend...');
const srcDir = path.join(__dirname, '..', 'src');
const failed = scanDirectory(srcDir);

if (failed) {
  console.error('\x1b[41m\x1b[37m ERROR CRÍTICO: Violación de Integridad o Seguridad detectada. Compilación cancelada de inmediato. \x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✔ [Guardián de Integridad & Seguridad] 100% Blindado: Cero secretos expuestos y Hooks en regla.\x1b[0m\n');
  process.exit(0);
}
