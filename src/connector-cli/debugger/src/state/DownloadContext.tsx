import React, { ReactNode, createContext, useContext, useReducer } from 'react';

export type DownloadType = 'download' | 'downloadAsJson' | 'downloadAsCsv';
export type DownloadIntent = 'download' | 'open';

interface Metadata {
  key: string;
  value: string;
}

type State = {
  downloadType: DownloadType;
  downloadIntent: DownloadIntent;
  id: string;
  metadata: Metadata[];
};

type Action =
  | { type: 'SET_DOWNLOAD_TYPE'; payload: DownloadType }
  | { type: 'SET_DOWNLOAD_INTENT'; payload: DownloadIntent }
  | { type: 'SET_ID'; payload: string }
  | { type: 'ADD_METADATA'; payload: Metadata }
  | { type: 'REMOVE_METADATA'; payload: number }
  | { type: 'SET_METADATA'; payload: Metadata[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DOWNLOAD_TYPE':
      return { ...state, downloadType: action.payload };
    case 'SET_DOWNLOAD_INTENT':
      return { ...state, downloadIntent: action.payload };
    case 'SET_ID':
      return { ...state, id: action.payload };
    case 'ADD_METADATA':
      return { ...state, metadata: [...state.metadata, action.payload] };
    case 'REMOVE_METADATA':
      const newMetadata = [...state.metadata];
      newMetadata.splice(action.payload, 1);
      return { ...state, metadata: newMetadata };
    case 'SET_METADATA':
      return { ...state, metadata: action.payload };
    default:
      return state;
  }
}

const initialState: State = {
  downloadType: 'download',
  downloadIntent: 'download',
  id: '',
  metadata: [],
};

const DownloadOptionsContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => undefined });

export const DownloadOptionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <DownloadOptionsContext.Provider value={{ state, dispatch }}>
      {children}
    </DownloadOptionsContext.Provider>
  );
};

export const useDownloadOptions = () => useContext(DownloadOptionsContext);
