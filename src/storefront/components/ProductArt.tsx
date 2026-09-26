import { useId, type ReactNode } from "react";
import type { CategoryType } from "../lib/types";

/* ─────────────────────────────────────────────────────────────
   Product illustrations — drawn in SVG so every product without a
   photo still gets an intentional, on-brand image. The frame and
   lens tints come from the product's color text when recognizable.
   ───────────────────────────────────────────────────────────── */

type Palette = { base: string; hi: string; tortoise?: boolean; translucent?: boolean };

const FRAME_COLORS: [RegExp, Palette][] = [
  [/tartaruga|havana|demi|tortoise|mesclad/, { base: "#6a3b1b", hi: "#c98a45", tortoise: true }],
  [/dourad|gold|ouro/, { base: "#a87b30", hi: "#ecd49a" }],
  [/prata|silver|prateado|a[çc]o/, { base: "#8d949d", hi: "#eef0f2" }],
  [/grafite|chumbo|gunmetal/, { base: "#474b54", hi: "#9da2ab" }],
  [/preto|black|[oô]nix/, { base: "#1b1d24", hi: "#5b5f6b" }],
  [/rosa|pink|ros[eé]/, { base: "#c07f8b", hi: "#f2cdd3", translucent: true }],
  [/vinho|bord[oô]|marsala/, { base: "#6b2130", hi: "#b25868" }],
  [/vermelh|red/, { base: "#a3302f", hi: "#df7a6f" }],
  [/azul|navy|blue/, { base: "#22386b", hi: "#6784c4" }],
  [/verde|green/, { base: "#33574a", hi: "#78a08b" }],
  [/marrom|caf[eé]|brown|chocolate/, { base: "#553723", hi: "#9b7050" }],
  [/lil[aá]s|roxo|purple|violeta/, { base: "#5d4580", hi: "#a592c8" }],
  [/nude|bege|champanhe|creme/, { base: "#bfa184", hi: "#efe1cf", translucent: true }],
  [/cinza|fum[eê]|gray|grey/, { base: "#62666f", hi: "#b7bbc3", translucent: true }],
  [/cristal|transparente|clear/, { base: "#c9ced4", hi: "#ffffff", translucent: true }],
  [/branco|white/, { base: "#e6e2da", hi: "#ffffff" }],
];

const LENS_TINTS: [RegExp, [string, string]][] = [
  [/g-?15|verde|green/, ["#27402f", "#6f8c70"]],
  [/prizm|iridesc|espelh|mirror/, ["#231d3d", "#7b64b3"]],
  [/marrom|brown|b-?15|bronze/, ["#402818", "#a67a52"]],
  [/azul|blue/, ["#1c2b52", "#6c8ccc"]],
  [/rosa|pink/, ["#6a3441", "#d69aa7"]],
  [/amarel|yellow|laranja/, ["#6b4a12", "#e0b457"]],
];

const DEFAULT_SUN: [string, string] = ["#1d2029", "#8a8f9a"];

function norm(s?: string | null) {
  return (s || "").toLowerCase().normalize("NFC");
}

function framePalette(color: string, fallback: Palette): Palette {
  const c = norm(color);
  for (const [re, p] of FRAME_COLORS) if (re.test(c)) return p;
  return fallback;
}

