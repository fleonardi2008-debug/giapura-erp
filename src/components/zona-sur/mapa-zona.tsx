"use client";

// Este componente solo se importa con next/dynamic y { ssr: false }, asi que
// nunca corre en el servidor: no hace falta ningun chequeo de "estamos en el
// cliente", Leaflet puede tocar el DOM desde el primer render.
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// El icono por defecto de Leaflet no resuelve bien sus imagenes cuando el
// bundler (webpack/turbopack) reescribe las rutas. Se apunta directo al CDN
// para no tener que copiar archivos de imagen al proyecto.
const iconoPin = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  lat: number;
  lng: number;
  radioKm: number;
  /** Si se pasa, el mapa deja tocar para mover el centro (uso: panel de admin). */
  onMoverCentro?: (lat: number, lng: number) => void;
  /** Color del circulo (para que combine con la marca en la pagina publica). */
  colorCirculo?: string;
  alto?: string;
};

function ClicksDelMapa({ onMoverCentro }: { onMoverCentro?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMoverCentro?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sigue al centro cuando cambia por fuera del mapa (ej: al buscar una direccion).
function SeguirCentro({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView([lat, lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export function MapaZona({ lat, lng, radioKm, onMoverCentro, colorCirculo = "#4A1C05", alto = "24rem" }: Props) {
  // El zoom se ajusta solo, mas cerca cuanto mas chico es el radio.
  const zoomInicial = useMemo(() => {
    if (radioKm <= 2) return 13;
    if (radioKm <= 5) return 12;
    if (radioKm <= 10) return 11;
    return 10;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ height: alto }} className="overflow-hidden rounded-xl border">
      <MapContainer center={[lat, lng]} zoom={zoomInicial} style={{ height: "100%", width: "100%" }} scrollWheelZoom={!!onMoverCentro}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SeguirCentro lat={lat} lng={lng} />
        {onMoverCentro && <ClicksDelMapa onMoverCentro={onMoverCentro} />}
        <Marker position={[lat, lng]} icon={iconoPin} />
        <Circle
          center={[lat, lng]}
          radius={radioKm * 1000}
          pathOptions={{ color: colorCirculo, fillColor: colorCirculo, fillOpacity: 0.15, weight: 2 }}
        />
      </MapContainer>
    </div>
  );
}
