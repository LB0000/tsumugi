import { useCallback, useRef, useMemo, useState } from 'react';
import { Upload, FileImage, HardDrive, Info, ImageIcon, Camera, Crop } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';
import { throttle } from '../../utils/debounce';
import { trackEvent } from '../../lib/analytics';
import { ImageCropper } from './ImageCropper';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const {
    selectedCategory,
    uploadState,
    setUploadState,
    setCurrentStep
  } = useAppStore();

  // Memoize category lookup
  const currentCategory = useMemo(
    () => categories.find(c => c.id === selectedCategory),
    [selectedCategory]
  );

  // Throttled progress update (every 100ms)
  const throttledProgressUpdate = useMemo(
    () => throttle((progress: number) => {
      setUploadState({ progress });
    }, 100),
    [setUploadState]
  );

  const handleFile = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadState({ status: 'error', errorMessage: '画像ファイルをアップロードしてください' });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadState({ status: 'error', errorMessage: 'ファイルサイズは10MB以下にしてください' });
      return;
    }

    setUploadState({ status: 'uploading', progress: 0 });

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        throttledProgressUpdate(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = () => {
      // クロップ状態をリセットして新しい画像でクロッパーを表示
      setUploadState({
        status: 'complete',
        progress: 100,
        previewUrl: reader.result as string,
        rawFile: file,
        croppedFile: null,
        croppedPreviewUrl: null,
      });
      trackEvent('image_upload');
      // setCurrentStep('preview') と自動スクロールはクロップ確定時に実行
    };
    reader.onerror = () => {
      setUploadState({ status: 'error', errorMessage: 'ファイルの読み込みに失敗しました' });
    };
    reader.readAsDataURL(file);
  }, [setUploadState, throttledProgressUpdate]);

  const [dragActive, setDragActive] = useState(false);
  const [dragValid, setDragValid] = useState<boolean | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
    if (e.dataTransfer.items.length > 0) {
      setDragValid(e.dataTransfer.items[0].type.startsWith('image/'));
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragValid(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragValid(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* アップロード要件パネル（2.3: ファイル制限の明確化） */}
      {uploadState.status !== 'complete' && (
        <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-border/50">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-foreground mb-2">アップロード要件</p>
              <ul className="space-y-1.5 text-muted">
                <li className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span><strong>ファイル形式:</strong> JPG, PNG, WEBP</span>
                </li>
                <li className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span><strong>最大サイズ:</strong> 10MB</span>
                </li>
                <li className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span><strong>推奨解像度:</strong> 1024×1024 px以上</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="画像をアップロード。クリックまたはドラッグ&ドロップで画像を選択"
        aria-describedby={uploadState.status === 'error' ? 'upload-error' : undefined}
        className={`
          w-full min-h-[280px] border-2 border-dashed rounded-2xl
          flex flex-col items-center justify-center gap-4 cursor-pointer
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background
          group
          ${uploadState.status === 'complete'
            ? 'border-accent-sage bg-accent-sage/5'
            : dragActive && dragValid
              ? 'border-accent-sage bg-accent-sage/5'
              : dragActive && dragValid === false
                ? 'border-sale bg-sale/5'
                : 'border-border/50 hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent'
          }
        `}
      >
        <label htmlFor="file-upload" className="sr-only">
          画像ファイルを選択
        </label>
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        <label htmlFor="camera-upload" className="sr-only">
          カメラで写真を撮影
        </label>
        <input
          id="camera-upload"
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {uploadState.status === 'complete' && uploadState.previewUrl && uploadState.rawFile && !uploadState.croppedFile ? (
          /* クロップ未完了: クロッパー表示 */
          <div className="w-full animate-fadeIn" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <ImageCropper
              imageSrc={uploadState.previewUrl}
              originalFile={uploadState.rawFile}
            />
          </div>
        ) : uploadState.status === 'complete' && uploadState.croppedPreviewUrl ? (
          /* クロップ完了: プレビュー表示 */
          <div className="relative w-full h-full min-h-[280px] p-6 animate-fadeIn">
            <img
              src={uploadState.croppedPreviewUrl}
              alt="切り取り済みの写真"
              className="w-full h-full object-contain max-h-[350px] rounded-xl shadow-lg"
            />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <div className="px-4 py-2 bg-accent-sage/90 text-white rounded-full text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                アップロード完了
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadState({ croppedFile: null, croppedPreviewUrl: null });
                }}
                className="px-3 py-2 bg-foreground/70 text-white rounded-full text-sm font-medium flex items-center gap-1.5 hover:bg-foreground/80 transition-colors"
              >
                <Crop className="w-3.5 h-3.5" />
                切り直す
              </button>
            </div>
          </div>
        ) : uploadState.status === 'uploading' ? (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none" className="text-border" />
                <circle
                  cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - (uploadState.progress || 0) / 100)}`}
                  className="text-primary transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{uploadState.progress}%</span>
              </div>
            </div>
            <p className="text-foreground font-medium">アップロード中...</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground mb-2">写真をアップロード</p>
              <p className="text-sm text-muted mb-3">{currentCategory?.uploadHint}</p>
              <p className="text-xs text-muted/70 hidden sm:block">
                クリックまたはドラッグ&ドロップ
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:hidden w-full px-4" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-3 rounded-lg bg-primary text-white font-medium flex items-center justify-center gap-2 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <Camera className="w-5 h-5" />
                カメラで撮影
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-lg border border-primary text-primary font-medium flex items-center justify-center gap-2 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <ImageIcon className="w-5 h-5" />
                ライブラリから選ぶ
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted bg-card/50 rounded-lg px-4 py-2 border border-border/30">
              <div className="flex items-center gap-1.5">
                <FileImage className="w-4 h-4 text-secondary" />
                <span>JPG, PNG, WEBP</span>
              </div>
              <span className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-secondary" />
                <span>最大10MB</span>
              </div>
            </div>
          </>
        )}

        {uploadState.status === 'error' && (
          <div className="animate-fadeIn px-4 py-2 bg-sale/10 border border-sale/20 rounded-lg">
            <p id="upload-error" role="alert" className="text-sale text-sm font-medium">
              {uploadState.errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
