import { useSyncExternalStore } from 'react';
import { getZustandRepos } from './zustandRepos';
import { useShopStore } from '@/stores/shopStore';

export const repos = getZustandRepos();

export const useRepos = () => {
  useSyncExternalStore(useShopStore.subscribe, useShopStore.getState);
  return repos;
};
