import React, { FC, ReactNode, createContext, useContext, useReducer } from 'react';

export interface Header {
  HttpHeader: string;
  HttpValue: string;
}

type State = {
  headers: Header[];
};

type Action =
  | { type: 'ADD_HEADER'; payload: Header }
  | { type: 'SET_HEADERS'; payload: Header[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_HEADER':
      return { ...state, headers: [...state.headers, action.payload] };
    case 'SET_HEADERS':
      return { ...state, headers: action.payload };
    default:
      return state;
  }
}

const initialState: State = { headers: [] };

const DataContext = createContext<{
    state: State;
    dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => undefined });

type Props = {
    children: ReactNode;
};

export const DataProvider: FC<Props> = (props: Props) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    
    return (
        <DataContext.Provider value={{ state, dispatch }}>
            <>{props.children}</>
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
