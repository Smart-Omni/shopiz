import React, { createContext, useContext, useEffect, useState } from "react";
import {
  products as initialProducts,
  categories as initialCategories,
} from "../../data/catalog";
import catalogService, { mapBackendProduct } from "../../services/catalogService";

const CatalogContext = createContext({
  products: initialProducts,
  categories: initialCategories,
  loading: true,
  refreshCatalog: () => {},
});

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(true);

  async function loadCatalog() {
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        catalogService.getProducts({ pageSize: 100 }),
        catalogService.getCategories(),
      ]);

      let liveItems = [];
      if (prodRes.status === "fulfilled" && prodRes.value?.products?.length) {
        const rawProducts = prodRes.value.products.filter(
          (item) => item.item_status !== "SELLER_DELETE",
        );

        // Fetch extra_info for all items to guarantee live metrics (sales, rating, views, likes)
        const shopGroups = {};
        for (const p of rawProducts) {
          const sid = p.shop_id || p.shopId;
          if (sid) {
            shopGroups[sid] = shopGroups[sid] || [];
            shopGroups[sid].push(p.item_id);
          }
        }

        let extraMap = {};
        try {
          const extraPromises = Object.entries(shopGroups).map(([sid, ids]) =>
            catalogService.getItemExtraInfo(sid, ids).catch(() => []),
          );
          const extraResults = await Promise.all(extraPromises);
          for (const list of extraResults) {
            for (const m of list) {
              extraMap[String(m.item_id)] = m;
            }
          }
        } catch {
          extraMap = {};
        }

        liveItems = rawProducts.map((p) => {
          const extra = extraMap[String(p.item_id)];
          const enriched = extra
            ? {
                ...p,
                sales: extra.sale,
                sale: extra.sale,
                sold: extra.sale,
                rating_star: extra.rating_star,
                comment_count: extra.comment_count,
                views: extra.views,
                likes: extra.likes,
              }
            : p;
          return mapBackendProduct(enriched);
        });
      }

      if (liveItems.length) {
        setProducts(liveItems);
        // Keep in-memory catalog.js array synchronized for synchronous lookups
        initialProducts.splice(0, initialProducts.length, ...liveItems);
      }

      if (catRes.status === "fulfilled" && catRes.value?.length) {
        const serverCatNames = catRes.value.map((c) => c.category_name);
        const itemCatNames = liveItems.map((p) => p.category);
        const uniqueCategories = [
          ...new Set([...serverCatNames, ...itemCatNames].filter(Boolean)),
        ];

        setCategories(uniqueCategories);
        initialCategories.splice(
          0,
          initialCategories.length,
          ...uniqueCategories,
        );
      }
    } catch {
      // Backend offline fallback: retain initial mock catalog
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  return (
    <CatalogContext.Provider
      value={{
        products,
        categories,
        loading,
        refreshCatalog: loadCatalog,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}
export default CatalogProvider;
