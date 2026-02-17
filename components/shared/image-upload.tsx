"use client";

import { useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  previewUrl?: string | null;
  isUploading?: boolean;
  error?: string | null;
  onReset?: () => void;
  className?: string;
}

export function ImageUpload({
  onFileSelect,
  previewUrl,
  isUploading = false,
  error,
  onReset,
  className,
}: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".heic", ".webp"],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  });

  if (previewUrl) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Image Preview */}
        <div className="relative mx-auto aspect-square max-w-md overflow-hidden rounded-lg border">
          <Image
            src={previewUrl}
            alt="Upload preview"
            fill
            className="object-cover"
          />
        </div>

        {/* Reset Button */}
        {onReset && !isUploading && (
          <div className="text-center">
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Icons.close className="h-4 w-4" />
              Choose Different Photo
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <Icons.warning className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "cursor-not-allowed opacity-50",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {isUploading ? (
            <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Icons.media className="h-8 w-8 text-primary" />
          )}
        </div>

        {isUploading ? (
          <div className="space-y-2">
            <p className="text-lg font-medium">Uploading your photo...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we process your image
            </p>
          </div>
        ) : isDragActive ? (
          <p className="text-lg font-medium">Drop your photo here</p>
        ) : (
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drag & drop your photo here, or{" "}
              <span className="text-primary">click to browse</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Supports JPG, PNG, HEIC up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <Icons.warning className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-400">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Notice */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          🔒 We do not save your original uploaded image
        </p>
      </div>
    </div>
  );
}
