import React, { useState } from 'react';
import { X } from 'lucide-react';

function PhotoThumbnail({ 
  src, 
  alt, 
  className = '', 
  showRemove = false, 
  onRemove = null,
  onClick = null 
}) {
  const [showEnlarged, setShowEnlarged] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowEnlarged(true);
    }
  };

  return (
    <>
      {/* Thumbnail */}
      <div className={`relative inline-block ${className}`}>
        <img
          src={src}
          alt={alt}
          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
          onClick={handleClick}
          title="Click to enlarge"
        />
        {showRemove && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            title="Remove photo"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Enlargement Modal */}
      {showEnlarged && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" 
          onClick={() => setShowEnlarged(false)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setShowEnlarged(false)}
              className="absolute top-2 right-2 bg-white bg-opacity-20 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-opacity-30 transition-colors z-10"
              title="Close"
            >
              ×
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default PhotoThumbnail;