function lensTint(color: string): [string, string] {
  const c = norm(color);
  for (const [re, t] of LENS_TINTS) if (re.test(c)) return t;
  if (/cinza|fum[eê]|grafite|gray|grey|preto/.test(c)) return ["#1f222a", "#7d828d"];
  return DEFAULT_SUN;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* Lens outlines for the RIGHT lens, in local coordinates (0,0 = lens center,
   negative x = towards the nose). The left lens is the same shape mirrored. */
type Shape = { d: string; inner: number; bridgeY: number; outer: number; hingeY: number };

export const SHAPES: Record<string, Shape> = {
  rect: {
    d: "M -46 -24 C -46 -31 -41 -34 -34 -34 L 40 -34 C 48 -34 52 -30 52 -22 L 52 12 C 52 26 42 32 28 32 L -26 32 C -40 32 -46 24 -46 12 Z",
    inner: -46, bridgeY: -14, outer: 52, hingeY: -24,
  },
  square: {
    d: "M -46 -26 C -46 -36 -40 -40 -30 -40 L 38 -40 C 48 -40 52 -35 52 -25 L 52 18 C 52 32 44 38 30 38 L -26 38 C -40 38 -46 30 -46 18 Z",
    inner: -46, bridgeY: -16, outer: 52, hingeY: -28,
  },
  round: {
    d: "M -45 0 C -45 -25 -25 -44 2 -44 C 29 -44 49 -25 49 0 C 49 25 29 42 2 42 C -25 42 -45 25 -45 0 Z",
    inner: -45, bridgeY: -12, outer: 49, hingeY: -14,
  },
  cateye: {
    d: "M -46 -20 C -40 -35 16 -38 56 -44 C 60 -30 56 4 42 22 C 28 38 -20 38 -38 28 C -50 20 -50 -8 -46 -20 Z",
    inner: -47, bridgeY: -14, outer: 56, hingeY: -38,
  },
  wayfarer: {
    d: "M -48 -30 C -30 -34 30 -38 52 -36 C 58 -35 58 -28 56 -18 C 52 8 42 30 20 32 L -24 32 C -40 32 -46 20 -48 0 Z",
    inner: -48, bridgeY: -18, outer: 56, hingeY: -30,
  },
  aviator: {
    d: "M -44 -32 C -18 -38 28 -40 48 -32 C 60 -26 60 -4 52 16 C 42 40 22 54 -2 54 C -26 54 -44 38 -48 12 C -50 -6 -50 -24 -44 -32 Z",
    inner: -49, bridgeY: -14, outer: 56, hingeY: -28,
  },
  sport: {
    d: "M -46 -26 C -10 -34 40 -34 60 -26 C 64 -10 56 18 36 28 C 12 38 -26 34 -40 22 C -48 12 -50 -12 -46 -26 Z",
    inner: -48, bridgeY: -16, outer: 60, hingeY: -24,
  },
};

function pickShape(name: string, sun: boolean, color: string, seed: string): keyof typeof SHAPES {
  const n = norm(name);
  if (/aviad|aviator|pilot|3025|3026/.test(n)) return "aviator";
  if (/fastball|sport|radar|flak|esportiv/.test(n)) return "sport";
  if (/holbrook|quadrad|square/.test(n)) return "square";
  if (/redond|round|panto|clubround/.test(n)) return "round";
  if (/gatinho|cat ?eye/.test(n)) return "cateye";
  if (/wayfarer|2140/.test(n)) return "wayfarer";
  if (sun) return (["wayfarer", "square", "aviator"] as const)[hash(seed) % 3];
  if (/rosa|pink|lil[aá]s|vinho/.test(norm(color))) return "cateye";
  return (["rect", "round", "square", "wayfarer", "rect"] as const)[hash(seed) % 5];
}

const CX = 258;
const CY = 146;

function Glasses({
  uid,
  name,
  color,
  material,
  sun,
  line,
  seed,
}: {
  uid: string;
  name: string;
  color: string;
  material: string;
  sun: boolean;
  line?: boolean;
  seed: string;
}) {
  const shapeKey = pickShape(name, sun, color, seed);
  const shape = SHAPES[shapeKey];
  const [frameColor, lensColor] = color.split("/").map((s) => s.trim());
  const metal = /metal|tit[aâ]n|a[çc]o|alum/.test(norm(material)) || shapeKey === "aviator";
  const pal: Palette = line
    ? { base: "#d6ad5c", hi: "#f3dfaf" }
    : framePalette(frameColor || color, sun ? { base: "#1b1d24", hi: "#5b5f6b" } : { base: "#1f2b4d", hi: "#5d6f9f" });
  const tint = lensTint(lensColor || (sun ? color : ""));
  const sw = line ? 3 : metal ? 3.4 : /nylon|o-?matter|tr-?90|injetad/.test(norm(material)) ? 7 : 8.5;

  const leftX = 400 - CX;
  const outerR = CX + shape.outer;
  const hingeY = CY + shape.hingeY;
  const bridgeY = CY + shape.bridgeY;
  const innerR = CX + shape.inner;
  const innerL = 400 - innerR;

  const stroke = pal.tortoise && !line ? `url(#${uid}-tort)` : metal && !line ? `url(#${uid}-metal)` : pal.base;

  const lens = (
    <>
      <path d={shape.d} fill={`url(#${uid}-lens)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        <path d="M -40 -60 L -18 -60 L -62 60 L -84 60 Z" fill="#fff" opacity={sun ? 0.16 : line ? 0.06 : 0.55} />
        <path d="M -8 -60 L 0 -60 L -44 60 L -52 60 Z" fill="#fff" opacity={sun ? 0.1 : line ? 0.05 : 0.4} />
        {sun && !line && <ellipse cx="14" cy="-30" rx="46" ry="12" fill="#fff" opacity="0.08" />}
      </g>
      <path d={shape.d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      {!metal && !line && (
        <path d={shape.d} fill="none" stroke={pal.hi} strokeOpacity={pal.translucent ? 0.55 : 0.28} strokeWidth={1.2} transform="translate(0 -2.2) scale(0.985)" />
      )}
    </>
  );

  return (
    <g>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <path d={shape.d} />
        </clipPath>
        <linearGradient id={`${uid}-lens`} x1="0" y1="0" x2="0.35" y2="1">
          {sun && !line ? (
            <>
              <stop offset="0" stopColor={tint[0]} stopOpacity="0.96" />
              <stop offset="1" stopColor={tint[1]} stopOpacity="0.88" />
            </>
          ) : line ? (
            <>
              <stop offset="0" stopColor="#f3dfaf" stopOpacity="0.14" />
              <stop offset="1" stopColor="#f3dfaf" stopOpacity="0.02" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#e8eef3" stopOpacity="0.75" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.35" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={pal.hi} />
          <stop offset="0.45" stopColor={pal.base} />
          <stop offset="0.7" stopColor={pal.hi} />
          <stop offset="1" stopColor={pal.base} />
        </linearGradient>
        <linearGradient id={`${uid}-templeR`} gradientUnits="userSpaceOnUse" x1={outerR - 6} y1="0" x2={outerR + 50} y2="0">
          <stop offset="0" stopColor={pal.tortoise ? pal.base : pal.base} stopOpacity="1" />
          <stop offset="1" stopColor={pal.base} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-templeL`} gradientUnits="userSpaceOnUse" x1={400 - outerR + 6} y1="0" x2={400 - outerR - 50} y2="0">
          <stop offset="0" stopColor={pal.base} stopOpacity="1" />
          <stop offset="1" stopColor={pal.base} stopOpacity="0" />
        </linearGradient>
        <pattern id={`${uid}-tort`} patternUnits="userSpaceOnUse" width="38" height="30" patternTransform="rotate(-18)">
          <rect width="38" height="30" fill="#5a3216" />
          <ellipse cx="8" cy="7" rx="7" ry="3.5" fill="#8f5424" opacity="0.7" />
          <ellipse cx="26" cy="17" rx="8" ry="3" fill="#a8672c" opacity="0.55" />
          <ellipse cx="17" cy="26" rx="6" ry="2.5" fill="#3b1e0b" opacity="0.6" />
          <ellipse cx="33" cy="5" rx="4" ry="2" fill="#c18544" opacity="0.4" />
          <ellipse cx="3" cy="19" rx="4" ry="2" fill="#2a1406" opacity="0.5" />
        </pattern>
      </defs>

      {/* temples, fading backwards */}
      <path
        d={`M ${outerR - 4} ${hingeY + 2} C ${outerR + 18} ${hingeY} ${outerR + 34} ${hingeY + 3} ${outerR + 50} ${hingeY + 12}`}
        stroke={line ? pal.base : `url(#${uid}-templeR)`} strokeWidth={metal || line ? 2.6 : 5.5} strokeLinecap="round" fill="none" opacity={line ? 0.5 : 1}
      />
      <path
        d={`M ${400 - outerR + 4} ${hingeY + 2} C ${400 - outerR - 18} ${hingeY} ${400 - outerR - 34} ${hingeY + 3} ${400 - outerR - 50} ${hingeY + 12}`}
        stroke={line ? pal.base : `url(#${uid}-templeL)`} strokeWidth={metal || line ? 2.6 : 5.5} strokeLinecap="round" fill="none" opacity={line ? 0.5 : 1}
      />

      <g transform={`translate(${CX} ${CY})`}>{lens}</g>
      <g transform={`translate(${leftX} ${CY}) scale(-1 1)`}>{lens}</g>

      {/* bridge */}
      <path
        d={`M ${innerR + 2} ${bridgeY + 4} C ${innerR - 6} ${bridgeY - 9} ${innerL + 6} ${bridgeY - 9} ${innerL - 2} ${bridgeY + 4}`}
        stroke={stroke} strokeWidth={metal || line ? sw : sw * 0.9} fill="none" strokeLinecap="round"
      />
      {metal && !line && (
        <>
          {/* double bridge + nose pads */}
          <path d={`M ${innerR + 6} ${CY - 31} C ${innerR - 4} ${CY - 35} ${innerL + 4} ${CY - 35} ${innerL - 6} ${CY - 31}`} stroke={stroke} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d={`M ${innerR + 1} ${bridgeY + 6} L ${innerR - 5} ${CY + 14}`} stroke={pal.base} strokeWidth={1.4} />
          <path d={`M ${innerL - 1} ${bridgeY + 6} L ${innerL + 5} ${CY + 14}`} stroke={pal.base} strokeWidth={1.4} />
          <ellipse cx={innerR - 6} cy={CY + 20} rx="3.6" ry="7" fill="#fff" fillOpacity="0.7" stroke={pal.base} strokeOpacity="0.5" strokeWidth="1" />
          <ellipse cx={innerL + 6} cy={CY + 20} rx="3.6" ry="7" fill="#fff" fillOpacity="0.7" stroke={pal.base} strokeOpacity="0.5" strokeWidth="1" />
        </>
      )}
      {/* hinges / rivets */}
      {!line &&
        [outerR - 8, 400 - outerR + 8].map((x) => (
          <circle key={x} cx={x} cy={hingeY + 5} r={metal ? 2 : 2.2} fill={metal ? pal.hi : "#e8d3a0"} opacity={metal ? 0.9 : 0.85} />
        ))}
    </g>
  );
}

function OphthalmicLens({ uid, name }: { uid: string; name: string }) {
  const n = norm(name);
  const progressive = /progress|varilux|multifoc|smartlife|progressiv/.test(n);
  const photo = /transitions|fotossens|photochrom|gen ?\d|signature|sensity/.test(n);
  const blue = /blue|azul|luz azul|eyezen/.test(n);
  const drive = /drive|noturn/.test(n);
  const coat = blue ? "#5b86d6" : drive ? "#d69a3c" : photo ? "#7a6aa8" : "#5fa58c";
  const ys = [98, 122, 146, 170, 194];
  const focal = (y: number) => (progressive ? { x: 322 + (y - 98) * 0.42, y: 146 } : { x: 330, y: 146 });

  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0">
          {photo ? (
            <>
              <stop offset="0" stopColor="#3a3f4b" stopOpacity="0.85" />
              <stop offset="0.55" stopColor="#8d93a0" stopOpacity="0.45" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.4" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#dfe8ef" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#d2dfe8" stopOpacity="0.85" />
            </>
          )}
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#e9c46a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#e9c46a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="30" y1="146" x2="370" y2="146" stroke="#1f2b4d" strokeOpacity="0.14" strokeDasharray="3 6" />
      {ys.map((y, i) => {
        const f = focal(y);
        const isBlue = blue && (i === 1 || i === 3);
        return (
          <g key={y}>
            <line x1="40" y1={y} x2="194" y2={y} stroke={isBlue ? "#4f7fd8" : "#c9982f"} strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
            {isBlue ? (
              <path d={`M 172 ${y} L 120 ${y - 16}`} stroke="#4f7fd8" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 4" opacity="0.9" />
            ) : (
              <line x1="206" y1={y} x2={f.x} y2={f.y} stroke="#c9982f" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
            )}
          </g>
        );
      })}
      {/* lens cross-section with coating layers */}
      <path d="M 191 56 L 209 56 C 240 104 240 188 209 236 L 191 236 C 160 188 160 104 191 56 Z" fill={`url(#${uid}-glass)`} stroke="#1f2b4d" strokeOpacity="0.55" strokeWidth="1.4" />
      <path d="M 212 60 C 242 106 242 186 212 232" fill="none" stroke={coat} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d="M 188 60 C 158 106 158 186 188 232" fill="none" stroke={coat} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d="M 196 72 C 184 110 184 150 190 180" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      {progressive ? (
        [322, 339, 356].map((x) => <circle key={x} cx={x} cy="146" r="4" fill="#c9982f" />)
      ) : (
        <>
          <circle cx="330" cy="146" r="16" fill={`url(#${uid}-glow)`} />
          <circle cx="330" cy="146" r="4.5" fill="#c9982f" />
        </>
      )}
      {photo && (
        <g transform="translate(74 70)" stroke="#c9982f" strokeWidth="1.8" strokeLinecap="round">
          <circle r="9" fill="#e9c46a" stroke="none" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return <line key={i} x1={Math.cos(a) * 13} y1={Math.sin(a) * 13} x2={Math.cos(a) * 18} y2={Math.sin(a) * 18} />;
          })}
        </g>
      )}
    </g>
  );
}

