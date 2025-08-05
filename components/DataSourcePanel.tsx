'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Palette, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  Thermometer,
  Droplets,
  Wind,
  Cloud
} from 'lucide-react';
import type { DataSource, Polygon } from '@/app/page';

interface DataSourcePanelProps {
  isOpen: boolean;
  dataSources: DataSource[];
  selectedDataSource: string;
  onDataSourceChange: (dataSourceId: string) => void;
  polygons: Polygon[];
  isDrawing: boolean;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onDeletePolygon: (polygonId: string) => void;
}

const dataSourceIcons = {
  temperature_2m: Thermometer,
  relative_humidity_2m: Droplets,
  precipitation: Cloud,
  wind_speed_10m: Wind,
};

export function DataSourcePanel({
  isOpen,
  dataSources,
  selectedDataSource,
  onDataSourceChange,
  polygons,
  isDrawing,
  onStartDrawing,
  onStopDrawing,
  onDeletePolygon
}: DataSourcePanelProps) {
  const [activeTab, setActiveTab] = useState<'sources' | 'polygons'>('sources');

  const selectedSource = dataSources.find(ds => ds.id === selectedDataSource);

  if (!isOpen) {
    return (
      <div className="w-12 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4">
        <Button
          onClick={() => {}} // This would be handled by parent component
          variant="ghost"
          size="sm"
          className="rotate-180"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Control Panel</h2>
          <Button
            onClick={() => {}} // This would be handled by parent component
            variant="ghost"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'sources' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Data Sources
          </button>
          <button
            onClick={() => setActiveTab('polygons')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'polygons' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Polygons ({polygons.length})
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {activeTab === 'sources' && (
          <div className="p-4 space-y-4">
            {/* Drawing Controls */}
            <Card className="p-4 bg-gray-800 border-gray-700">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                Drawing Tools
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={isDrawing ? onStopDrawing : onStartDrawing}
                  variant={isDrawing ? "destructive" : "default"}
                  className="w-full"
                  disabled={isDrawing}
                >
                  {isDrawing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Click map to add points (3-12 points)
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Draw New Polygon
                    </>
                  )}
                </Button>
                {isDrawing && (
                  <p className="text-xs text-gray-400">
                    Right-click to finish drawing
                  </p>
                )}
              </div>
            </Card>

            {/* Data Source Selection */}
            <Card className="p-4 bg-gray-800 border-gray-700">
              <h3 className="font-medium mb-3">Select Data Source</h3>
              <div className="space-y-2">
                {dataSources.map((source) => {
                  const Icon = dataSourceIcons[source.id as keyof typeof dataSourceIcons] || Thermometer;
                  const isSelected = source.id === selectedDataSource;
                  
                  return (
                    <button
                      key={source.id}
                      onClick={() => onDataSourceChange(source.id)}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <div className="flex-1">
                          <div className="font-medium">{source.name}</div>
                          <div className="text-sm text-gray-400">{source.unit}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Color Rules */}
            {selectedSource && (
              <Card className="p-4 bg-gray-800 border-gray-700">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  Color Scale
                </h3>
                <div className="space-y-2">
                  {selectedSource.colorRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded border border-gray-600"
                        style={{ backgroundColor: rule.color }}
                      />
                      <span className="text-sm font-mono">
                        {rule.min} - {rule.max} {selectedSource.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'polygons' && (
          <div className="p-4 space-y-4">
            {polygons.length === 0 ? (
              <Card className="p-6 bg-gray-800 border-gray-700 text-center">
                <Edit3 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 mb-2">No polygons created</p>
                <p className="text-sm text-gray-500">
                  Use the drawing tool to create polygons on the map
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {polygons.map((polygon, index) => (
                  <Card key={polygon.id} className="p-3 bg-gray-800 border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border border-gray-600"
                          style={{ backgroundColor: polygon.color }}
                        />
                        <span className="font-medium">Polygon {index + 1}</span>
                      </div>
                      <Button
                        onClick={() => onDeletePolygon(polygon.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Data Source:</span>
                        <Badge variant="secondary" className="text-xs">
                          {dataSources.find(ds => ds.id === polygon.dataSource)?.name}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Points:</span>
                        <span>{polygon.coordinates.length}</span>
                      </div>
                      {polygon.value !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Value:</span>
                          <span className="font-mono">
                            {polygon.value.toFixed(1)} {dataSources.find(ds => ds.id === polygon.dataSource)?.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}