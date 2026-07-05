import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Activity } from "../types";

// Setup Leaflet icon markers correctly
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapComponentProps {
  activities: Activity[];
  activeDay?: number;
}

const MapComponent: React.FC<MapComponentProps> = ({ activities, activeDay }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
      }).setView([0, 0], 2);

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);
    }

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Filter activities if needed or show all
    const validActivities = activities.filter((act) => act.lat && act.lng);

    if (validActivities.length > 0 && mapRef.current) {
      const bounds: L.LatLngTuple[] = [];

      validActivities.forEach((act, index) => {
        if (!mapRef.current) return;

        // Custom marker color or style can be done with HTML DivIcon
        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs border-2 border-white shadow-lg transform hover:scale-110 transition-transform">
              ${index + 1}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([act.lat, act.lng], { icon: customIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="p-1">
              <span class="inline-block px-1.5 py-0.5 mb-1 text-[10px] font-semibold tracking-wide rounded bg-indigo-100 text-indigo-800 uppercase">${act.category}</span>
              <h3 class="font-bold text-sm text-slate-900">${act.title}</h3>
              <p class="text-xs text-slate-600 mt-1">${act.description}</p>
              <div class="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                <span class="text-xs font-medium text-slate-500">${act.time}</span>
                <span class="text-xs font-semibold text-emerald-600">${act.cost > 0 ? `$${act.cost}` : "Free"}</span>
              </div>
            </div>
          `);

        markersRef.current.push(marker);
        bounds.push([act.lat, act.lng]);
      });

      // Fit map bounds to show all markers
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Resize map when element changes
    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activities]);

  // Handle active activity focusing (if activeDay changes)
  useEffect(() => {
    if (mapRef.current && markersRef.current.length > 0 && activeDay !== undefined) {
      // Find markers for the active day's activities if any
      // For now, we fit bounds of current active list
    }
  }, [activeDay]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-10" />
      
      {activities.length === 0 && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-center p-4 z-20">
          <p className="text-slate-500 text-sm font-medium">No locations available to show on map.</p>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