function ContactLens({ uid, color }: { uid: string; color: string }) {
  const tinted = /azul|verde|mel|avel|cinza|color/.test(norm(color));
  const tone = /verde/.test(norm(color)) ? "#8fc7a8" : /mel|avel/.test(norm(color)) ? "#d9b27a" : "#9fd0e0";
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-dome`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tinted ? tone : "#e3f3f8"} stopOpacity="0.85" />
          <stop offset="1" stopColor={tone} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${uid}-drop`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9fd0e0" />
        </linearGradient>
      </defs>
      {/* case */}
      <rect x="104" y="206" width="192" height="40" rx="20" fill="#ffffff" stroke="#1f2b4d" strokeOpacity="0.18" strokeWidth="1.5" />
      <ellipse cx="156" cy="214" rx="30" ry="9" fill="#e4f1f5" stroke="#1f2b4d" strokeOpacity="0.15" />
      <ellipse cx="244" cy="214" rx="30" ry="9" fill="#e4f1f5" stroke="#1f2b4d" strokeOpacity="0.15" />
      <text x="156" y="236" textAnchor="middle" fontSize="11" fontFamily="Figtree, sans-serif" fontWeight="700" fill="#1f2b4d" opacity="0.55">E</text>
      <text x="244" y="236" textAnchor="middle" fontSize="11" fontFamily="Figtree, sans-serif" fontWeight="700" fill="#1f2b4d" opacity="0.55">D</text>
      {/* the lens itself */}
      <path d="M 124 162 C 130 88 270 88 276 162 C 262 176 138 176 124 162 Z" fill={`url(#${uid}-dome)`} stroke="#6aa9bf" strokeOpacity="0.7" strokeWidth="1.6" />
      <ellipse cx="200" cy="163" rx="76" ry="12" fill="none" stroke="#ffffff" strokeWidth="2.2" opacity="0.9" />
      <path d="M 148 138 C 156 112 182 102 204 102" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      {tinted && <circle cx="200" cy="132" r="18" fill="none" stroke="#1f2b4d" strokeOpacity="0.15" strokeWidth="1" />}
      {/* droplet */}
      <path d="M 314 76 C 314 76 296 100 296 112 C 296 122 304 130 314 130 C 324 130 332 122 332 112 C 332 100 314 76 314 76 Z" fill={`url(#${uid}-drop)`} stroke="#6aa9bf" strokeOpacity="0.6" />
      <path d="M 305 110 C 305 104 308 99 311 95" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="292" cy="146" r="4" fill="#bfe1ec" />
    </g>
  );
}

