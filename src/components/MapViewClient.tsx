import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { BarWithMatches } from "@/lib/types";

const defaultIcon = L.divIcon({
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:#7dd3fc;border:3px solid #0f172a;box-shadow:0 4px 12px rgba(0,0,0,.4);"></div>`,
});
const selectedIcon = L.divIcon({
  className: "",
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  html: `<div style="width:38px;height:38px;border-radius:9999px;background:#22c55e;border:4px solid #fff;box-shadow:0 0 0 6px rgba(34,197,94,.25),0 4px 14px rgba(0,0,0,.5);"></div>`,
});

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

export function MapViewClient({
  bars,
  selectedBarId,
  onSelect,
}: {
  bars: BarWithMatches[];
  selectedBarId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = bars.find((b) => b.id === selectedBarId);
  const center: [number, number] = selected
    ? [selected.latitude, selected.longitude]
    : bars.length
      ? [bars[0].latitude, bars[0].longitude]
      : [-34.6037, -58.3816];

  return (
    <MapContainer center={center} zoom={12} className="w-full h-full rounded-2xl overflow-hidden" style={{ background: "#0f172a" }}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {bars.map((b) => (
        <Marker
          key={b.id}
          position={[b.latitude, b.longitude]}
          icon={b.id === selectedBarId ? selectedIcon : defaultIcon}
          eventHandlers={{ click: () => onSelect(b.id) }}
        >
          <Popup>
            <div className="text-sm">
              <strong>{b.name}</strong>
              <div className="text-xs opacity-70">{b.neighborhood}</div>
            </div>
          </Popup>
        </Marker>
      ))}
      {selected && <FlyTo lat={selected.latitude} lng={selected.longitude} />}
    </MapContainer>
  );
}