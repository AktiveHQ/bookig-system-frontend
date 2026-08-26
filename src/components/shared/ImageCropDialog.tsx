import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

type ImageCropDialogProps = {
  image: string;
  open: boolean;
  onApply: (image: string) => void;
  onOpenChange: (open: boolean) => void;
};

const CROP_SIZE = 720;

const ImageCropDialog = ({
  image,
  open,
  onApply,
  onOpenChange,
}: ImageCropDialogProps) => {
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setX(50);
    setY(50);
  }, [open, image]);

  const applyCrop = async () => {
    try {
      const cropped = await cropImage(image, { zoom, x, y });
      onApply(cropped);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Could not adjust photo',
        description: error instanceof Error ? error.message : 'Please upload the image again and retry.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Adjust photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border bg-muted">
            <img
              src={image}
              alt="Crop preview"
              className="h-full w-full object-cover"
              style={{
                objectPosition: `${x}% ${y}%`,
                transform: `scale(${zoom})`,
              }}
            />
          </div>

          <div className="space-y-3">
            <RangeControl label="Zoom" max={2} min={1} step={0.01} value={zoom} onChange={setZoom} />
            <RangeControl label="Horizontal" max={100} min={0} step={1} value={x} onChange={setX} />
            <RangeControl label="Vertical" max={100} min={0} step={1} value={y} onChange={setY} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={applyCrop}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RangeControl = ({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) => (
  <label className="block text-sm font-medium">
    <span>{label}</span>
    <input
      className="mt-2 block w-full accent-[#020c1a]"
      max={max}
      min={min}
      onChange={event => onChange(Number(event.target.value))}
      step={step}
      type="range"
      value={value}
    />
  </label>
);

const cropImage = (
  imageSrc: string,
  crop: { zoom: number; x: number; y: number },
) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not prepare image editor'));
        return;
      }

      const baseScale = Math.max(
        CROP_SIZE / image.naturalWidth,
        CROP_SIZE / image.naturalHeight,
      );
      const scale = baseScale * crop.zoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const extraX = Math.max(width - CROP_SIZE, 0);
      const extraY = Math.max(height - CROP_SIZE, 0);
      const left = -(extraX * crop.x) / 100;
      const top = -(extraY * crop.y) / 100;

      try {
        context.drawImage(image, left, top, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        reject(new Error('Please upload the image again before adjusting it.'));
      }
    };
    image.onerror = () => reject(new Error('Could not load image'));
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
  });

export default ImageCropDialog;
