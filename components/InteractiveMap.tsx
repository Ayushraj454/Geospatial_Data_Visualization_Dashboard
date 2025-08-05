'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Polygon } from '@/app/page';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  polygons: Polygon[];
  isDrawing: boolean;
  onPolygonComplete: (coordinates: [number, number][]) => void;
  onDeletePolygon: (polygonId: string) => void;
}

export default function InteractiveMap({
  polygons,
  isDrawing,
  onPolygonComplete,
  onDeletePolygon
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const drawingMarkersRef = useRef<L.Marker[]>([]);
  const previewPolygonRef = useRef<L.Polygon | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [40.7128, -74.0060], // New York City
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle drawing mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing) return;

      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
      const newPoints = [...drawingPoints, newPoint];

      // Prevent more than 12 points
      if (newPoints.length > 12) {
        return;
      }

      setDrawingPoints(newPoints);

      // Add marker for the new point
      const marker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          className: 'drawing-point',
          html: `<div style="background: #3B82F6; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        })
      }).addTo(map);

      drawingMarkersRef.current.push(marker);

      // Update preview polygon if we have at least 3 points
      if (newPoints.length >= 3) {
        if (previewPolygonRef.current) {
          map.removeLayer(previewPolygonRef.current);
        }

        previewPolygonRef.current = L.polygon(newPoints, {
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '5, 5'
        }).addTo(map);
      }
    };

    const handleRightClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing || drawingPoints.length < 3) return;

      e.originalEvent.preventDefault();
      
      // Complete the polygon
      onPolygonComplete(drawingPoints);
      
      // Clean up drawing state
      setDrawingPoints([]);
      drawingMarkersRef.current.forEach(marker => map.removeLayer(marker));
      drawingMarkersRef.current = [];
      
      if (previewPolygonRef.current) {
        map.removeLayer(previewPolygonRef.current);
        previewPolygonRef.current = null;
      }
    };

    if (isDrawing) {
      map.on('click', handleMapClick);
      map.on('contextmenu', handleRightClick);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      map.off('contextmenu', handleRightClick);
      map.getContainer().style.cursor = '';
      
      // Clean up any drawing state
      setDrawingPoints([]);
      drawingMarkersRef.current.forEach(marker => map.removeLayer(marker));
      drawingMarkersRef.current = [];
      
      if (previewPolygonRef.current) {
        map.removeLayer(previewPolygonRef.current);
        previewPolygonRef.current = null;
      }
    }

    return () => {
      map.off('click', handleMapClick);
      map.off('contextmenu', handleRightClick);
      map.getContainer().style.cursor = '';
    };
  }, [isDrawing, drawingPoints, onPolygonComplete]);

  // Update polygons on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old polygons
    polygonLayersRef.current.forEach((layer, id) => {
      if (!polygons.find(p => p.id === id)) {
        map.removeLayer(layer);
        polygonLayersRef.current.delete(id);
      }
    });

    // Add/update polygons
    polygons.forEach((polygon) => {
      const existingLayer = polygonLayersRef.current.get(polygon.id);
      
      if (existingLayer) {
        // Update existing polygon color
        existingLayer.setStyle({
          fillColor: polygon.color,
          color: polygon.color,
        });
      } else {
        // Create new polygon
        const layer = L.polygon(polygon.coordinates, {
          color: polygon.color,
          fillColor: polygon.color,
          fillOpacity: 0.6,
          weight: 2,
        }).addTo(map);

        // Add popup with polygon info
        layer.bindPopup(`
          <div style="color: black;">
            <strong>Polygon Data</strong><br/>
            ${polygon.value != null ? `Value: ${polygon.value.toFixed(1)}` : 'Loading...'}
          </div>
        `);

        // Add context menu for deletion
        layer.on('contextmenu', (e) => {
          e.originalEvent.preventDefault();
          if (confirm('Delete this polygon?')) {
            onDeletePolygon(polygon.id);
          }
        });

        polygonLayersRef.current.set(polygon.id, layer);
      }
    });
  }, [polygons, onDeletePolygon]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Drawing Instructions */}
      {isDrawing && (
        <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
          <div className="text-sm font-medium">Drawing Mode Active</div>
          <div className="text-xs opacity-90">
            Left click: Add point ({drawingPoints.length}/12) • Right click: Finish (min 3 points)
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg z-[1000] max-w-xs">
        <div className="text-sm font-medium mb-2">Instructions</div>
        <div className="text-xs space-y-1 text-gray-300">
          <div>• Click "Draw New Polygon" to start</div>
          <div>• Left click on map to add points</div>
          <div>• Right click to finish (3-12 points)</div>
          <div>• Right click polygon to delete</div>
          <div>• Use timeline to see data changes</div>
        </div>
      </div>
    </div>
  );
}