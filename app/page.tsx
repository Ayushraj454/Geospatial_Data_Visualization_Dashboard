'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TimelineSlider } from '@/components/TimelineSlider';
import { DataSourcePanel } from '@/components/DataSourcePanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Layers, Calendar } from 'lucide-react';
import { addDays, subDays, startOfHour, format } from 'date-fns';

// Dynamic import to avoid SSR issues with Leaflet
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-900 animate-pulse rounded-lg" />
});

export interface Polygon {
  id: string;
  coordinates: [number, number][];
  color: string;
  value?: number;
  dataSource: string;
}

export interface DataSource {
  id: string;
  name: string;
  unit: string;
  colorRules: ColorRule[];
}

export interface ColorRule {
  min: number;
  max: number;
  color: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<Date>(startOfHour(new Date()));
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: startOfHour(new Date()),
    end: startOfHour(addDays(new Date(), 1))
  });
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('temperature_2m');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const dataSources: DataSource[] = [
    {
      id: 'temperature_2m',
      name: 'Temperature (2m)',
      unit: '°C',
      colorRules: [
        { min: -20, max: 0, color: '#3B82F6' },
        { min: 0, max: 10, color: '#06B6D4' },
        { min: 10, max: 20, color: '#10B981' },
        { min: 20, max: 30, color: '#F59E0B' },
        { min: 30, max: 50, color: '#EF4444' }
      ]
    },
    {
      id: 'relative_humidity_2m',
      name: 'Humidity (2m)',
      unit: '%',
      colorRules: [
        { min: 0, max: 20, color: '#DC2626' },
        { min: 20, max: 40, color: '#F59E0B' },
        { min: 40, max: 60, color: '#10B981' },
        { min: 60, max: 80, color: '#06B6D4' },
        { min: 80, max: 100, color: '#3B82F6' }
      ]
    },
    {
      id: 'precipitation',
      name: 'Precipitation',
      unit: 'mm',
      colorRules: [
        { min: 0, max: 0.1, color: '#F3F4F6' },
        { min: 0.1, max: 1, color: '#06B6D4' },
        { min: 1, max: 5, color: '#3B82F6' },
        { min: 5, max: 15, color: '#1D4ED8' },
        { min: 15, max: 50, color: '#1E1B4B' }
      ]
    },
    {
      id: 'wind_speed_10m',
      name: 'Wind Speed (10m)',
      unit: 'km/h',
      colorRules: [
        { min: 0, max: 5, color: '#F3F4F6' },
        { min: 5, max: 15, color: '#10B981' },
        { min: 15, max: 30, color: '#F59E0B' },
        { min: 30, max: 50, color: '#EF4444' },
        { min: 50, max: 100, color: '#7C2D12' }
      ]
    }
  ];

  const fetchWeatherData = useCallback(async (lat: number, lon: number, startTime: Date, endTime: Date) => {
    try {
      // Clamp coordinates to valid ranges
      const clampedLat = Math.max(-90, Math.min(90, lat));
      const startStr = format(startTime, 'yyyy-MM-dd');
      const endStr = format(endTime, 'yyyy-MM-dd');
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${clampedLat}&longitude=${clampedLon}&hourly=${selectedDataSource}&start_date=${startStr}&end_date=${endStr}&timezone=auto`
      );
      
      if (!response.ok) throw new Error('Failed to fetch weather data');
      
      const data = await response.json();
      const values = data.hourly[selectedDataSource];
      
      if (!values || values.length === 0) return null;
      
      // Calculate average value
      const validValues = values.filter((v: number) => v !== null && v !== undefined);
      return validValues.length > 0 ? validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length : null;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }, [selectedDataSource]);

  const getColorForValue = useCallback((value: number, dataSourceId: string): string => {
    const dataSource = dataSources.find(ds => ds.id === dataSourceId);
    if (!dataSource) return '#9CA3AF';

    for (const rule of dataSource.colorRules) {
      if (value >= rule.min && value < rule.max) {
        return rule.color;
      }
    }
    
    // Return the color for the highest range if value exceeds all ranges
    return dataSource.colorRules[dataSource.colorRules.length - 1].color;
  }, [dataSources]);

  const updatePolygonColors = useCallback(async () => {
    const updatedPolygons = await Promise.all(
      polygons.map(async (polygon) => {
        // Calculate centroid of polygon
        const latSum = polygon.coordinates.reduce((sum, coord) => sum + coord[0], 0);
        const lonSum = polygon.coordinates.reduce((sum, coord) => sum + coord[1], 0);
        const lat = latSum / polygon.coordinates.length;
        const lon = lonSum / polygon.coordinates.length;

        const value = await fetchWeatherData(lat, lon, timeRange.start, timeRange.end);
        const color = value !== null ? getColorForValue(value, selectedDataSource) : '#9CA3AF';

        return {
          ...polygon,
          value,
          color,
          dataSource: selectedDataSource
        };
      })
    );

    setPolygons(updatedPolygons);
  }, [polygons, timeRange, selectedDataSource, fetchWeatherData, getColorForValue]);

  useEffect(() => {
    if (polygons.length > 0) {
      updatePolygonColors();
    }
  }, [timeRange, selectedDataSource]);

  const handlePolygonComplete = useCallback(async (coordinates: [number, number][]) => {
    const newPolygon: Polygon = {
      id: `polygon-${Date.now()}`,
      coordinates,
      color: '#9CA3AF',
      dataSource: selectedDataSource
    };

    setPolygons(prev => [...prev, newPolygon]);
    setIsDrawing(false);

    // Fetch data for the new polygon
    const latSum = coordinates.reduce((sum, coord) => sum + coord[0], 0);
    const lonSum = coordinates.reduce((sum, coord) => sum + coord[1], 0);
    const lat = latSum / coordinates.length;
    const lon = lonSum / coordinates.length;

    const value = await fetchWeatherData(lat, lon, timeRange.start, timeRange.end);
    const color = value !== null ? getColorForValue(value, selectedDataSource) : '#9CA3AF';

    setPolygons(prev => prev.map(p => 
      p.id === newPolygon.id 
        ? { ...p, value, color, dataSource: selectedDataSource }
        : p
    ));
  }, [selectedDataSource, timeRange, fetchWeatherData, getColorForValue]);

  const handleDeletePolygon = useCallback((polygonId: string) => {
    setPolygons(prev => prev.filter(p => p.id !== polygonId));
  }, []);

  const minDate = subDays(new Date(), 15);
  const maxDate = addDays(new Date(), 15);

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Geospatial Data Dashboard</h1>
              <p className="text-gray-400 text-sm">Interactive weather data visualization</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              variant="outline"
              size="sm"
            >
              <Layers className="w-4 h-4 mr-2" />
              Data Sources
            </Button>
            <Card className="px-3 py-2 bg-gray-800 border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">
                  {format(currentTime, 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* Timeline Slider */}
        <TimelineSlider
          currentTime={currentTime}
          timeRange={timeRange}
          minDate={minDate}
          maxDate={maxDate}
          onTimeChange={setCurrentTime}
          onRangeChange={setTimeRange}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <DataSourcePanel
          isOpen={isPanelOpen}
          dataSources={dataSources}
          selectedDataSource={selectedDataSource}
          onDataSourceChange={setSelectedDataSource}
          polygons={polygons}
          isDrawing={isDrawing}
          onStartDrawing={() => setIsDrawing(true)}
          onStopDrawing={() => setIsDrawing(false)}
          onDeletePolygon={handleDeletePolygon}
        />

        {/* Map Container */}
        <div className="flex-1 relative">
          <InteractiveMap
            polygons={polygons}
            isDrawing={isDrawing}
            onPolygonComplete={handlePolygonComplete}
            onDeletePolygon={handleDeletePolygon}
          />
        </div>
      </div>
    </div>
  );
}