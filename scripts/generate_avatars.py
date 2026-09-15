import os

out_dir = "D:/PericonFront/public/avatars"
os.makedirs(out_dir, exist_ok=True)

avatars = {
    "chivo.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3d210f"/>
      <stop offset="100%" stop-color="#120803"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg)" stroke="url(#gold)" stroke-width="3"/>
  <!-- Cuernos dorados -->
  <path d="M36 32 C28 15, 12 18, 16 34 C19 40, 28 38, 35 37" fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round"/>
  <path d="M64 32 C72 15, 88 18, 84 34 C81 40, 72 38, 65 37" fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round"/>
  <!-- Orejas -->
  <ellipse cx="23" cy="46" rx="9" ry="4" transform="rotate(-20 23 46)" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
  <ellipse cx="77" cy="46" rx="9" ry="4" transform="rotate(20 77 46)" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
  <!-- Cabeza -->
  <path d="M35 34 Q50 30 65 34 Q70 55 58 75 Q50 82 42 75 Q30 55 35 34 Z" fill="#92400e" stroke="#451a03" stroke-width="2"/>
  <!-- Frente blanca/mancha -->
  <path d="M46 33 Q50 32 54 33 Q55 52 50 58 Q45 52 46 33 Z" fill="#fef3c7"/>
  <!-- Ojos pícaros con pupilas horizontales de chivo -->
  <ellipse cx="40" cy="48" rx="4.5" ry="3.5" fill="#fef08a"/>
  <line x1="37" y1="48" x2="43" y2="48" stroke="#000" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="60" cy="48" rx="4.5" ry="3.5" fill="#fef08a"/>
  <line x1="57" y1="48" x2="63" y2="48" stroke="#000" stroke-width="2" stroke-linecap="round"/>
  <!-- Hocico -->
  <ellipse cx="50" cy="68" rx="8" ry="5.5" fill="#451a03"/>
  <circle cx="47" cy="67" r="1.2" fill="#000"/>
  <circle cx="53" cy="67" r="1.2" fill="#000"/>
  <!-- Barba chivo -->
  <path d="M46 76 L50 90 L54 76 Z" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <!-- Lentes de sol o estrella caroreña -->
  <polygon points="50,22 52,26 56,27 53,30 54,34 50,32 46,34 47,30 44,27 48,26" fill="url(#gold)"/>
</svg>""",

    "patron.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_p" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="100%" stop-color="#1c0a00"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_p)" stroke="url(#gold)" stroke-width="3"/>
  <!-- Rostro Don Patrón -->
  <ellipse cx="50" cy="56" rx="20" ry="22" fill="#fed7aa" stroke="#c2410c" stroke-width="1.5"/>
  <!-- Ojos -->
  <circle cx="42" cy="52" r="3" fill="#451a03"/>
  <circle cx="43" cy="51" r="1" fill="#fff"/>
  <circle cx="58" cy="52" r="3" fill="#451a03"/>
  <circle cx="59" cy="51" r="1" fill="#fff"/>
  <!-- Cejas pobladas -->
  <path d="M37 46 Q43 44 47 47" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M53 47 Q57 44 63 46" stroke="#1c1917" stroke-width="3" stroke-linecap="round" fill="none"/>
  <!-- Gran Bigote Caroreño -->
  <path d="M50 63 C42 60 30 63 26 70 C34 70 44 66 50 67 C56 66 66 70 74 70 C70 63 58 60 50 63 Z" fill="#1c1917"/>
  <!-- Nariz -->
  <path d="M48 53 Q50 60 52 53" stroke="#ea580c" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Sombrero de Don Patrón -->
  <ellipse cx="50" cy="36" rx="42" ry="12" fill="#78350f" stroke="#451a03" stroke-width="2"/>
  <path d="M28 35 C28 15 72 15 72 35 Z" fill="#92400e" stroke="#451a03" stroke-width="2"/>
  <path d="M28 35 C35 38 65 38 72 35" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <!-- Pañuelo Criollo -->
  <path d="M36 78 Q50 88 64 78 L50 94 Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1.5"/>
</svg>""",

    "llanero.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_ll" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#14532d"/>
      <stop offset="100%" stop-color="#052e16"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_ll)" stroke="url(#gold)" stroke-width="3"/>
  <!-- Rostro tostado por el sol llanero -->
  <ellipse cx="50" cy="55" rx="19" ry="21" fill="#fbbd84" stroke="#c2410c" stroke-width="1.5"/>
  <!-- Mirada astuta -->
  <ellipse cx="43" cy="51" rx="3" ry="2" fill="#1e293b"/>
  <ellipse cx="57" cy="51" rx="3" ry="2" fill="#1e293b"/>
  <!-- Sonrisa confiada -->
  <path d="M43 65 Q50 71 57 65" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <!-- Barba candado sutil -->
  <path d="M46 69 Q50 75 54 69" stroke="#451a03" stroke-width="3" stroke-linecap="round" fill="none"/>
  <!-- Sombrero de pelo de guama llanero -->
  <path d="M12 40 Q50 30 88 40 Q50 48 12 40 Z" fill="#fef3c7" stroke="#b45309" stroke-width="2"/>
  <path d="M30 36 C30 18 70 18 70 36 Z" fill="#fef08a" stroke="#b45309" stroke-width="2"/>
  <rect x="30" y="32" width="40" height="4" fill="#0284c7"/>
  <rect x="30" y="34" width="40" height="2" fill="#dc2626"/>
  <!-- Liqui-liqui blanco en cuello -->
  <path d="M35 76 L50 82 L65 76 L65 96 L35 96 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
  <circle cx="50" cy="85" r="1.5" fill="url(#gold)"/>
  <circle cx="50" cy="91" r="1.5" fill="url(#gold)"/>
</svg>""",

    "cuatrista.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_c" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#090524"/>
    </radialGradient>
    <linearGradient id="cuatro" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_c)" stroke="#fbbf24" stroke-width="3"/>
  <!-- Cuatro Criollo de Carora en primer plano -->
  <!-- Caja armónica del cuatro -->
  <ellipse cx="50" cy="62" rx="22" ry="18" fill="url(#cuatro)" stroke="#78350f" stroke-width="2"/>
  <ellipse cx="50" cy="46" rx="16" ry="13" fill="url(#cuatro)" stroke="#78350f" stroke-width="2"/>
  <!-- Boca del cuatro -->
  <circle cx="50" cy="52" r="7" fill="#1e1b4b" stroke="#78350f" stroke-width="2"/>
  <circle cx="50" cy="52" r="5.5" fill="#000"/>
  <!-- Golpeador negro tradicional -->
  <path d="M50 48 Q62 48 64 58 Q55 58 50 54 Z" fill="#000"/>
  <!-- Mástil y cuerdas -->
  <rect x="47" y="14" width="6" height="30" fill="#451a03" stroke="#291102" stroke-width="1"/>
  <!-- Clavijero -->
  <polygon points="45,8 55,8 54,16 46,16" fill="#78350f" stroke="#291102" stroke-width="1"/>
  <!-- 4 Cuerdas plateadas -->
  <line x1="48" y1="9" x2="48" y2="70" stroke="#f8fafc" stroke-width="0.8"/>
  <line x1="49.3" y1="9" x2="49.3" y2="70" stroke="#f8fafc" stroke-width="0.8"/>
  <line x1="50.7" y1="9" x2="50.7" y2="70" stroke="#f8fafc" stroke-width="0.8"/>
  <line x1="52" y1="9" x2="52" y2="70" stroke="#f8fafc" stroke-width="0.8"/>
  <!-- Notas musicales doradas -->
  <text x="18" y="32" font-size="14" fill="#fbbf24" font-weight="bold">🎵</text>
  <text x="70" y="34" font-size="14" fill="#fbbf24" font-weight="bold">🎶</text>
</svg>""",

    "reina.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_r" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#831843"/>
      <stop offset="100%" stop-color="#3b071a"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_r)" stroke="url(#gold)" stroke-width="3"/>
  <!-- Cabello ondeado -->
  <circle cx="50" cy="50" r="28" fill="#1c1917"/>
  <!-- Rostro hermosa doña -->
  <ellipse cx="50" cy="56" rx="18" ry="20" fill="#fde047" opacity="0.3"/>
  <ellipse cx="50" cy="56" rx="17" ry="19" fill="#fed7aa" stroke="#f43f5e" stroke-width="1"/>
  <!-- Ojos encantadores con pestañas -->
  <ellipse cx="43" cy="53" rx="3.5" ry="2.5" fill="#1e293b"/>
  <path d="M39 51 Q43 47 47 51" stroke="#000" stroke-width="1.8" fill="none"/>
  <ellipse cx="57" cy="53" rx="3.5" ry="2.5" fill="#1e293b"/>
  <path d="M53 51 Q57 47 61 51" stroke="#000" stroke-width="1.8" fill="none"/>
  <!-- Labios carmesí -->
  <path d="M45 66 Q50 69 55 66 Q50 72 45 66 Z" fill="#e11d48"/>
  <!-- Corona Real de Oro -->
  <polygon points="32,36 36,20 43,28 50,15 57,28 64,20 68,36" fill="url(#gold)" stroke="#b45309" stroke-width="1.5"/>
  <circle cx="50" cy="15" r="2.5" fill="#38bdf8"/>
  <circle cx="36" cy="20" r="2" fill="#ec4899"/>
  <circle cx="64" cy="20" r="2" fill="#ec4899"/>
  <!-- Zarcillos de perla -->
  <circle cx="31" cy="58" r="2.5" fill="#fff" stroke="url(#gold)" stroke-width="1"/>
  <circle cx="69" cy="58" r="2.5" fill="#fff" stroke="url(#gold)" stroke-width="1"/>
</svg>""",

    "diablo.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_d" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#450a0a"/>
      <stop offset="100%" stop-color="#1c0303"/>
    </radialGradient>
    <linearGradient id="flame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_d)" stroke="#ef4444" stroke-width="3"/>
  <!-- Cuernos afilados de diablo danzante -->
  <path d="M34 32 C26 12 18 10 16 6 C24 16 34 22 36 34 Z" fill="url(#flame)" stroke="#991b1b" stroke-width="1"/>
  <path d="M66 32 C74 12 82 10 84 6 C76 16 66 22 64 34 Z" fill="url(#flame)" stroke="#991b1b" stroke-width="1"/>
  <!-- Máscara roja tradicional -->
  <path d="M30 35 Q50 30 70 35 Q74 65 50 82 Q26 65 30 35 Z" fill="#b91c1c" stroke="#450a0a" stroke-width="2.5"/>
  <!-- Ojos brillantes misteriosos -->
  <polygon points="36,46 47,50 38,54" fill="#fbbf24"/>
  <polygon points="64,46 53,50 62,54" fill="#fbbf24"/>
  <!-- Dientes afilados / Colmillos de triunfo -->
  <path d="M38 65 Q50 62 62 65 Q50 74 38 65 Z" fill="#000"/>
  <polygon points="42,64 45,69 47,64" fill="#fff"/>
  <polygon points="53,64 55,69 58,64" fill="#fff"/>
  <!-- Bigotes llameantes -->
  <path d="M32 60 Q20 62 16 68 Q24 67 32 63" stroke="#f97316" stroke-width="2" fill="none"/>
  <path d="M68 60 Q80 62 84 68 Q76 67 68 63" stroke="#f97316" stroke-width="2" fill="none"/>
</svg>""",

    "gavilan.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#091238"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_g)" stroke="url(#gold)" stroke-width="3"/>
  <!-- Plumaje de la cabeza -->
  <path d="M26 48 C26 22 74 22 74 48 Q78 72 50 82 Q22 72 26 48 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M50 18 L53 26 L50 24 L47 26 Z" fill="#e2e8f0"/>
  <!-- Ojos rapaces amarillos -->
  <circle cx="38" cy="46" r="6" fill="#eab308"/>
  <circle cx="38" cy="46" r="3.5" fill="#000"/>
  <circle cx="37" cy="45" r="1.2" fill="#fff"/>
  <circle cx="62" cy="46" r="6" fill="#eab308"/>
  <circle cx="62" cy="46" r="3.5" fill="#000"/>
  <circle cx="61" cy="45" r="1.2" fill="#fff"/>
  <!-- Pico curvo de gavilán -->
  <path d="M45 52 Q50 50 55 52 L53 68 C51 72 49 72 47 68 Z" fill="url(#gold)" stroke="#854d0e" stroke-width="2"/>
  <circle cx="48" cy="55" r="1" fill="#000"/>
  <circle cx="52" cy="55" r="1" fill="#000"/>
</svg>""",

    "caballo.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_cb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#022c22"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_cb)" stroke="url(#gold)" stroke-width="3"/>
  <!-- Crin negra elegante -->
  <path d="M38 18 C30 25 24 45 28 65 C22 55 24 35 34 22 Z" fill="#1c1917"/>
  <!-- Orejas -->
  <polygon points="40,24 43,14 47,22" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <polygon points="50,22 54,12 57,20" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
  <!-- Cabeza de corcel criollo -->
  <path d="M42 22 Q58 20 62 38 L68 62 Q64 74 52 74 L42 56 Q36 40 42 22 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
  <!-- Ojo noble -->
  <ellipse cx="50" cy="38" rx="4" ry="5" fill="#1e293b"/>
  <circle cx="49" cy="36" r="1.5" fill="#fff"/>
  <!-- Hocico y belfos -->
  <ellipse cx="60" cy="67" rx="5" ry="4" fill="#cbd5e1"/>
  <ellipse cx="61" cy="67" rx="2" ry="2" fill="#0f172a"/>
  <!-- Brida dorada llanera -->
  <line x1="42" y1="42" x2="60" y2="67" stroke="url(#gold)" stroke-width="2.5"/>
  <circle cx="48" cy="50" r="3" fill="url(#gold)"/>
</svg>""",

    "leon.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_l" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="100%" stop-color="#2a0d05"/>
    </radialGradient>
    <linearGradient id="mane" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_l)" stroke="#f59e0b" stroke-width="3"/>
  <!-- Melena majestuosa de león -->
  <circle cx="50" cy="50" r="32" fill="url(#mane)" stroke="#451a03" stroke-width="2"/>
  <!-- Rostro -->
  <ellipse cx="50" cy="52" rx="20" ry="18" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
  <!-- Orejas redondas -->
  <circle cx="34" cy="32" r="6" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
  <circle cx="34" cy="32" r="3.5" fill="#fde68a"/>
  <circle cx="66" cy="32" r="6" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
  <circle cx="66" cy="32" r="3.5" fill="#fde68a"/>
  <!-- Ojos feroces -->
  <polygon points="40,46 46,48 41,51" fill="#78350f"/>
  <circle cx="43" cy="48" r="1.5" fill="#000"/>
  <polygon points="60,46 54,48 59,51" fill="#78350f"/>
  <circle cx="57" cy="48" r="1.5" fill="#000"/>
  <!-- Nariz triangular -->
  <polygon points="46,55 54,55 50,60" fill="#78350f"/>
  <!-- Bigotera y hocico -->
  <path d="M44 61 Q50 63 56 61 Q50 67 44 61 Z" fill="#fff"/>
  <line x1="38" y1="58" x2="30" y2="57" stroke="#78350f" stroke-width="1.5"/>
  <line x1="62" y1="58" x2="70" y2="57" stroke="#78350f" stroke-width="1.5"/>
