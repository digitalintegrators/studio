import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Branding */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-3">
              Studio
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Plataforma de grabación y creación de demos para equipos técnicos,
              preventa y contenido profesional.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-white font-medium mb-3">Producto</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/editor" className="hover:text-white transition">
                  Editor
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition">
                  Grabar
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition">
                  Demos
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-white font-medium mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="https://laboratorios.digital" target="_blank" className="hover:text-white transition">
                  Laboratorios Digitales
                </Link>
              </li>
              <li>
                <Link href="mailto:soporte@laboratorios.digital" className="hover:text-white transition">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-medium mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Términos
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Laboratorios Digitales. All rights reserved.
        </div>

      </div>
    </footer>
  );
}