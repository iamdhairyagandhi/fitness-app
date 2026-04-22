// ── Food API ─────────────────────────────────────────────────
// Primary: OpenFoodFacts (free, no key required)
// Secondary: USDA FoodData Central (free, key optional)
// ─────────────────────────────────────────────────────────────

import type { FoodItem } from '@/types';

// ── OpenFoodFacts ────────────────────────────────────────────

const OFF_BASE = 'https://world.openfoodfacts.org';

interface OFFProduct {
    code: string;
    product_name?: string;
    brands?: string;
    serving_quantity?: number;
    serving_size?: string;
    nutriments?: {
        'energy-kcal_100g'?: number;
        'energy-kcal_serving'?: number;
        proteins_100g?: number;
        proteins_serving?: number;
        carbohydrates_100g?: number;
        carbohydrates_serving?: number;
        fat_100g?: number;
        fat_serving?: number;
        fiber_100g?: number;
        fiber_serving?: number;
        sugars_100g?: number;
        sugars_serving?: number;
        sodium_100g?: number;
        sodium_serving?: number;
    };
    image_url?: string;
    image_front_url?: string;
}

function parseServingGrams(servingSize?: string): number {
    if (!servingSize) return 100;
    const match = servingSize.match(/(\d+\.?\d*)\s*(g|ml)/i);
    return match ? parseFloat(match[1]) : 100;
}

function mapOFFProduct(product: OFFProduct): FoodItem | null {
    if (!product.product_name) return null;
    const n = product.nutriments;
    if (!n) return null;

    const servingG = product.serving_quantity || parseServingGrams(product.serving_size);
    const usePer100 = !n['energy-kcal_serving'];
    const factor = usePer100 ? servingG / 100 : 1;

    return {
        id: product.code || `off_${Date.now()}`,
        name: product.product_name,
        brand: product.brands || null,
        barcode: product.code || null,
        serving_size_g: servingG,
        serving_unit: 'g',
        calories: Math.round((usePer100 ? (n['energy-kcal_100g'] || 0) : (n['energy-kcal_serving'] || 0)) * factor),
        protein_g: Math.round(((usePer100 ? n.proteins_100g : n.proteins_serving) || 0) * factor * 10) / 10,
        carbs_g: Math.round(((usePer100 ? n.carbohydrates_100g : n.carbohydrates_serving) || 0) * factor * 10) / 10,
        fat_g: Math.round(((usePer100 ? n.fat_100g : n.fat_serving) || 0) * factor * 10) / 10,
        fiber_g: Math.round(((usePer100 ? n.fiber_100g : n.fiber_serving) || 0) * factor * 10) / 10,
        sugar_g: Math.round(((usePer100 ? n.sugars_100g : n.sugars_serving) || 0) * factor * 10) / 10,
        sodium_mg: Math.round(((usePer100 ? (n.sodium_100g || 0) * 1000 : (n.sodium_serving || 0) * 1000)) * factor),
        is_custom: false,
        user_id: null,
        image_url: product.image_front_url || product.image_url || null,
    };
}

/**
 * Search foods by text query via OpenFoodFacts
 */
export async function searchFoods(query: string, page = 1, pageSize = 20): Promise<FoodItem[]> {
    try {
        const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=${pageSize}&fields=code,product_name,brands,serving_quantity,serving_size,nutriments,image_url,image_front_url`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OFF search ${response.status}`);
        const data = await response.json();
        const products: OFFProduct[] = data.products || [];
        return products.map(mapOFFProduct).filter(Boolean) as FoodItem[];
    } catch (err) {
        console.warn('OpenFoodFacts search failed:', err);
        return [];
    }
}

/**
 * Look up a food item by barcode via OpenFoodFacts
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
    try {
        const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,serving_quantity,serving_size,nutriments,image_url,image_front_url`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OFF barcode ${response.status}`);
        const data = await response.json();
        if (data.status !== 1 || !data.product) return null;
        return mapOFFProduct(data.product);
    } catch (err) {
        console.warn('Barcode lookup failed:', err);
        return null;
    }
}

// ── USDA FoodData Central (optional fallback) ────────────────

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';

interface USDAFood {
    fdcId: number;
    description: string;
    brandName?: string;
    brandOwner?: string;
    servingSize?: number;
    servingSizeUnit?: string;
    foodNutrients: Array<{
        nutrientId?: number;
        nutrientName?: string;
        value?: number;
    }>;
}

function getNutrient(nutrients: USDAFood['foodNutrients'], id: number): number {
    const n = nutrients.find((x) => x.nutrientId === id);
    return n?.value || 0;
}

function mapUSDAFood(food: USDAFood): FoodItem {
    const servingG = food.servingSize || 100;
    const n = food.foodNutrients;

    return {
        id: `usda_${food.fdcId}`,
        name: food.description,
        brand: food.brandName || food.brandOwner || null,
        barcode: null,
        serving_size_g: servingG,
        serving_unit: food.servingSizeUnit || 'g',
        calories: Math.round(getNutrient(n, 1008)),   // Energy
        protein_g: Math.round(getNutrient(n, 1003) * 10) / 10,  // Protein
        carbs_g: Math.round(getNutrient(n, 1005) * 10) / 10,    // Carbohydrate
        fat_g: Math.round(getNutrient(n, 1004) * 10) / 10,      // Total fat
        fiber_g: Math.round(getNutrient(n, 1079) * 10) / 10,    // Fiber
        sugar_g: Math.round(getNutrient(n, 2000) * 10) / 10,    // Total sugars
        sodium_mg: Math.round(getNutrient(n, 1093)),             // Sodium
        is_custom: false,
        user_id: null,
        image_url: null,
    };
}

/**
 * Search USDA FoodData Central (fallback if OFF returns no results)
 */
export async function searchFoodsUSDA(query: string, pageSize = 15): Promise<FoodItem[]> {
    try {
        const response = await fetch(`${USDA_BASE}/foods/search?api_key=${encodeURIComponent(USDA_API_KEY)}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR Legacy,Branded`);
        if (!response.ok) throw new Error(`USDA search ${response.status}`);
        const data = await response.json();
        const foods: USDAFood[] = data.foods || [];
        return foods.map(mapUSDAFood);
    } catch (err) {
        console.warn('USDA search failed:', err);
        return [];
    }
}

/**
 * Combined search — tries OpenFoodFacts first, falls back to USDA
 */
export async function searchFoodsCombined(query: string): Promise<FoodItem[]> {
    const offResults = await searchFoods(query);
    if (offResults.length >= 5) return offResults;

    // Supplement with USDA results
    const usdaResults = await searchFoodsUSDA(query);
    const seen = new Set(offResults.map((f) => f.name.toLowerCase()));
    const unique = usdaResults.filter((f) => !seen.has(f.name.toLowerCase()));
    return [...offResults, ...unique];
}
