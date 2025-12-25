import { useSyncExternalStore } from "react";
import type { Repos } from "./repos";
import { zustandRepos } from "./zustandRepos";
import { useShopStore } from "@/stores/shopStore";
import { settingsRepoApi } from "./api/settingsRepoApi";

const apiBackedRepos: Repos = {
  ...zustandRepos,
  settings: settingsRepoApi,
};

export const repos: Repos = apiBackedRepos;

function subscribe(listener: () => void) {
  const unsubscribe = useShopStore.subscribe(() => {
    listener();
  });
  return unsubscribe;
}

function getSnapshot(): Repos {
  return repos;
}

export function useRepos(): Repos {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
