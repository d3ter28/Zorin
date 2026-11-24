import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zorin",
    short_name: "Zorin",
    description: "Practical pricing guides for online sellers.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#12141a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
