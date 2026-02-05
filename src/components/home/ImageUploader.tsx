import { useCallback, useRef, useMemo } from 'react';
import { Upload } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';
import { throttle } from '../../utils/debounce';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setUploadState({
        status: 'complete',
        progress: 100,
        previewUrl: reader.result as string
      });
      setCurrentStep('preview');

      // Step2へ自動スクロール（少し遅延させてUIの更新を待つ）
      setTimeout(() => {
        document.getElementById('style-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 500);
    };
    reader.onerror = () => {
      setUploadState({ status: 'error', errorMessage: 'ファイルの読み込みに失敗しました' });
    };
    reader.readAsDataURL(file);
  }, [setUploadState, setCurrentStep, throttledProgressUpdate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      {/* Upload Area */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
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

        {uploadState.status === 'complete' && uploadState.previewUrl ? (
          <div className="relative w-full h-full min-h-[280px] p-6 animate-fadeIn">
            <img
              src={uploadState.previewUrl}
              alt="アップロードされた写真"
              className="w-full h-full object-contain max-h-[350px] rounded-xl shadow-lg"
            />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-accent-sage/90 text-white rounded-full text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              アップロード完了
            </div>
          </div>
        ) : uploadState.status === 'uploading' ? (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1">アップロード中...</p>
              <p className="text-2xl font-bold text-primary">{uploadState.progress}%</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground mb-2">写真をアップロード</p>
              <p className="text-sm text-muted mb-3">{currentCategory?.uploadHint}</p>
              <p className="text-xs text-muted/70">
                クリックまたはドラッグ&ドロップ
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted/60">
              <span className="w-1 h-1 bg-secondary rounded-full" />
              <span>最大10MB</span>
              <span className="w-1 h-1 bg-secondary rounded-full" />
              <span>JPG, PNG, WEBP対応</span>
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
