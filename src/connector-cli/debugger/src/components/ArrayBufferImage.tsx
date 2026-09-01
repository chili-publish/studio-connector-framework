import React, { useEffect, useState } from 'react';
import { getImageFromCache } from '../helpers/connectorRuntime';

type Props = {
  id: string;
  width: string;
  height: string;
};

const ArrayBufferImage: React.FC<Props> = ({ id, width, height }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    getImageFromCache(id)
      .then((entry) => {
        if (cancelled) {
          return;
        }

        const blob = new Blob([entry.data], {
          type: entry.contentType || 'application/octet-stream',
        });
        objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        setError(undefined);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(`${err}`);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id]);

  if (error) {
    return <div className="dbg-callout-error">{error}</div>;
  }

  return (
    <div className="dbg-image-preview">
      <div className="relative rounded-lg overflow-auto p-xl">
        <div className="text-center rounded-lg overflow-hidden w-56 sm:w-96 mx-auto">
          <img
            className="object-contain h-128 w-full"
            src={imageSrc ?? undefined}
            style={{ width, height }}
            alt="Connector result"
          />
        </div>
      </div>
    </div>
  );
};

export default ArrayBufferImage;
