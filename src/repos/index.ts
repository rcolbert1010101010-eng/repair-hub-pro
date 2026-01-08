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
import { techniciansRepoApi } from './api/techniciansRepoApi';

const apiBackedRepos: Repos = {
  ...zustandRepos,
  settings: settingsRepoApi,
  customers: customersRepoApi,
  customerContacts: zustandRepos.customerContacts,
  units: unitsRepoApi,
  unitAttachments: zustandRepos.unitAttachments,
  vendors: vendorsRepoApi,
  categories: categoriesRepoApi,
  parts: partsRepoApi,
  technicians: techniciansRepoApi,
  invoices: {
    createFromSalesOrder: () => {
      throw new Error('Not implemented');
    },
    getById: () => {
      throw new Error('Not implemented');
    },
    listLines: () => {
      throw new Error('Not implemented');
    },
  },
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
