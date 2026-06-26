import { uiConfig } from '../config/uiConfig';
import { colors } from '../config/theme';
import { categories as defaultCategories } from '../data/categories';
import { mobileIconCategories } from '../data/mobileCategories';

export default function CategoryScroller({
  activeCategory = null,
  onCategorySelect,
  variant = 'default',
  categories: categoriesProp = null,
}) {
  const mobile = uiConfig.mobile;
  const isIconVariant = variant === 'icon';
  const categoryItems = categoriesProp
    || (isIconVariant ? mobileIconCategories : defaultCategories);

  const handleSelect = (categoryId) => {
    onCategorySelect?.(categoryId);
  };

  return (
    <section
      className={`jb-mobile-category border-b lg:border-b-0 lg:py-4 ${
        isIconVariant ? 'jb-mobile-category--icon' : ''
      }`}
      style={{
        backgroundColor: colors.mainBg,
        borderColor: colors.border,
      }}
    >
      <div
        className="hide-scrollbar flex overflow-x-auto px-3 py-2 lg:flex-wrap lg:justify-center lg:gap-3 lg:overflow-visible lg:px-4"
        style={{ gap: mobile.categoryTabGap }}
      >
        {categoryItems.map((category) => {
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleSelect(category.id)}
              className={`jb-mobile-category-tab flex shrink-0 flex-col items-center transition-transform duration-200 active:scale-95 lg:gap-2 ${
                isActive ? 'jb-mobile-category-tab--active' : ''
              } ${isIconVariant && isActive ? 'jb-mobile-category-tab--icon-active' : ''}`}
              style={{ minWidth: mobile.categoryTabMinWidth }}
            >
              <div
                className="jb-mobile-category-tab__icon flex items-center justify-center border transition-all duration-300 lg:rounded-xl"
                style={{
                  width: mobile.categoryIconSize,
                  height: mobile.categoryIconSize,
                  borderRadius: isIconVariant
                    ? mobile.gameCardRadius
                    : (isActive ? '6px 6px 0 0' : mobile.gameCardRadius),
                  backgroundColor: isIconVariant
                    ? colors.cardBg
                    : (isActive ? '#ffffff' : colors.cardBg),
                  borderColor: isIconVariant && isActive
                    ? '#22c55e'
                    : (isActive ? 'rgba(255,255,255,0.15)' : colors.border),
                  boxShadow: isIconVariant && isActive
                    ? '0 0 10px rgba(34, 197, 94, 0.35)'
                    : undefined,
                }}
              >
                <img
                  src={category.icon}
                  alt={category.label}
                  className={`object-contain lg:h-8 lg:w-8 ${
                    isIconVariant ? 'h-full w-full max-h-[36px] max-w-[36px]' : ''
                  }`}
                  style={
                    isIconVariant
                      ? undefined
                      : {
                          width: mobile.categoryIconInner,
                          height: mobile.categoryIconInner,
                        }
                  }
                />
              </div>
              <span className="jb-mobile-category-tab__label w-full truncate px-1 text-center text-[10px] font-semibold leading-tight transition-colors duration-300 lg:rounded-full lg:px-3 lg:py-0.5 lg:text-xs">
                <span className="lg:hidden">{category.labelBn || category.label}</span>
                <span className="hidden lg:inline">{category.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
