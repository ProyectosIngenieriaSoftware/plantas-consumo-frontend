export function obtenerYoutube(valor) {
    try {
        const url = new URL(valor);
        if (!["https:", "http:"].includes(url.protocol)) return null;
        const host = url.hostname.toLowerCase();
        const segmentos = url.pathname.split("/").filter(Boolean);
        let id;
        if (["youtu.be", "www.youtu.be"].includes(host)) {
            id = segmentos[0];
        } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
            if (url.pathname === "/watch") id = url.searchParams.get("v");
            else if (["embed", "shorts", "live"].includes(segmentos[0])) id = segmentos[1];
        }
        if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? "")) return null;
        return {
            reproductor: `https://www.youtube-nocookie.com/embed/${id}`,
            enlace: `https://www.youtube.com/watch?v=${id}`,
        };
    } catch {
        return null;
    }
}