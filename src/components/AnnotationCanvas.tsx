import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text } from 'react-konva';
import { Annotation } from '../types';
import { cn } from '../lib/utils';

interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  tool: 'pen' | 'rect' | 'circle' | 'eraser' | 'cursor' | 'text';
  color: string;
  strokeWidth: number;
  scale?: number;
  fontFamily?: string;
}

export default function AnnotationCanvas({
  width,
  height,
  annotations,
  setAnnotations,
  tool,
  color,
  strokeWidth,
  scale = 1,
  fontFamily = 'Inter, sans-serif'
}: AnnotationCanvasProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [tempTextValue, setTempTextValue] = useState('');
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const stageRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const pos = getScaledPointerPosition();

    if (tool === 'text') {
      if (editingTextId) {
        finishEditing();
        return;
      }
      const id = crypto.randomUUID();
      setTextPos(pos);
      setEditingTextId(id);
      setTempTextValue('');
      
      const newAnnotation: Annotation = {
        id,
        type: 'text',
        color: color,
        strokeWidth: strokeWidth,
        x: pos.x,
        y: pos.y,
        content: '',
        fontSize: strokeWidth * 5,
        fontFamily: fontFamily
      };
      setAnnotations([...annotations, newAnnotation]);
      return;
    }

    setIsDrawing(true);
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

  const finishEditing = () => {
    if (!editingTextId) return;
    if (!tempTextValue.trim()) {
      setAnnotations(annotations.filter(a => a.id !== editingTextId));
    } else {
      setAnnotations(annotations.map(a => 
        a.id === editingTextId ? { ...a, content: tempTextValue } : a
      ));
    }
    setEditingTextId(null);
    setTempTextValue('');
  };

  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingTextId]);

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    if (tool === 'eraser' || tool === 'text') return;

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
      if (e.key === 'Escape' && editingTextId) {
        finishEditing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annotations, setAnnotations, editingTextId]);

  const handleEraserHit = (id: string) => {
    if (tool === 'eraser') {
      setAnnotations(annotations.filter(a => a.id !== id));
    }
  };

  return (
    <div className={cn(
      "absolute inset-0",
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
            if (ann.id === editingTextId) return null;
            
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
                  hitStrokeWidth={Math.max(20, ann.strokeWidth)}
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
            if (ann.type === 'text') {
              return (
                <Text
                  key={ann.id}
                  x={ann.x}
                  y={ann.y}
                  text={ann.content || ''}
                  fill={ann.color}
                  fontSize={ann.fontSize || 20}
                  fontFamily={ann.fontFamily || fontFamily}
                  onMouseEnter={() => isDrawing && handleEraserHit(ann.id)}
                  onClick={() => handleEraserHit(ann.id)}
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>

      {editingTextId && (
        <textarea
          ref={textareaRef}
          value={tempTextValue}
          onChange={(e) => setTempTextValue(e.target.value)}
          onBlur={finishEditing}
          className="absolute z-20 bg-transparent border-none outline-none resize-none p-0 overflow-hidden font-sans whitespace-pre-wrap pointer-events-auto"
          style={{
            left: textPos.x,
            top: textPos.y,
            color: color,
            fontSize: strokeWidth * 5,
            width: 'auto',
            minWidth: '200px',
            fontFamily: fontFamily
          }}
        />
      )}
    </div>
  );
}
