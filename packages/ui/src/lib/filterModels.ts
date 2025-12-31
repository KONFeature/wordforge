import type { Model, Provider } from '@opencode-ai/sdk/client';

type ModelWithReleaseDate = Model & { release_date?: string };

const MONTHS_CUTOFF = 18;

const getReleaseDateCutoff = (): Date => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MONTHS_CUTOFF);
  return cutoff;
};

const isReleaseDateValid = (releaseDate: string | undefined): boolean => {
  if (!releaseDate) return true;

  const modelDate = new Date(releaseDate);
  if (Number.isNaN(modelDate.getTime())) return true;

  return modelDate >= getReleaseDateCutoff();
};

export const isModelValid = (model: Model): boolean => {
  if (!model.capabilities?.toolcall) return false;
  if (!model.capabilities?.input?.text) return false;

  const modelWithDate = model as ModelWithReleaseDate;
  return isReleaseDateValid(modelWithDate.release_date);
};

export const filterProviderModels = (provider: Provider): Provider | null => {
  const filteredModels: Record<string, Model> = {};

  for (const [modelId, model] of Object.entries(provider.models || {})) {
    if (isModelValid(model)) {
      filteredModels[modelId] = model;
    }
  }

  if (Object.keys(filteredModels).length === 0) return null;

  return { ...provider, models: filteredModels };
};

export const filterProviders = (providers: Provider[]): Provider[] => {
  const filtered: Provider[] = [];

  for (const provider of providers) {
    const filteredProvider = filterProviderModels(provider);
    if (filteredProvider) {
      filtered.push(filteredProvider);
    }
  }

  return filtered;
};
