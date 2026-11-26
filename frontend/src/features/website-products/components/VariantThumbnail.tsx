import React, { useEffect, useState } from "react";
import { Package } from "lucide-react";

interface VariantThumbnailProps {
  src: string | null;
  alt: string;
  size?: "sm" | "lg";
}

/**
 * Hiển thị ảnh thu nhỏ của biến thể sản phẩm, tự động fallback về biểu tượng mặc định nếu không có ảnh hoặc lỗi tải.
 */
export const VariantThumbnail: React.FC<VariantThumbnailProps> = ({
  src,
  alt,
  size = "sm",
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const boxClass =
    size === "lg"
      ? "h-16 w-16 rounded-2xl p-2"
      : "h-11 w-11 rounded-xl p-1.5";
  const iconClass = size === "lg" ? "h-6 w-6" : "h-4 w-4";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-slate-800 bg-slate-950/90 flex items-center justify-center ${boxClass}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <Package aria-hidden="true" className={`${iconClass} text-slate-500`} />
      )}
    </div>
  );
};
