import { Icon } from "@iconify/react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050505] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-12 mb-16">
        <div className="w-full md:w-1/3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-neutral-200 flex items-center justify-center text-black">
              <Icon icon="solar:record-circle-linear" width="14"></Icon>
            </div>
            <span className="text-white font-medium tracking-tight">FreeShot</span>
          </div>
          <p className="text-neutral-500 text-sm leading-relaxed">
            The modern standard for screen recording and video editing. Built for the web.
          </p>
        </div>

        <div className="flex gap-12 md:gap-24">
          <div>
            <h4 className="text-white font-medium text-sm mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium text-sm mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium text-sm mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-xs text-neutral-600">© 2023 FreeShot Inc. All rights reserved.</span>
        <div className="flex gap-4 text-neutral-600">
          <a href="#" className="hover:text-white transition-colors"><Icon icon="solar:brand-twitter-linear" width="18"></Icon></a>
          <a href="#" className="hover:text-white transition-colors"><Icon icon="solar:brand-github-linear" width="18"></Icon></a>
          <a href="#" className="hover:text-white transition-colors"><Icon icon="solar:brand-discord-linear" width="18"></Icon></a>
        </div>
      </div>
    </footer>
  );
}