function Accessory({ uid, name, color }: { uid: string; name: string; color: string }) {
  const n = norm(name);
  const pal = framePalette(color, { base: "#1f2b4d", hi: "#5d6f9f" });
  if (/cord[aã]o|corrente|salva/.test(n)) {
    return (
      <g>
        <path d="M 70 118 C 110 250 196 44 246 164 C 276 236 330 214 334 112" fill="none" stroke="#b8893a" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M 70 118 C 110 250 196 44 246 164 C 276 236 330 214 334 112" fill="none" stroke="#f1d99c" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
        {[
          [70, 118],
          [334, 112],
        ].map(([x, y]) => (
          <g key={x}>
            <circle cx={x} cy={y - 14} r="11" fill="none" stroke="#1f2b4d" strokeWidth="5" />
            <rect x={x - 5} y={y - 4} width="10" height="14" rx="4" fill="#1f2b4d" />
          </g>
        ))}
      </g>
    );
  }
  if (/spray|limpa|limpeza|l[ií]quido|solu[çc][aã]o/.test(n)) {
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-bottle`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d8ebf1" />
            <stop offset="0.5" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c6dfe8" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <circle key={i} cx={150 - i * 11 - (i % 2) * 4} cy={86 + ((i * 7) % 20) - 8} r={3.2 - i * 0.3} fill="#9fd0e0" opacity={0.9 - i * 0.1} />
        ))}
        <rect x="190" y="62" width="30" height="14" rx="4" fill="#1f2b4d" />
        <rect x="170" y="70" width="24" height="7" rx="3" fill="#1f2b4d" />
        <rect x="184" y="76" width="42" height="30" rx="6" fill="#1f2b4d" />
        <path d="M 170 124 C 170 110 180 104 192 104 L 218 104 C 230 104 240 110 240 124 L 240 232 C 240 242 234 248 224 248 L 186 248 C 176 248 170 242 170 232 Z" fill={`url(#${uid}-bottle)`} stroke="#1f2b4d" strokeOpacity="0.2" strokeWidth="1.5" />
        <path d="M 172 150 L 238 150 L 238 232 C 238 240 232 246 224 246 L 186 246 C 178 246 172 240 172 232 Z" fill="#9fd0e0" opacity="0.35" />
        <rect x="170" y="160" width="70" height="52" fill="#fbf7ee" />
        <rect x="170" y="166" width="70" height="1.5" fill="#c9982f" />
        <rect x="170" y="204" width="70" height="1.5" fill="#c9982f" />
        <g transform="translate(193 172) scale(0.6)" fill="none" stroke="#1f2b4d" strokeWidth="2.6">
          <circle cx="12.5" cy="25" r="6" />
          <circle cx="27.5" cy="25" r="6" />
          <path d="M18.5 24.2c1-.9 2-.9 3 0" strokeLinecap="round" />
        </g>
        <path d="M 178 116 L 178 232" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      </g>
    );
  }
  if (/estojo|case|capa|bolsa/.test(n)) {
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-case`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={pal.hi} stopOpacity="0.9" />
            <stop offset="0.35" stopColor={pal.base} />
            <stop offset="1" stopColor={pal.base} />
          </linearGradient>
        </defs>
        <path d="M 92 156 C 96 114 132 94 172 94 L 228 94 C 268 94 304 114 308 156 Z" fill={`url(#${uid}-case)`} />
        <path d="M 88 162 L 312 162 C 318 162 322 168 320 176 C 314 214 290 228 258 228 L 142 228 C 110 228 86 214 80 176 C 78 168 82 162 88 162 Z" fill={pal.base} />
        <rect x="84" y="155" width="232" height="8" rx="4" fill="#c9982f" />
        <path d="M 120 118 C 140 104 170 100 200 100" stroke="#fff" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" fill="none" />
        <g transform="translate(184 172) scale(0.8)" fill="#d6ad5c">
          <path d="M13 11.5l3.5 3 3.5-5 3.5 5 3.5-3-1.4 6H14.4L13 11.5z" />
        </g>
      </g>
    );
  }
  // microfiber cloth / generic accessory
  return (
    <g>
      <path d="M 110 110 L 290 96 L 300 214 L 118 226 Z" fill="#e9e4f0" stroke="#1f2b4d" strokeOpacity="0.15" />
      <path d="M 110 110 L 290 96 L 296 150 L 114 166 Z" fill="#d9d2e6" />
      <path d="M 114 166 L 296 150" stroke="#1f2b4d" strokeOpacity="0.12" strokeWidth="2" />
      <rect x="250" y="190" width="30" height="12" rx="2" fill="#c9982f" transform="rotate(-4 265 196)" />
    </g>
  );
}

