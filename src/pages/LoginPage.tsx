import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { callEdgeFunction } from '@/lib/edgeFunctions';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'setup';

function friendlyLoginError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('banned')) {
    return 'Your account has been deactivated. Contact your admin to reactivate it.';
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Wrong email or password. Check and try again.';
  }
  if (lower.includes('fetch') || lower.includes('network')) {
    return 'Network connection problem. Check your internet connection and try again.';
  }
  return 'Unable to sign in. Check your email and password, then try again.';
}

/**
 * Full-screen illustrated Chennai skyline & Marina Beach sunset/night landscape
 * Rendered purely in responsive vector SVG with layered silhouettes and water reflection.
 */
function ChennaiBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. LIGHT MODE: SUNSET OVER CHENNAI (MARINA BEACH, GOPURAM, LIGHTHOUSE) */}
      {/* ------------------------------------------------------------- */}
      <svg
        className="w-full h-full object-cover dark:hidden"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Sunset Sky Gradient */}
          <linearGradient id="sunsetSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e0b36" />
            <stop offset="28%" stopColor="#4a126d" />
            <stop offset="52%" stopColor="#8c1d6b" />
            <stop offset="72%" stopColor="#d93b68" />
            <stop offset="88%" stopColor="#f36c53" />
            <stop offset="100%" stopColor="#fca966" />
          </linearGradient>

          {/* Sun Halo */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff2cf" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#fdb06a" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#e84c68" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e84c68" stopOpacity="0" />
          </radialGradient>

          {/* Sea / Reflection Gradient */}
          <linearGradient id="seaReflection" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f58055" />
            <stop offset="18%" stopColor="#c73867" />
            <stop offset="45%" stopColor="#78185d" />
            <stop offset="80%" stopColor="#350b4a" />
            <stop offset="100%" stopColor="#1b0528" />
          </linearGradient>

          {/* Lighthouse Light Beam */}
          <linearGradient id="lightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fff8e7" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#ffdb8b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffb066" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dynamic Sky with subtle drifting motion */}
        <g className="animate-[pulse_10s_ease-in-out_infinite] motion-reduce:animate-none">
          <rect width="1440" height="610" fill="url(#sunsetSky)" />
          {/* Setting Sun low over Chennai horizon */}
          <circle cx="720" cy="535" r="95" fill="url(#sunGlow)" />
          <circle cx="720" cy="535" r="38" fill="#fff7e6" />
        </g>

        {/* Layer 1: Distant City Skyline (Deep Mulberry Silhouette) */}
        <path
          d="M0 610 L0 580 L40 580 L40 568 L75 568 L75 580 L140 580 L140 560 L185 560 L185 580 L280 580 L310 565 L345 565 L375 580 L460 580 L460 555 L510 555 L510 580 L620 580 L650 560 L700 560 L730 580 L880 580 L920 562 L970 562 L1010 580 L1120 580 L1150 552 L1210 552 L1240 580 L1350 580 L1380 565 L1440 565 L1440 610 Z"
          fill="#4a1555"
          opacity="0.55"
        />

        {/* Layer 2: Midground Chennai Landmarks Silhouette */}
        {/* Color: Rich Royal Plum */}
        <g fill="#2d0a3d">
          {/* Coastal embankment base */}
          <rect x="0" y="585" width="1440" height="25" />

          {/* Chennai Lighthouse (Marina Beach) at x=280..340 */}
          {/* Base & main tower shaft */}
          <polygon points="296,585 301,455 327,455 332,585" />
          {/* Observation gallery platform */}
          <rect x="294" y="448" width="39" height="7" rx="1.5" />
          {/* Lantern room */}
          <rect x="303" y="432" width="22" height="16" rx="2" />
          {/* Dome roof and lightning rod */}
          <path d="M303 432 Q314 424 325 432 Z" />
          <line x1="314" y1="424" x2="314" y2="414" stroke="#2d0a3d" strokeWidth="2.5" />

          {/* Lighthouse subtle sunset beacon beam */}
          <polygon points="314,440 640,360 670,410" fill="url(#lightBeam)" opacity="0.35" />

          {/* Kapaleeshwarar / Mylapore Hindu Temple Gopuram (x=1050..1160) */}
          {/* Tiered Dravidian pyramid tower */}
          {/* Tier 1 - Base with entrance archway cutout */}
          <path d="M1065 585 L1068 535 L1142 535 L1145 585 Z" />
          {/* Tier 2 */}
          <polygon points="1072,535 1076,495 1134,495 1138,535" />
          {/* Tier 3 */}
          <polygon points="1079,495 1083,460 1127,460 1131,495" />
          {/* Tier 4 */}
          <polygon points="1086,460 1090,430 1120,430 1124,460" />
          {/* Tier 5 (Crown) */}
          <polygon points="1092,430 1095,405 1115,405 1118,430" />
          {/* Barrel Vault Roof (Sala Shikara) */}
          <path d="M1094 405 C1094 394 1116 394 1116 405 Z" />
          {/* Kalasams (Finials on top) */}
          <line x1="1098" y1="394" x2="1098" y2="386" stroke="#2d0a3d" strokeWidth="2" />
          <line x1="1105" y1="392" x2="1105" y2="384" stroke="#2d0a3d" strokeWidth="2.5" />
          <line x1="1112" y1="394" x2="1112" y2="386" stroke="#2d0a3d" strokeWidth="2" />

          {/* Coastal pavilions, promenade structures & colonial arches */}
          <rect x="180" y="565" width="45" height="20" rx="1" />
          <path d="M185 565 Q202 548 220 565 Z" />

          <rect x="680" y="570" width="80" height="15" />
          <circle cx="720" cy="570" r="14" />

          <rect x="850" y="562" width="60" height="23" />
          <polygon points="846,562 880,544 914,562" />
        </g>

        {/* Layer 3: Foreground Shoreline & Coastal Palm Trees */}
        {/* Color: Midnight Dark Aubergine */}
        <g fill="#180424">
          {/* Curved Marina Beach shoreline */}
          <path d="M0 610 Q320 600 720 610 T1440 605 L1440 635 L0 635 Z" />

          {/* Coconut Palm 1 (Left Coast x=120) */}
          <path d="M115 615 Q125 540 148 480 Q138 540 125 615 Z" />
          {/* Palm fronds */}
          <path d="M148 480 Q110 460 75 480 Q115 470 148 480 Z" />
          <path d="M148 480 Q130 435 110 435 Q135 448 148 480 Z" />
          <path d="M148 480 Q158 430 185 435 Q165 450 148 480 Z" />
          <path d="M148 480 Q185 460 215 482 Q175 472 148 480 Z" />
          <path d="M148 480 Q160 505 185 520 Q165 500 148 480 Z" />
          <path d="M148 480 Q130 500 105 515 Q128 495 148 480 Z" />

          {/* Coconut Palm 2 (Left Coast x=160, taller) */}
          <path d="M165 615 Q180 520 205 450 Q192 525 175 615 Z" />
          <path d="M205 450 Q165 430 130 450 Q170 440 205 450 Z" />
          <path d="M205 450 Q185 405 165 408 Q190 420 205 450 Z" />
          <path d="M205 450 Q225 400 248 405 Q228 420 205 450 Z" />
          <path d="M205 450 Q245 430 278 455 Q235 442 205 450 Z" />
          <path d="M205 450 Q220 480 245 492 Q225 470 205 450 Z" />

          {/* Coconut Palm 3 (Right Coast x=1240) */}
          <path d="M1250 615 Q1235 530 1215 465 Q1225 535 1240 615 Z" />
          <path d="M1215 465 Q1175 445 1140 465 Q1180 455 1215 465 Z" />
          <path d="M1215 465 Q1195 420 1175 422 Q1200 435 1215 465 Z" />
          <path d="M1215 465 Q1230 415 1255 422 Q1235 435 1215 465 Z" />
          <path d="M1215 465 Q1255 445 1285 470 Q1245 455 1215 465 Z" />
          <path d="M1215 465 Q1230 492 1250 505 Q1230 485 1215 465 Z" />

          {/* Coconut Palm 4 (Right Coast x=1290) */}
          <path d="M1305 615 Q1295 545 1285 490 Q1290 548 1295 615 Z" />
          <path d="M1285 490 Q1250 475 1220 495 Q1255 485 1285 490 Z" />
          <path d="M1285 490 Q1275 450 1255 455 Q1275 465 1285 490 Z" />
          <path d="M1285 490 Q1305 450 1325 455 Q1305 465 1285 490 Z" />
          <path d="M1285 490 Q1320 475 1345 500 Q1310 485 1285 490 Z" />
        </g>

        {/* Layer 4: Reflective Marina Sea (Bay of Bengal) */}
        <rect x="0" y="625" width="1440" height="275" fill="url(#seaReflection)" />

        {/* Horizontal reflective wave ripples */}
        <g stroke="#ffbf80" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round">
          <line x1="680" y1="635" x2="760" y2="635" strokeWidth="2.5" strokeOpacity="0.65" />
          <line x1="640" y1="645" x2="800" y2="645" strokeWidth="2.2" strokeOpacity="0.55" />
          <line x1="600" y1="660" x2="840" y2="660" strokeWidth="2" strokeOpacity="0.5" />
          <line x1="560" y1="680" x2="880" y2="680" strokeWidth="1.8" strokeOpacity="0.45" />
          <line x1="490" y1="710" x2="950" y2="710" strokeWidth="1.5" strokeOpacity="0.38" />
          <line x1="400" y1="750" x2="1040" y2="750" strokeWidth="1.3" strokeOpacity="0.3" />
          <line x1="320" y1="800" x2="1120" y2="800" strokeWidth="1.2" strokeOpacity="0.25" />
          <line x1="200" y1="855" x2="1240" y2="855" strokeWidth="1" strokeOpacity="0.2" />

          {/* Random gentle ocean swell lines */}
          <line x1="120" y1="670" x2="260" y2="670" strokeOpacity="0.2" />
          <line x1="1160" y1="665" x2="1320" y2="665" strokeOpacity="0.2" />
          <line x1="80" y1="730" x2="220" y2="730" strokeOpacity="0.15" />
          <line x1="1200" y1="740" x2="1360" y2="740" strokeOpacity="0.15" />
        </g>
      </svg>

      {/* ------------------------------------------------------------- */}
      {/* 2. DARK MODE: NIGHT SKYLINE OVER CHENNAI (MOON & STARS)        */}
      {/* ------------------------------------------------------------- */}
      <svg
        className="w-full h-full object-cover hidden dark:block"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Night Sky Gradient */}
          <linearGradient id="nightSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#050713" />
            <stop offset="35%" stopColor="#0c1228" />
            <stop offset="65%" stopColor="#151b3d" />
            <stop offset="88%" stopColor="#1e1844" />
            <stop offset="100%" stopColor="#251648" />
          </linearGradient>

          {/* Moon Glow */}
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#dce8ff" stopOpacity="0.6" />
            <stop offset="65%" stopColor="#7a9aff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7a9aff" stopOpacity="0" />
          </radialGradient>

          {/* Night Sea Gradient */}
          <linearGradient id="nightSea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1b1c38" />
            <stop offset="30%" stopColor="#0f1124" />
            <stop offset="70%" stopColor="#080a18" />
            <stop offset="100%" stopColor="#03040c" />
          </linearGradient>

          {/* Night Lighthouse Beam */}
          <linearGradient id="nightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#b4d2ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7ca7ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Night Sky Base */}
        <rect width="1440" height="610" fill="url(#nightSky)" />

        {/* Pale Glowing Moon */}
        <circle cx="1080" cy="180" r="55" fill="url(#moonGlow)" />
        <circle cx="1080" cy="180" r="26" fill="#f4f7ff" />

        {/* Twinkling Stars (Subtle, gentle pulse, static on reduced-motion) */}
        <g fill="#FFFFFF" className="animate-[pulse_6s_ease-in-out_infinite] motion-reduce:animate-none">
          <circle cx="140" cy="95" r="1.5" opacity="0.85" />
          <circle cx="220" cy="160" r="1" opacity="0.6" />
          <circle cx="280" cy="70" r="2" opacity="0.95" />
          <circle cx="390" cy="130" r="1.5" opacity="0.75" />
          <circle cx="480" cy="85" r="1.2" opacity="0.65" />
          <circle cx="560" cy="185" r="1.8" opacity="0.9" />
          <circle cx="640" cy="90" r="1" opacity="0.5" />
          <circle cx="760" cy="140" r="2" opacity="0.95" />
          <circle cx="830" cy="75" r="1.2" opacity="0.7" />
          <circle cx="920" cy="160" r="1.5" opacity="0.8" />
          <circle cx="1200" cy="110" r="1.8" opacity="0.85" />
          <circle cx="1280" cy="70" r="1.2" opacity="0.6" />
          <circle cx="1350" cy="150" r="2" opacity="0.9" />
          <circle cx="1400" cy="80" r="1.5" opacity="0.7" />
          <circle cx="70" cy="220" r="1.2" opacity="0.65" />
          <circle cx="430" cy="240" r="1" opacity="0.55" />
          <circle cx="890" cy="230" r="1.5" opacity="0.75" />
          <circle cx="1320" cy="240" r="1.2" opacity="0.7" />
        </g>

        {/* Distant Layer (Navy Indigo Silhouette) */}
        <path
          d="M0 610 L0 580 L40 580 L40 568 L75 568 L75 580 L140 580 L140 560 L185 560 L185 580 L280 580 L310 565 L345 565 L375 580 L460 580 L460 555 L510 555 L510 580 L620 580 L650 560 L700 560 L730 580 L880 580 L920 562 L970 562 L1010 580 L1120 580 L1150 552 L1210 552 L1240 580 L1350 580 L1380 565 L1440 565 L1440 610 Z"
          fill="#111630"
          opacity="0.65"
        />

        {/* Midground Chennai Landmarks (Dark Midnight Silhouette) */}
        <g fill="#0b0e20">
          <rect x="0" y="585" width="1440" height="25" />

          {/* Chennai Lighthouse */}
          <polygon points="296,585 301,455 327,455 332,585" />
          <rect x="294" y="448" width="39" height="7" rx="1.5" />
          <rect x="303" y="432" width="22" height="16" rx="2" />
          <path d="M303 432 Q314 424 325 432 Z" />
          <line x1="314" y1="424" x2="314" y2="414" stroke="#0b0e20" strokeWidth="2.5" />

          {/* Night Lighthouse Beam sweeping across the sky */}
          <polygon points="314,440 780,310 820,380" fill="url(#nightBeam)" opacity="0.45" />

          {/* Kapaleeshwarar Temple Gopuram */}
          <path d="M1065 585 L1068 535 L1142 535 L1145 585 Z" />
          <polygon points="1072,535 1076,495 1134,495 1138,535" />
          <polygon points="1079,495 1083,460 1127,460 1131,495" />
          <polygon points="1086,460 1090,430 1120,430 1124,460" />
          <polygon points="1092,430 1095,405 1115,405 1118,430" />
          <path d="M1094 405 C1094 394 1116 394 1116 405 Z" />
          <line x1="1098" y1="394" x2="1098" y2="386" stroke="#0b0e20" strokeWidth="2" />
          <line x1="1105" y1="392" x2="1105" y2="384" stroke="#0b0e20" strokeWidth="2.5" />
          <line x1="1112" y1="394" x2="1112" y2="386" stroke="#0b0e20" strokeWidth="2" />

          {/* Coastal Promenade Silhouettes */}
          <rect x="180" y="565" width="45" height="20" rx="1" />
          <path d="M185 565 Q202 548 220 565 Z" />
          <rect x="680" y="570" width="80" height="15" />
          <circle cx="720" cy="570" r="14" />
          <rect x="850" y="562" width="60" height="23" />
          <polygon points="846,562 880,544 914,562" />
        </g>

        {/* Foreground Shoreline & Palms (Deep Obsidian) */}
        <g fill="#04060e">
          <path d="M0 610 Q320 600 720 610 T1440 605 L1440 635 L0 635 Z" />

          {/* Palm 1 */}
          <path d="M115 615 Q125 540 148 480 Q138 540 125 615 Z" />
          <path d="M148 480 Q110 460 75 480 Q115 470 148 480 Z" />
          <path d="M148 480 Q130 435 110 435 Q135 448 148 480 Z" />
          <path d="M148 480 Q158 430 185 435 Q165 450 148 480 Z" />
          <path d="M148 480 Q185 460 215 482 Q175 472 148 480 Z" />
          <path d="M148 480 Q160 505 185 520 Q165 500 148 480 Z" />
          <path d="M148 480 Q130 500 105 515 Q128 495 148 480 Z" />

          {/* Palm 2 */}
          <path d="M165 615 Q180 520 205 450 Q192 525 175 615 Z" />
          <path d="M205 450 Q165 430 130 450 Q170 440 205 450 Z" />
          <path d="M205 450 Q185 405 165 408 Q190 420 205 450 Z" />
          <path d="M205 450 Q225 400 248 405 Q228 420 205 450 Z" />
          <path d="M205 450 Q245 430 278 455 Q235 442 205 450 Z" />
          <path d="M205 450 Q220 480 245 492 Q225 470 205 450 Z" />

          {/* Palm 3 */}
          <path d="M1250 615 Q1235 530 1215 465 Q1225 535 1240 615 Z" />
          <path d="M1215 465 Q1175 445 1140 465 Q1180 455 1215 465 Z" />
          <path d="M1215 465 Q1195 420 1175 422 Q1200 435 1215 465 Z" />
          <path d="M1215 465 Q1230 415 1255 422 Q1235 435 1215 465 Z" />
          <path d="M1215 465 Q1255 445 1285 470 Q1245 455 1215 465 Z" />
          <path d="M1215 465 Q1230 492 1250 505 Q1230 485 1215 465 Z" />

          {/* Palm 4 */}
          <path d="M1305 615 Q1295 545 1285 490 Q1290 548 1295 615 Z" />
          <path d="M1285 490 Q1250 475 1220 495 Q1255 485 1285 490 Z" />
          <path d="M1285 490 Q1275 450 1255 455 Q1275 465 1285 490 Z" />
          <path d="M1285 490 Q1305 450 1325 455 Q1305 465 1285 490 Z" />
          <path d="M1285 490 Q1320 475 1345 500 Q1310 485 1285 490 Z" />
        </g>

        {/* Night Sea */}
        <rect x="0" y="625" width="1440" height="275" fill="url(#nightSea)" />

        {/* Moonlight water reflections */}
        <g stroke="#c7dcff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1040" y1="635" x2="1120" y2="635" strokeWidth="2.2" strokeOpacity="0.55" />
          <line x1="1010" y1="648" x2="1150" y2="648" strokeWidth="2" strokeOpacity="0.45" />
          <line x1="970" y1="665" x2="1190" y2="665" strokeWidth="1.8" strokeOpacity="0.4" />
          <line x1="920" y1="690" x2="1240" y2="690" strokeWidth="1.5" strokeOpacity="0.35" />
          <line x1="860" y1="725" x2="1300" y2="725" strokeWidth="1.3" strokeOpacity="0.28" />
          <line x1="800" y1="770" x2="1360" y2="770" strokeWidth="1.2" strokeOpacity="0.22" />
          <line x1="720" y1="825" x2="1400" y2="825" strokeWidth="1" strokeOpacity="0.18" />
        </g>
      </svg>
    </div>
  );
}

