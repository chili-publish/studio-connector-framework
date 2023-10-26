import React, { useState, useEffect } from 'react';

type Props = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
};

const ArrayBufferImage: React.FC<Props> = ({ buffer, width, height }) => {
  const [imageSrc, setImageSrc] = useState<String | null>(null);

  useEffect(() => {
    if (buffer) {
      const blob = new Blob([buffer], { type: 'image/jpeg' }); // change the type if you're dealing with different image format
      const url = URL.createObjectURL(blob);
      setImageSrc(url);

      // Clean up function to revoke the object URL
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [buffer]);

  return (
    <div>
      {imageSrc && (
        <img
          width={width}
          height={height}
          src={imageSrc.toString()}
          alt="Array Buffer"
        />
      )}
    </div>
  );
};

export default ArrayBufferImage;
