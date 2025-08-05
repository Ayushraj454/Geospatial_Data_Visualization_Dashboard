'use client';

import { useState, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { format, addHours, differenceInHours, startOfHour, isWithinInterval } from 'date-fns';

interface TimelineSliderProps {
  currentTime: Date;
  timeRange: { start: Date; end: Date };
  minDate: Date;
  maxDate: Date;
  onTimeChange: (time: Date) => void;
  onRangeChange: (range: { start: Date; end: Date }) => void;
}

export function TimelineSlider({
  currentTime,
  timeRange,
  minDate,
  maxDate,
  onTimeChange,
  onRangeChange
}: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // milliseconds

  const totalHours = differenceInHours(maxDate, minDate);
  const currentHourIndex = differenceInHours(currentTime, minDate);
  const rangeStartIndex = differenceInHours(timeRange.start, minDate);
  const rangeEndIndex = differenceInHours(timeRange.end, minDate);

  const handleTimeSliderChange = useCallback((value: number[]) => {
    const newTime = addHours(minDate, value[0]);
    onTimeChange(startOfHour(newTime));
  }, [minDate, onTimeChange]);

  const handleRangeSliderChange = useCallback((value: number[]) => {
    const newStart = addHours(minDate, value[0]);
    const newEnd = addHours(minDate, value[1]);
    onRangeChange({
      start: startOfHour(newStart),
      end: startOfHour(newEnd)
    });
  }, [minDate, onRangeChange]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleStepBackward = useCallback(() => {
    const newTime = addHours(currentTime, -1);
    if (isWithinInterval(newTime, { start: minDate, end: maxDate })) {
      onTimeChange(newTime);
    }
  }, [currentTime, minDate, maxDate, onTimeChange]);

  const handleStepForward = useCallback(() => {
    const newTime = addHours(currentTime, 1);
    if (isWithinInterval(newTime, { start: minDate, end: maxDate })) {
      onTimeChange(newTime);
    }
  }, [currentTime, minDate, maxDate, onTimeChange]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const nextTime = addHours(currentTime, 1);
      if (isWithinInterval(nextTime, { start: minDate, end: maxDate })) {
        onTimeChange(nextTime);
      } else {
        setIsPlaying(false); // Stop when reaching the end
      }
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, minDate, maxDate, onTimeChange, playbackSpeed]);

  return (
    <Card className="p-4 bg-gray-800 border-gray-700">
      <div className="space-y-4">
        {/* Time Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStepBackward}
              variant="outline"
              size="sm"
              disabled={currentHourIndex <= 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleStepForward}
              variant="outline"
              size="sm"
              disabled={currentHourIndex >= totalHours}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded text-sm px-2 py-1"
              >
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={250}>4x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Current Time Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Current Time</label>
            <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">
              {format(currentTime, 'MMM dd, HH:mm')}
            </span>
          </div>
          <Slider
            value={[currentHourIndex]}
            onValueChange={handleTimeSliderChange}
            max={totalHours}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{format(minDate, 'MMM dd')}</span>
            <span>{format(maxDate, 'MMM dd')}</span>
          </div>
        </div>

        {/* Time Range Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Analysis Range</label>
            <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">
              {format(timeRange.start, 'MMM dd, HH:mm')} - {format(timeRange.end, 'MMM dd, HH:mm')}
            </span>
          </div>
          <Slider
            value={[rangeStartIndex, rangeEndIndex]}
            onValueChange={handleRangeSliderChange}
            max={totalHours}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Range: {differenceInHours(timeRange.end, timeRange.start)}h</span>
            <span>Total: {totalHours}h available</span>
          </div>
        </div>
      </div>
    </Card>
  );
}