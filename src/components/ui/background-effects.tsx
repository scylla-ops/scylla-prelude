// import { WarpedNoiseShaders } from "@/components/ui/warped-noise";

export function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/*<div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle 600px at 50% 100px, var(--primary) 0%, transparent 100%)",
          opacity: 0.3,
        }}
      />*/}
      {/*<div className="min-h-screen w-full relative bg-background">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in oklch, var(--primary) 25%, transparent), transparent 70%)",
          }}
        />
      </div>*/}
      <div className="min-h-screen w-full relative bg-background">
        <div
          className="absolute inset-0 z-0 opacity-16 dark:opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 100%, rgb(9, 113, 0), transparent 70%)",
          }}
        />
      </div>

      {/*<div className="min-h-screen w-full bg-background relative">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
             radial-gradient(ellipse 110% 70% at 25% 80%, rgba(34, 120, 50, 0.14), transparent 55%),
             radial-gradient(ellipse 130% 60% at 75% 15%, rgba(0, 128, 128, 0.12), transparent 65%),
             radial-gradient(ellipse 80% 90% at 20% 30%, rgba(20, 90, 40, 0.16), transparent 50%),
             radial-gradient(ellipse 100% 40% at 60% 70%, rgba(40, 180, 160, 0.10), transparent 45%)
           `,
          }}
        />
      </div>*/}
      {/*<div className="min-h-screen w-full relative bg-background">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
                radial-gradient(ellipse 120% 80% at 70% 20%, rgba(20, 100, 40, 0.15), transparent 50%),
                radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 80, 180, 0.12), transparent 60%),
                radial-gradient(ellipse 90% 70% at 50% 0%, rgba(0, 160, 140, 0.18), transparent 65%),
                radial-gradient(ellipse 110% 50% at 80% 30%, rgba(30, 60, 200, 0.08), transparent 40%)
              `,
          }}
        />
      </div>*/}
      {/* Noise overlay */}
      <svg className="absolute inset-0 h-full w-full dark:opacity-70 opacity-40 mix-blend-multiply dark:mix-blend-soft-light">
        <filter id="bg-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-noise)" />
      </svg>
    </div>
    // <div className="pointer-events-none fixed inset-0 z-0">
    //   <div className="absolute inset-0 bg-background" />
    //   <WarpedNoiseShaders
    //     className="absolute inset-0 opacity-100 dark:opacity-20"
    //     speed={0.5}
    //     scale={1.0}
    //     warpStrength={1.0}
    //     colorIntensity={0.8}
    //     noiseDetail={1.0}
    //   />
    // </div>
  );
}
