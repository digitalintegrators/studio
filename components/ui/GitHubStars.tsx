"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

export default function GitHubBadge() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/CristianOlivera1/openvid")
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count))
      .catch(() => setStars(null));
  }, []);

  return (
    <a
      href="https://github.com/CristianOlivera1/openvid"
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-white transition-colors"
      aria-label="GitHub Repository"
    >
      <Icon icon="mdi:github" width="28" height="28" />

      <div className="flex items-center gap-1 px-2 py-1 mt-1 text-xs rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold shadow-md">
        <Icon icon="mdi:star" width="12" height="12" />
        <span>{stars ?? "—"}</span>
      </div>
    </a>
  );
}
