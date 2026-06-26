import CategoryNavBar, { getCategoryLabel } from './CategoryNavBar';
import GameGrid from './GameGrid';
import ProviderGrid from './ProviderGrid';
import { shouldShowProviderList } from '../utils/categoryNavigation';
import { colors } from '../config/theme';

export default function GameCategoryNavigator({
  selectedCategory,
  selectedProvider,
  selectedGameTitle,
  onProviderSelect,
  onProviderClear,
  onCategoryReset,
  hotPreviewLimit,
}) {
  const category = selectedCategory || 'hot';
  const showProviders = shouldShowProviderList({
    category,
    provider: selectedProvider,
    gameTitle: selectedGameTitle,
  });

  const handleProviderPick = (provider) => {
    onProviderSelect?.({
      filterCategory: category,
      filterProvider: provider.code || provider.name,
    });
  };

  return (
    <section className="jb-mobile-section px-3 py-3 lg:px-4 lg:py-5" style={{ backgroundColor: colors.mainBg }}>
      {showProviders ? (
        <>
          <CategoryNavBar
            title={getCategoryLabel(category)}
            subtitle="Select a provider"
            onBack={onCategoryReset}
            backLabel="Categories"
          />
          <ProviderGrid
            category={category}
            onProviderSelect={handleProviderPick}
          />
        </>
      ) : (
        <>
          {selectedProvider && !selectedGameTitle ? (
            <CategoryNavBar
              title={selectedProvider}
              subtitle={getCategoryLabel(category)}
              onBack={onProviderClear}
              backLabel="Providers"
            />
          ) : null}
          <GameGrid
            selectedCategory={selectedCategory}
            selectedProvider={selectedProvider}
            selectedGameTitle={selectedGameTitle}
            hotPreviewLimit={hotPreviewLimit}
            embedded
          />
        </>
      )}
    </section>
  );
}
