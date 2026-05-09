import { createContext } from 'svelte';

export const [getResetLayerEntries, setResetLayerEntries] = createContext<() => void>();
