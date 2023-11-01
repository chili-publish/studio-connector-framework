import React, { ReactNode, createContext, useContext, useReducer } from 'react';

interface QueryOption {
  pageToken: string;
  filter: string;
  collection: string;
  pageSize: number;
}

interface Metadata {
  key: string;
  value: string;
}

type State = {
  queryOptions: QueryOption;
  metadata: Metadata[];
};

type Action =
  | { type: 'SET_QUERY_OPTIONS'; payload: QueryOption }
  | { type: 'ADD_METADATA'; payload: Metadata }
  | { type: 'REMOVE_METADATA'; payload: number }
  | { type: 'SET_METADATA'; payload: Metadata[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_QUERY_OPTIONS':
      return { ...state, queryOptions: action.payload };
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
  queryOptions: { pageToken: '', filter: '', collection: '', pageSize: 10 },
  metadata: [],
};

const QueryOptionsContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => undefined });

export const QueryOptionsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <QueryOptionsContext.Provider value={{ state, dispatch }}>
      {children}
    </QueryOptionsContext.Provider>
  );
};

export const useQueryOptions = () => useContext(QueryOptionsContext);