</svg>""",

    "buho.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg_b" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg_b)" stroke="#38bdf8" stroke-width="3"/>
  <!-- Penachos de orejas -->
  <polygon points="32,24 40,36 28,38" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
  <polygon points="68,24 60,36 72,38" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Cuerpo del Búho -->
  <ellipse cx="50" cy="56" rx="26" ry="24" fill="#64748b" stroke="#334155" stroke-width="2"/>
  <!-- Grandes Ojos hipnóticos de estratega -->
  <circle cx="39" cy="48" r="11" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
  <circle cx="39" cy="48" r="6" fill="#0f172a"/>
  <circle cx="37" cy="46" r="2" fill="#fff"/>
  <circle cx="61" cy="48" r="11" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
  <circle cx="61" cy="48" r="6" fill="#0f172a"/>
  <circle cx="59" cy="46" r="2" fill="#fff"/>
  <!-- Pico -->
  <polygon points="47,54 53,54 50,62" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>
  <!-- Plumaje en pecho (como naipes) -->
  <path d="M42 66 Q50 70 58 66" stroke="#94a3b8" stroke-width="2" fill="none"/>
  <path d="M45 71 Q50 75 55 71" stroke="#94a3b8" stroke-width="2" fill="none"/>
</svg>"""
}

for fname, content in avatars.items():
    path = os.path.join(out_dir, fname)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"Created {path}")

print("All 10 avatars generated successfully!")