export function LoginPage() {
  const { notice, setNotice } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.rpc('admin_setup_available').then(({ data, error: rpcError }) => {
      if (!rpcError && data === true) setSetupAvailable(true);
    });
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(friendlyLoginError(signInError.message));
      setSubmitting(false);
    }
  };

  const handleSetup = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callEdgeFunction('setup-admin', {
        full_name: fullName,
        email: email.trim(),
        password,
      });
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    setSetupAvailable(false);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setMode('signin');
      setError('Your admin account is ready. Please sign in with your email and password.');
      setSubmitting(false);
    }
  };

  const isSetup = mode === 'setup';

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-body overflow-x-hidden">
      {/* Full-screen Illustrated Chennai Landscape Background */}
      <ChennaiBackground />

      {/* Theme Toggle in matching frosted glass bubble (top right) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <div className="rounded-full border border-white/20 bg-black/40 backdrop-blur-md p-1 shadow-lg">
          <ThemeToggle />
        </div>
      </div>

      {/* Floating Centered Frosted-Glass Sign-In Panel */}
      <div className="relative z-20 w-full max-w-[420px] mx-auto my-auto animate-fade-in">
        {/* Taha Media Logo (inverted to white, exactly ~108px wide) */}
        <div className="flex justify-center mb-6 select-none">
          <img
            src="/taha-logo.png"
            alt="Taha Media"
            className="w-[108px] h-auto object-contain [filter:invert(1)] drop-shadow-md"
          />
        </div>

        {/* Frosted Glass Container with dark purple semi-transparent tint */}
        <div className="rounded-3xl border border-white/20 bg-[#170828]/80 dark:bg-[#0c0d1e]/85 backdrop-blur-xl p-7 sm:p-9 shadow-2xl transition-all">
          {/* Header */}
          <div className="text-center mb-7">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              {isSetup ? 'Set up your workspace' : 'Sign in'}
            </h1>
            <p className="mt-2 text-sm text-white/80 font-body leading-relaxed">
              {isSetup
                ? 'Create the admin account that will manage your team.'
                : 'Your tasks for today are waiting.'}
            </p>
          </div>

          <form onSubmit={isSetup ? handleSetup : handleSignIn} className="space-y-6" noValidate>
            {notice && (
              <div
                role="status"
                className="rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-3 text-sm text-white leading-snug"
              >
                {notice}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/40 bg-rose-950/70 backdrop-blur-sm px-4 py-3 text-sm font-medium text-rose-100 leading-snug"
              >
                {error}
              </div>
            )}

            {isSetup && (
              <div className="space-y-1">
                <label
                  htmlFor="full-name"
                  className="block text-xs font-medium text-white/85 font-body"
                >
                  Your name
                </label>
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                  className="block w-full border-0 border-b border-white/30 bg-transparent py-2.5 px-0 text-base text-white placeholder-transparent transition-colors focus:border-b-2 focus:border-white focus:outline-none focus:ring-0 disabled:opacity-50"
                />
              </div>
            )}

            {/* Email Field with Underline Style */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-white/85 font-body"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="block w-full border-0 border-b border-white/30 bg-transparent py-2.5 px-0 text-base text-white placeholder-transparent transition-colors focus:border-b-2 focus:border-white focus:outline-none focus:ring-0 disabled:opacity-50"
              />
            </div>

            {/* Password Field with Underline Style */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-white/85 font-body"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                required
                minLength={isSetup ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="block w-full border-0 border-b border-white/30 bg-transparent py-2.5 px-0 text-base text-white placeholder-transparent transition-colors focus:border-b-2 focus:border-white focus:outline-none focus:ring-0 disabled:opacity-50"
              />
            </div>

            {/* Submit Button with Pink-to-Orange Gradient & High-Contrast Dark Text */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 font-body font-bold text-sm tracking-wide rounded-full shadow-lg transition-all duration-200 bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#170828] focus-visible:ring-white"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin text-[#1c0627]" />}
                {isSetup ? 'Create admin account' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* First-time Admin Setup Link */}
          {setupAvailable && (
            <div className="mt-6 text-center text-xs text-white/70 font-body">
              {isSetup ? (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-white hover:underline underline-offset-4 font-medium transition-opacity hover:opacity-90"
                >
                  Back to sign in
                </button>
              ) : (
                <>
                  New workspace?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('setup')}
                    className="text-white font-medium hover:underline underline-offset-4 ml-1 transition-opacity hover:opacity-90"
                  >
                    Set up the admin account
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
