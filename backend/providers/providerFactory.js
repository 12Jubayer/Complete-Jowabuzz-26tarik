import demoProvider from './demoProvider.js';

const registry = {
  demo: demoProvider,
};

export function getProviderAdapter(adapterKey = 'demo') {
  return registry[adapterKey] || demoProvider;
}

export function registerProviderAdapter(key, adapter) {
  registry[key] = adapter;
}

export default getProviderAdapter;
