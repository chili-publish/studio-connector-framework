import React, { ReactNode, createContext, useContext, useReducer } from 'react';

interface DetailOption {
  id: string;
}

interface Metadata {
  key: string;
  value: string;
}

type State = {
  detailOptions: DetailOption;
  metadata: Metadata[];
};

type Action =
  | { type: 'SET_DETAIL_OPTIONS'; payload: DetailOption }
  | { type: 'ADD_METADATA'; payload: Metadata }
  | { type: 'REMOVE_METADATA'; payload: number }
  | { type: 'SET_METADATA'; payload: Metadata[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DETAIL_OPTIONS':
      return { ...state, detailOptions: action.payload };
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

const initialState: State = { detailOptions: { id: '' }, metadata: [] };

const DetailOptionsContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => undefined });

export const DetailOptionsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <DetailOptionsContext.Provider value={{ state, dispatch }}>
      {children}
    </DetailOptionsContext.Provider>
  );
};

export const useDetailOptions = () => useContext(DetailOptionsContext);
