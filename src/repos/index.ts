import { useSyncExternalStore } from 'react';

import { useShopStore } from '@/stores/shopStore';

import type { Repos } from './repos';
import { zustandRepos } from './zustandRepos';
import { settingsRepoApi } from './api/settingsRepoApi';
import { customersRepoApi } from './api/customersRepoApi';
import { unitsRepoApi } from './api/unitsRepoApi';
import { vendorsRepoApi } from './api/vendorsRepoApi';
import { categoriesRepoApi } from './api/categoriesRepoApi';
import { partsRepoApi } from './api/partsRepoApi';

const apiBackedRepos: Repos = {
  ...zustandRepos,
  settings: settingsRepoApi,
  customers: customersRepoApi,
  units: unitsRepoApi,
  vendors: vendorsRepoApi,
  categories: categoriesRepoApi,
  parts: partsRepoApi,
};

const repos: Repos = apiBackedRepos;

function subscribe(callback: () => void) {
  return useShopStore.subscribe(() => callback());
}

function getSnapshot(): Repos {
  return repos;
}

export function useRepos(): Repos {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export { repos };
