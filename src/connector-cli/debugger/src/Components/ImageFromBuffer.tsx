import React, { useEffect, useState } from 'react';
import { getImageFromCache } from '../Helpers/ConnectorRuntime';

type Props = {
  buffer: ArrayBuffer;
  width: string;
  height: string;
};

const ArrayBufferImage: React.FC<Props> = ({ buffer, width, height }) => {
  const [imageSrc, setImageSrc] = useState<String | null>(null);

  useEffect(() => {
    if (buffer) {
      getImageFromCache(buffer).then((image) => {
        const blob = new Blob([image], { type: 'image/jpeg' }); // change the type if you're dealing with different image format
        const url = URL.createObjectURL(blob);
        setImageSrc(url);

        // Clean up function to revoke the object URL
        return () => {
          URL.revokeObjectURL(url);
        };
      });
    }
  }, [buffer]);

  return (
    <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden dark:bg-slate-800/25 w-1/2">
      <div className="relative rounded-xl overflow-auto p-8">
        <div className="text-center rounded-lg overflow-hidden w-56 sm:w-96 mx-auto">
          <img
            className="object-contain h-128 w-full "
            src={imageSrc?.toString()}
          />
        </div>
      </div>
    </div>
  );
};

export default ArrayBufferImage;
