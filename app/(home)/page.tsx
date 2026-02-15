import EditorPreview from "../components/ui/editor-preview";
import Hero from "../components/ui/hero";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="relative pt-32 pb-20 overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-neutral-800/20 via-neutral-900/10 to-transparent rounded-[100%] blur-3xl pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <Hero/>
          <EditorPreview/>
        </div>
      </div>
    </div>
  );
}
