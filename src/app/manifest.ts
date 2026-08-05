import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zorin",
    short_name: "Zorin",
    description: "Turn your sales history into profit-maximizing price recommendations.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