export interface ProductArtProps {
  type?: CategoryType;
  name?: string;
  color?: string | null;
  material?: string | null;
  seed?: string;
  className?: string;
  /** Gold line-art version for dark hero surfaces. */
  line?: boolean;
  title?: string;
  decorative?: boolean;
}

export function ProductArt({ type, name = "", color, material, seed, className, line, title, decorative }: ProductArtProps) {
  const uid = `pa${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const c = color || "";
  let body: ReactNode;
  switch (type) {
    case "OPHTHALMIC_LENSES":
      body = <OphthalmicLens uid={uid} name={name} />;
      break;
    case "CONTACT_LENSES":
      body = <ContactLens uid={uid} color={c} />;
      break;
    case "ACCESSORIES":
      body = <Accessory uid={uid} name={name} color={c} />;
      break;
    default:
      body = (
        <Glasses
          uid={uid}
          name={name}
          color={c}
          material={material || ""}
          sun={type === "SUNGLASSES_READY" || type === "FRAMES_SUN"}
          line={line}
          seed={seed || name}
        />
      );
  }

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title || `Ilustração: ${name}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={`${uid}-blur`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <circle cx="200" cy="150" r="118" fill="none" stroke={line ? "#d6ad5c" : "#c9982f"} strokeOpacity={line ? 0.18 : 0.22} strokeWidth="1" />
      <circle cx="200" cy="150" r="104" fill="none" stroke={line ? "#d6ad5c" : "#c9982f"} strokeOpacity={line ? 0.08 : 0.1} strokeWidth="1" />
      {!line && <ellipse cx="200" cy="258" rx="128" ry="7" fill="#1f2b4d" opacity="0.13" filter={`url(#${uid}-blur)`} />}
      {body}
    </svg>
  );
}
