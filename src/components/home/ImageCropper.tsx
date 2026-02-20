import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Crop, RotateCcw, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { cropImage } from '../../lib/cropImage';
import { useAppStore } from '../../stores/appStore';

interface ImageCropperProps {
  imageSrc: string;
  originalFile: File;
}

export function ImageCropper({ imageSrc, originalFile }: ImageCropperProps) {
  const { setUploadState, setCurrentStep } = useAppStore();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);

    try {
      const blob = await cropImage(imageSrc, croppedAreaPixels);
      const croppedFile = new File(
        [blob],
        originalFile.name.replace(/\.[^.]+$/, '.jpg'),
        { type: 'image/jpeg' },
      );
      const croppedPreviewUrl = URL.createObjectURL(blob);

      setUploadState({ croppedFile, croppedPreviewUrl });
      setCurrentStep('preview');

      setTimeout(() => {
        document.getElementById('style-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 300);
    } catch (error) {
      console.error('Crop failed:', error);
      setUploadState({
        status: 'error',
        errorMessage: '画像の切り取りに失敗しました。もう一度お試しください。',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, originalFile.name, setUploadState, setCurrentStep]);

  const handleReUpload = useCallback(() => {
    useAppStore.getState().resetUpload();
  }, []);

  return (
    <div className="w-full space-y-4 p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted">
          <Crop className="w-4 h-4" />
          ドラッグで位置調整、ピンチで拡大縮小
        </div>
      </div>

      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-primary/30 bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={3 / 4}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          cropShape="rect"
          style={{
            containerStyle: { borderRadius: '1rem' },
          }}
        />
      </div>

      <div className="flex items-center gap-3 px-2">
        <ZoomOut className="w-4 h-4 text-muted shrink-0" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full accent-primary"
          aria-label="ズーム"
        />
        <ZoomIn className="w-4 h-4 text-muted shrink-0" />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleReUpload}
          disabled={isProcessing}
          className="flex-1 py-3 rounded-xl border border-border text-muted font-medium flex items-center justify-center gap-2 hover:bg-card transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          写真を変更
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isProcessing || !croppedAreaPixels}
          className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isProcessing ? '処理中...' : 'この範囲で決定'}
        </button>
      </div>
    </div>
  );
}
