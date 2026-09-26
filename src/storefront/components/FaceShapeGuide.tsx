import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHAPES } from "./ProductArt";
import { useCategories } from "../lib/api";
import { categoryHref, pickCategory } from "../lib/store";

type FaceKey = "redondo" | "oval" | "quadrado" | "coracao" | "triangular";

const FACES: Record<
  FaceKey,
  { label: string; path: string; how: string; styles: string[]; tip: string; frame: keyof typeof SHAPES; search: string }
> = {
  redondo: {
    label: "Redondo",
    path: "M 100 30 C 150 30 180 70 180 124 C 180 180 146 218 100 218 C 54 218 20 180 20 124 C 20 70 50 30 100 30 Z",
    how: "Largura e altura parecidas, bochechas cheias e contornos suaves.",
    styles: ["Retangulares", "Quadradas", "Wayfarer", "Ponte alta"],
    tip: "Linhas retas e ângulos criam contraste e deixam o rosto mais alongado.",
    frame: "rect",
    search: "",
  },
  oval: {
    label: "Oval",
    path: "M 100 18 C 146 18 168 62 168 116 C 168 176 140 226 100 226 C 60 226 32 176 32 116 C 32 62 54 18 100 18 Z",
    how: "Rosto um pouco mais longo que largo, testa e queixo equilibrados.",
    styles: ["Quase todos", "Aviador", "Wayfarer", "Gatinho"],
    tip: "Você tem liberdade: prefira armações tão largas quanto a parte mais larga do rosto.",
    frame: "wayfarer",
    search: "",
  },
  quadrado: {
    label: "Quadrado",
    path: "M 30 62 C 30 32 60 22 100 22 C 140 22 170 32 170 62 L 172 168 C 172 204 142 222 100 222 C 58 222 28 204 28 168 Z",
    how: "Testa larga, maxilar marcado e queixo mais reto.",
    styles: ["Redondas", "Ovais", "Aviador", "Metal fino"],
    tip: "Curvas suavizam o maxilar. Armações finas e redondas equilibram os traços fortes.",
    frame: "round",
    search: "",
  },
  coracao: {
    label: "Coração",
    path: "M 22 72 C 22 32 60 18 100 28 C 140 18 178 32 178 72 C 178 132 142 192 100 226 C 58 192 22 132 22 72 Z",
    how: "Testa mais larga, maçãs do rosto altas e queixo fino.",
    styles: ["Aviador", "Redondas", "Fio de nylon", "Cores claras"],
    tip: "Armações mais leves embaixo equilibram a testa. Evite detalhes pesados no topo.",
    frame: "aviator",
    search: "aviador",
  },
  triangular: {
    label: "Triangular",
    path: "M 54 60 C 54 30 76 20 100 20 C 124 20 146 30 146 60 C 158 110 178 158 170 190 C 160 216 130 226 100 226 C 70 226 40 216 30 190 C 22 158 42 110 54 60 Z",
    how: "Testa mais estreita e maxilar mais largo.",
    styles: ["Gatinho", "Browline", "Detalhes no topo", "Cores na parte superior"],
    tip: "Destaque a parte de cima do rosto: armações com a linha superior marcada trazem equilíbrio.",
    frame: "cateye",
    search: "",
  },
};

function FaceFigure({ face, active }: { face: FaceKey; active?: boolean }) {
  const f = FACES[face];
  const shape = SHAPES[f.frame];
  const s = 0.44;
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" aria-hidden="true">
      <path d={f.path} fill={active ? "hsl(var(--card))" : "none"} stroke="currentColor" strokeWidth={active ? 2 : 3} strokeLinejoin="round" />
      {active && (
        <g transform={`translate(${100 - 200 * s} ${104 - 146 * s}) scale(${s})`}>
          <g transform="translate(258 146)">
            <path d={shape.d} fill="hsl(var(--gold) / 0.12)" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinejoin="round" />
          </g>
          <g transform="translate(142 146) scale(-1 1)">
            <path d={shape.d} fill="hsl(var(--gold) / 0.12)" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinejoin="round" />
          </g>
          <path
            d={`M ${258 + shape.inner + 2} ${146 + shape.bridgeY + 4} C ${258 + shape.inner - 6} ${146 + shape.bridgeY - 9} ${142 - shape.inner + 6} ${146 + shape.bridgeY - 9} ${142 - shape.inner - 2} ${146 + shape.bridgeY + 4}`}
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
      {active && <path d="M 86 176 C 94 184 106 184 114 176" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />}
    </svg>
  );
}

export function FaceShapeGuide() {
  const [face, setFace] = useState<FaceKey>("oval");
  const f = FACES[face];
  const { data: cats } = useCategories();
  const grau = pickCategory(cats, ["FRAMES_PRESCRIPTION"]);
  const sol = pickCategory(cats, ["SUNGLASSES_READY", "FRAMES_SUN"]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
      <div>
        <p className="mb-3 text-sm font-semibold">Qual é o formato do seu rosto?</p>
        <div role="group" aria-label="Formato do rosto" className="grid grid-cols-5 gap-2 sm:gap-3">
          {(Object.keys(FACES) as FaceKey[]).map((k) => {
            const active = k === face;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                onClick={() => setFace(k)}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-2xl border px-1 pb-2.5 pt-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary text-gold shadow-md" : "border-border bg-card text-muted-foreground hover:border-gold/60 hover:text-foreground",
                )}
              >
                <span className="h-10 w-9 sm:h-14 sm:w-12">
                  <FaceFigure face={k} />
                </span>
                <span className={cn("text-[11px] font-semibold sm:text-xs", active ? "text-primary-foreground" : "")}>{FACES[k].label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-accent/60">
          <div className="mx-auto aspect-[5/6] max-h-[340px] p-6 text-primary/70">
            <AnimatePresence mode="wait">
              <motion.div
                key={face}
                className="h-full w-full"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <FaceFigure face={face} active />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={face}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center"
          aria-live="polite"
        >
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Dica de estilo
          </span>
          <h3 className="mt-4 font-display text-3xl font-medium sm:text-4xl">
            Rosto <em className="italic text-gold">{f.label.toLowerCase()}</em>
          </h3>
          <p className="mt-2 text-muted-foreground">{f.how}</p>
          <p className="mt-6 eyebrow">Armações que costumam valorizar</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {f.styles.map((s) => (
              <li key={s} className="rounded-full border border-primary/15 bg-card px-3.5 py-1.5 text-sm font-medium text-primary">{s}</li>
            ))}
          </ul>
          <p className="mt-6 border-l-2 border-gold pl-4 text-[15px] leading-relaxed text-foreground/85">{f.tip}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={categoryHref(grau)} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Ver óculos de grau <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={sol ? `${categoryHref(sol)}${f.search ? `&q=${f.search}` : ""}` : "/loja"}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-gold hover:bg-gold-soft"
            >
              Ver óculos de sol
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            É só um ponto de partida — o espelho decide. Na loja a gente ajuda você a experimentar com calma.
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
