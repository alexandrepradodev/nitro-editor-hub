export default function LoginSpaceBackdrop() {
  return (
    <div className="login-space-backdrop" aria-hidden="true">
      <div className="login-space-decor login-space-decor--ufo login-space-decor--ufo-a">
        <svg viewBox="0 0 120 58" className="login-space-svg" role="presentation">
          <defs>
            <linearGradient id="ufoA_rim" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#5c2dad" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#00e5ff" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#863bff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3d1f7a" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="ufoA_dome" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#47bfff" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#121224" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0a0a14" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="ufoA_dish" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#2a1f4a" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="ufoA_beam" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#863bff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="60,38 42,58 78,58" fill="url(#ufoA_beam)" />
          <ellipse cx="60" cy="32" rx="46" ry="13" fill="url(#ufoA_rim)" stroke="rgba(0,229,255,0.5)" strokeWidth="1.1" />
          <ellipse cx="60" cy="31" rx="40" ry="9" fill="url(#ufoA_dish)" opacity="0.9" />
          <ellipse cx="60" cy="24" rx="24" ry="17" fill="url(#ufoA_dome)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <ellipse cx="52" cy="22" rx="5" ry="3.5" fill="rgba(0,229,255,0.35)" />
          <ellipse cx="67" cy="21" rx="4" ry="2.8" fill="rgba(134,59,255,0.4)" />
          <path
            d="M 28 30 Q 60 24 92 30"
            fill="none"
            stroke="rgba(0,229,255,0.25)"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="login-space-decor login-space-decor--ufo login-space-decor--ufo-b">
        <svg viewBox="0 0 120 52" className="login-space-svg" role="presentation">
          <defs>
            <linearGradient id="ufoB_rim" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#863bff" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4a2a8a" stopOpacity="0.55" />
            </linearGradient>
            <radialGradient id="ufoB_dome" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#6b5a8c" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#121224" stopOpacity="0.92" />
            </radialGradient>
            <linearGradient id="ufoB_beam" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#863bff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="60,34 48,50 72,50" fill="url(#ufoB_beam)" />
          <ellipse cx="60" cy="28" rx="42" ry="11" fill="url(#ufoB_rim)" stroke="rgba(0,229,255,0.35)" strokeWidth="1" />
          <ellipse cx="60" cy="27" rx="34" ry="7.5" fill="#1a1830" stroke="rgba(134,59,255,0.3)" strokeWidth="0.8" />
          <ellipse cx="60" cy="23" rx="19" ry="13.5" fill="url(#ufoB_dome)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.9" />
          <circle cx="60" cy="21" r="3.2" fill="rgba(0,229,255,0.2)" stroke="rgba(0,229,255,0.35)" strokeWidth="0.6" />
        </svg>
      </div>
      <div className="login-space-decor login-space-decor--rocket login-space-decor--rocket-a">
        <svg viewBox="0 0 64 112" className="login-space-svg" role="presentation">
          <defs>
            <linearGradient id="rockA_body" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f0f1c" />
              <stop offset="40%" stopColor="#1c2a38" />
              <stop offset="55%" stopColor="#00e5ff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#151528" />
            </linearGradient>
            <linearGradient id="rockA_nose" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1a1a2e" />
            </linearGradient>
            <radialGradient id="rockA_win" cx="35%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#47bfff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0d3a52" stopOpacity="0.6" />
            </radialGradient>
            <linearGradient id="rockA_fin" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#863bff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1c1c30" />
            </linearGradient>
            <linearGradient id="rockA_fl_outer" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#ffb347" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ff4500" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rockA_fl_mid" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffd080" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#ff8c42" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M32 8 L40 8 L46 22 L44 52 L38 62 L38 78 L32 92 L26 78 L26 62 L20 52 L18 22 L24 8 Z"
            fill="url(#rockA_body)"
            stroke="rgba(0,229,255,0.55)"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M32 4 L38 18 L26 18 Z" fill="url(#rockA_nose)" stroke="rgba(0,229,255,0.4)" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M18 38 L8 58 L20 56 Z" fill="url(#rockA_fin)" stroke="rgba(0,229,255,0.25)" strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M46 38 L56 58 L44 56 Z" fill="url(#rockA_fin)" stroke="rgba(0,229,255,0.25)" strokeWidth="0.7" strokeLinejoin="round" />
          <ellipse cx="32" cy="32" rx="7" ry="6.5" fill="url(#rockA_win)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.9" />
          <ellipse cx="29.5" cy="30" rx="2.2" ry="1.6" fill="rgba(255,255,255,0.55)" />
          <path d="M32 70 L28 78 L32 76 L36 78 Z" fill="rgba(134,59,255,0.45)" />
          <g className="login-rocket-flame">
            <path d="M32 90 L20 112 L32 102 L44 112 Z" fill="url(#rockA_fl_outer)" />
            <path d="M32 92 L24 108 L32 100 L40 108 Z" fill="url(#rockA_fl_mid)" />
            <path d="M32 96 L28 104 L32 100 L36 104 Z" fill="#fff5e0" fillOpacity="0.75" />
          </g>
        </svg>
      </div>
      <div className="login-space-decor login-space-decor--rocket login-space-decor--rocket-b">
        <svg viewBox="0 0 64 112" className="login-space-svg login-space-svg--flip" role="presentation">
          <defs>
            <linearGradient id="rockB_body" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0f0f1c" />
              <stop offset="45%" stopColor="#2a1f3e" />
              <stop offset="55%" stopColor="#863bff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#151528" />
            </linearGradient>
            <linearGradient id="rockB_nose" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#863bff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#1a1a2e" />
            </linearGradient>
            <radialGradient id="rockB_win" cx="40%" cy="38%" r="50%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#2e1065" stopOpacity="0.7" />
            </radialGradient>
            <linearGradient id="rockB_fin" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1c1c30" />
            </linearGradient>
            <linearGradient id="rockB_fl_outer" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffb347" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#ff6b35" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ff8c00" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rockB_fl_mid" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffe566" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M32 8 L40 8 L46 22 L44 52 L38 62 L38 78 L32 92 L26 78 L26 62 L20 52 L18 22 L24 8 Z"
            fill="url(#rockB_body)"
            stroke="rgba(134,59,255,0.5)"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M32 4 L38 18 L26 18 Z" fill="url(#rockB_nose)" stroke="rgba(134,59,255,0.45)" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M18 38 L8 58 L20 56 Z" fill="url(#rockB_fin)" stroke="rgba(134,59,255,0.3)" strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M46 38 L56 58 L44 56 Z" fill="url(#rockB_fin)" stroke="rgba(134,59,255,0.3)" strokeWidth="0.7" strokeLinejoin="round" />
          <ellipse cx="32" cy="34" rx="6.5" ry="6" fill="url(#rockB_win)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.85" />
          <ellipse cx="29.5" cy="31.5" rx="1.8" ry="1.3" fill="rgba(255,255,255,0.45)" />
          <path d="M32 70 L28 78 L32 76 L36 78 Z" fill="rgba(0,229,255,0.28)" />
          <g className="login-rocket-flame">
            <path d="M32 90 L20 112 L32 102 L44 112 Z" fill="url(#rockB_fl_outer)" />
            <path d="M32 92 L24 108 L32 100 L40 108 Z" fill="url(#rockB_fl_mid)" />
            <path d="M32 96 L28 104 L32 100 L36 104 Z" fill="#fff9e6" fillOpacity="0.8" />
          </g>
        </svg>
      </div>
      <div className="login-space-decor login-space-decor--sat login-space-decor--sat-a">
        <svg viewBox="0 0 110 44" className="login-space-svg" role="presentation">
          <defs>
            <linearGradient id="satA_body" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#16162a" />
              <stop offset="50%" stopColor="#1e3044" />
              <stop offset="100%" stopColor="#141420" />
            </linearGradient>
            <linearGradient id="satA_panel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2d2650" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1a1530" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path
            d="M55 6 L55 12"
            stroke="rgba(0,229,255,0.45)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="55" cy="4" r="2.5" fill="#1a1a2e" stroke="rgba(0,229,255,0.5)" strokeWidth="0.9" />
          <rect x="43" y="13" width="24" height="14" rx="2.5" fill="url(#satA_body)" stroke="rgba(0,229,255,0.45)" strokeWidth="1" />
          <rect x="5" y="16" width="34" height="8" rx="1.2" fill="url(#satA_panel)" stroke="rgba(134,59,255,0.4)" strokeWidth="0.85" />
          <line x1="8" y1="18.5" x2="36" y2="18.5" stroke="rgba(0,229,255,0.12)" strokeWidth="0.6" />
          <line x1="8" y1="21.5" x2="36" y2="21.5" stroke="rgba(0,229,255,0.12)" strokeWidth="0.6" />
          <line x1="14" y1="16" x2="14" y2="24" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="22" y1="16" x2="22" y2="24" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="30" y1="16" x2="30" y2="24" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <rect x="71" y="16" width="34" height="8" rx="1.2" fill="url(#satA_panel)" stroke="rgba(134,59,255,0.4)" strokeWidth="0.85" />
          <line x1="74" y1="18.5" x2="102" y2="18.5" stroke="rgba(0,229,255,0.12)" strokeWidth="0.6" />
          <line x1="74" y1="21.5" x2="102" y2="21.5" stroke="rgba(0,229,255,0.12)" strokeWidth="0.6" />
          <line x1="80" y1="16" x2="80" y2="24" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="88" y1="16" x2="88" y2="24" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="96" y1="16" x2="96" y2="24" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <path
            d="M55 27 L55 34"
            stroke="rgba(0,229,255,0.35)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="login-space-decor login-space-decor--sat login-space-decor--sat-b">
        <svg viewBox="0 0 110 44" className="login-space-svg" role="presentation">
          <defs>
            <linearGradient id="satB_body" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1f1836" />
              <stop offset="100%" stopColor="#121224" />
            </linearGradient>
            <radialGradient id="satB_dish" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#47bfff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1a1a2e" stopOpacity="0.9" />
            </radialGradient>
          </defs>
          <path d="M55 8 L52 14 L58 14 Z" fill="rgba(134,59,255,0.35)" stroke="rgba(0,229,255,0.3)" strokeWidth="0.7" strokeLinejoin="round" />
          <ellipse cx="55" cy="16" rx="3.5" ry="2" fill="url(#satB_dish)" stroke="rgba(0,229,255,0.35)" strokeWidth="0.6" />
          <rect x="43" y="15" width="24" height="14" rx="2.5" fill="url(#satB_body)" stroke="rgba(134,59,255,0.42)" strokeWidth="1" />
          <rect x="3" y="17" width="36" height="10" rx="1.2" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.38)" strokeWidth="0.85" />
          <line x1="6" y1="20" x2="36" y2="20" stroke="rgba(0,229,255,0.15)" strokeWidth="0.55" />
          <line x1="6" y1="23" x2="36" y2="23" stroke="rgba(0,229,255,0.15)" strokeWidth="0.55" />
          <line x1="12" y1="17" x2="12" y2="27" stroke="rgba(255,255,255,0.06)" strokeWidth="0.45" />
          <line x1="22" y1="17" x2="22" y2="27" stroke="rgba(255,255,255,0.06)" strokeWidth="0.45" />
          <line x1="32" y1="17" x2="32" y2="27" stroke="rgba(255,255,255,0.06)" strokeWidth="0.45" />
          <rect x="71" y="17" width="36" height="10" rx="1.2" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.38)" strokeWidth="0.85" />
          <line x1="74" y1="20" x2="104" y2="20" stroke="rgba(0,229,255,0.15)" strokeWidth="0.55" />
          <line x1="74" y1="23" x2="104" y2="23" stroke="rgba(0,229,255,0.15)" strokeWidth="0.55" />
          <circle cx="55" cy="22" r="2" fill="rgba(0,229,255,0.15)" stroke="rgba(0,229,255,0.35)" strokeWidth="0.5" />
        </svg>
      </div>
      <div className="login-space-decor login-space-decor--alien">
        <svg viewBox="0 0 80 108" className="login-space-svg" role="presentation">
          <defs>
            <radialGradient id="alien_skin" cx="30%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#6b9080" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#3d5a52" stopOpacity="1" />
              <stop offset="100%" stopColor="#243330" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="alien_eye" x1="30%" y1="20%" x2="70%" y2="80%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="45%" stopColor="#0a1620" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <ellipse cx="40" cy="28" rx="22" ry="28" fill="url(#alien_skin)" stroke="rgba(0,229,255,0.25)" strokeWidth="1" />
          <path
            d="M22 26 Q18 35 24 42 Q28 36 26 30 Z"
            fill="rgba(45,62,58,0.95)"
            stroke="rgba(0,229,255,0.2)"
            strokeWidth="0.8"
          />
          <path
            d="M58 26 Q62 35 56 42 Q52 36 54 30 Z"
            fill="rgba(45,62,58,0.95)"
            stroke="rgba(0,229,255,0.2)"
            strokeWidth="0.8"
          />
          <ellipse cx="30" cy="30" rx="10" ry="13" fill="url(#alien_eye)" stroke="rgba(134,59,255,0.35)" strokeWidth="0.9" />
          <ellipse cx="50" cy="30" rx="10" ry="13" fill="url(#alien_eye)" stroke="rgba(134,59,255,0.35)" strokeWidth="0.9" />
          <ellipse cx="28" cy="28" rx="4" ry="5.5" fill="#0d1820" />
          <ellipse cx="52" cy="28" rx="4" ry="5.5" fill="#0d1820" />
          <ellipse cx="26.5" cy="26" rx="1.6" ry="2" fill="rgba(255,255,255,0.85)" />
          <ellipse cx="50.5" cy="26" rx="1.6" ry="2" fill="rgba(255,255,255,0.85)" />
          <ellipse cx="30" cy="35" rx="2" ry="1.2" fill="rgba(0,229,255,0.15)" />
          <path
            d="M40 52 Q28 58 26 72 Q32 70 38 68 Q40 62 40 56 Q42 62 42 68 Q48 70 54 72 Q52 58 40 52 Z"
            fill="url(#alien_skin)"
            stroke="rgba(0,229,255,0.22)"
            strokeWidth="0.95"
            strokeLinejoin="round"
          />
          <ellipse cx="40" cy="88" rx="14" ry="4" fill="rgba(0,229,255,0.06)" />
          <path
            d="M26 62 L16 78 L22 76 L26 68 Z"
            fill="rgba(55,75,70,0.9)"
            stroke="rgba(134,59,255,0.25)"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          <path
            d="M54 62 L64 78 L58 76 L54 68 Z"
            fill="rgba(55,75,70,0.9)"
            stroke="rgba(134,59,255,0.25)"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
