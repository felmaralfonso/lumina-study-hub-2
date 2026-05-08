import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { Annotation } from '../types';
import { cn } from '../lib/utils';

interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  tool: 'pen' | 'rect' | 'circle' | 'eraser' | 'cursor';
  color: string;
  strokeWidth: number;
  scale?: number;
}

export default function AnnotationCanvas({
  width,
  height,
  annotations,
  setAnnotations,
  tool,
  color,
  strokeWidth,
  scale = 1
}: AnnotationCanvasProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<any>(null);

  const getScaledPointerPosition = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    return {
      x: pointer.x / scale,
      y: pointer.y / scale
    };
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'cursor') return;
    if (tool === 'eraser') {
      setIsDrawing(true);
      return;
    }
    setIsDrawing(true);
    const pos = getScaledPointerPosition();
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: tool,
      color: color,
      strokeWidth: strokeWidth,
      points: tool === 'pen' ? [pos.x, pos.y] : undefined,
      x: tool !== 'pen' ? pos.x : undefined,
      y: tool !== 'pen' ? pos.y : undefined,
      width: 0,
      height: 0,
    };
    setAnnotations([...annotations, newAnnotation]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    if (tool === 'eraser') return; // Eraser handling moved to hover/hit events

    const point = getScaledPointerPosition();
    const lastAnnotation = { ...annotations[annotations.length - 1] };

    if (tool === 'pen') {
      lastAnnotation.points = lastAnnotation.points?.concat([point.x, point.y]);
    } else {
      lastAnnotation.width = point.x - (lastAnnotation.x || 0);
      lastAnnotation.height = point.y - (lastAnnotation.y || 0);
    }

    const newAnnotations = annotations.slice(0, annotations.length - 1);
    newAnnotations.push(lastAnnotation);
    setAnnotations(newAnnotations);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        setAnnotations(annotations.slice(0, -1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annotations, setAnnotations]);

  const handleEraserHit = (id: string) => {
    if (tool === 'eraser') {
      setAnnotations(annotations.filter(a => a.id !== id));
    }
  };

  return (
    <div className={cn(
      "absolute inset-0 z-10",
      tool === 'cursor' ? "pointer-events-none" : "pointer-events-auto"
    )}>
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        ref={stageRef}
      >
        <Layer>
          {annotations.map((ann) => {
            if (ann.type === 'pen' && ann.points) {
              return (
                <Line
                  key={ann.id}
                  points={ann.points}
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  onMouseEnter={() => isDrawing && handleEraserHit(ann.id)}
                  onClick={() => handleEraserHit(ann.id)}
                  hitStrokeWidth={Math.max(20, ann.strokeWidth)} // Make it easier to "hit" with eraser
                />
              );
            }
            if (ann.type === 'rect') {
              return (
                <Rect
                  key={ann.id}
                  x={ann.x}
                  y={ann.y}
                  width={ann.width}
                  height={ann.height}
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  onMouseEnter={() => isDrawing && handleEraserHit(ann.id)}
                  onClick={() => handleEraserHit(ann.id)}
                />
              );
            }
            if (ann.type === 'circle') {
              return (
                <Circle
                  key={ann.id}
                  x={ann.x}
                  y={ann.y}
                  radius={Math.sqrt(Math.pow(ann.width || 0, 2) + Math.pow(ann.height || 0, 2))}
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  onMouseEnter={() => isDrawing && handleEraserHit(ann.id)}
                  onClick={() => handleEraserHit(ann.id)}
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
