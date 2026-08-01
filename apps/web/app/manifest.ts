import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ToTo TAD Cinema",
    short_name: "ToTo TAD Cinema",
    description:
      "Website xem phim riêng tư với phim lẻ, phim bộ và hoạt hình chất lượng cao.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07080b",
    theme_color: "#07080b",
    lang: "vi",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
