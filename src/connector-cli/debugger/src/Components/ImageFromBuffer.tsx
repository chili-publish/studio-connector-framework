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
      // buffer is now the actual ArrayBuffer; fall back to cache lookup for
      // older pointer-style values ({ id, bytes }).
      const resolveBuffer =
        buffer instanceof ArrayBuffer
          ? Promise.resolve(buffer)
          : getImageFromCache((buffer as any).id ?? buffer);

      resolveBuffer.then((image) => {
        const blob = new Blob([image], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setImageSrc(url);

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
