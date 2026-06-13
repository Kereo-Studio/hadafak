import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../theme/colors';
import {
  Flame,
  Plus,
  Trash2,
  Search,
  GlassWater,
  Sparkles,
  Check,
  ChevronRight,
  Apple,
  X,
  PlusCircle,
  TrendingUp,
  Clock,
  Utensils,
  BookOpen,
  Camera,
  Upload,
  ScanBarcode,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { api } from '../services/api';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

const { width } = Dimensions.get('window');

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
  servingUnit?: string;
}

interface LoggedMeal {
  id: string;
  mealType: string;
  quantity: number;
  food: {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
    servingUnit: string;
  };
}

export const NutritionScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'recipes'>('tracker');

  // Daily consumption details
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    calories: { target: 2000, consumed: 0, remaining: 2000 },
    protein: { target: 130, consumed: 0, remaining: 130 },
    carbs: { target: 225, consumed: 0, remaining: 225 },
    fat: { target: 55, consumed: 0, remaining: 55 },
    water: { target: 2500, consumed: 0, remaining: 2500 },
  });
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);

  // Recipes Hub states
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipesQuery, setRecipesQuery] = useState('');
  const [selectedRecipeTag, setSelectedRecipeTag] = useState<string>('');
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<any>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // AI Fridge Generator states
  const [isFridgeModalVisible, setIsFridgeModalVisible] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState('');
  const [fridgePrompt, setFridgePrompt] = useState('');
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  // Logging Recipe states
  const [isLogRecipeModalVisible, setIsLogRecipeModalVisible] = useState(false);
  const [logRecipeMealType, setLogRecipeMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [logRecipeServings, setLogRecipeServings] = useState('1');
  const [isLoggingRecipe, setIsLoggingRecipe] = useState(false);

  // Substitution states
  const [selectedIngredientToSubstitute, setSelectedIngredientToSubstitute] = useState<any>(null);
  const [substituteNameInput, setSubstituteNameInput] = useState('');
  const [substitutionResult, setSubstitutionResult] = useState<any>(null);
  const [isSubstituting, setIsSubstituting] = useState(false);

  // Load recipes from API
  const fetchRecipes = async (queryText = '', tagVal = '') => {
    setLoadingRecipes(true);
    try {
      const params: any = {};
      if (queryText) params.query = queryText;
      if (tagVal) params.tag = tagVal;

      const res = await api.get('/recipes', { params });
      setRecipes(res.data || []);
    } catch (err) {
      console.warn('Error fetching recipes:', err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Trigger search on query/tag change
  useEffect(() => {
    if (activeTab === 'recipes') {
      fetchRecipes(recipesQuery, selectedRecipeTag);
    }
  }, [recipesQuery, selectedRecipeTag, activeTab]);

  // AI Recipe generation handler
  const handleGenerateAiRecipe = async () => {
    if (!fridgeIngredients.trim()) {
      Alert.alert('Missing Input', 'Please type at least one ingredient.');
      return;
    }
    setIsGeneratingRecipe(true);
    try {
      const ingList = fridgeIngredients
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const res = await api.post('/recipes/generate-ai', {
        ingredients: ingList,
        prompt: fridgePrompt.trim() || undefined,
      });

      if (res.data) {
        Alert.alert('Success', 'AI custom recipe created & saved to catalog!');
        setFridgeIngredients('');
        setFridgePrompt('');
        setIsFridgeModalVisible(false);
        // Refresh catalog list and open detail of the newly generated recipe
        await fetchRecipes(recipesQuery, selectedRecipeTag);
        setSelectedRecipeDetail(res.data);
        setIsDetailModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to generate AI recipe.');
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // Log Recipe to diary handler
  const handleConfirmLogRecipe = async () => {
    if (!selectedRecipeDetail) return;
    const servingsNum = parseFloat(logRecipeServings);
    if (isNaN(servingsNum) || servingsNum <= 0) {
      Alert.alert('Invalid input', 'Please enter a valid number of servings.');
      return;
    }

    setIsLoggingRecipe(true);
    try {
      await api.post(`/recipes/${selectedRecipeDetail.id}/log`, {
        servings: servingsNum,
        mealType: logRecipeMealType,
        date,
      });
      Alert.alert('Logged', 'Recipe logged successfully to your daily meals journal.');
      setIsLogRecipeModalVisible(false);
      setIsDetailModalVisible(false);
      // Reload daily logs to reflect macros in circular chart rings
      fetchDailySummary();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to log recipe.');
    } finally {
      setIsLoggingRecipe(false);
    }
  };

  // Get AI substitutions handler
  const handleFetchSubstitution = async () => {
    if (!selectedIngredientToSubstitute) return;
    if (!substituteNameInput.trim()) {
      Alert.alert('Input needed', 'Please specify a replacement food name.');
      return;
    }

    setIsSubstituting(true);
    setSubstitutionResult(null);
    try {
      const res = await api.post('/recipes/substitute', {
        recipeIngredientId: selectedIngredientToSubstitute.id,
        substituteName: substituteNameInput.trim(),
      });
      setSubstitutionResult(res.data);
    } catch (err: any) {
      Alert.alert(
        'Not Found',
        `Could not find substitution info: ${err.response?.data?.message || 'Food item not found in catalog.'}`
      );
    } finally {
      setIsSubstituting(false);
    }
  };

  // Log Modal States
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);

  // Custom Food States
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServingSize, setCustomServingSize] = useState('100');
  const [customServingUnit, setCustomServingUnit] = useState('g');
  const [customBarcode, setCustomBarcode] = useState('');
  const [isCreatingFood, setIsCreatingFood] = useState(false);

  // AI Scan States
  const [modalActiveTab, setModalActiveTab] = useState<'search' | 'scan' | 'custom'>('search');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
    servingUnit: string;
  } | null>(null);
  const [aiQuantity, setAiQuantity] = useState('1');

  // Quick Seed Common Foods for Offline/Instant fallback search
  const QUICK_FALLBACK_FOODS: FoodItem[] = [
    { id: '1', name: 'Oatmeal (cooked)', calories: 120, protein: 5, carbs: 22, fat: 2 },
    { id: '2', name: 'Banana (medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.3 },
    { id: '3', name: 'Chicken Breast (cooked, grilled)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: '4', name: 'Whole Egg (boiled)', calories: 78, protein: 6, carbs: 0.6, fat: 5 },
    { id: '5', name: 'White Rice (cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    { id: '6', name: 'Peanut Butter (1 tbsp)', calories: 95, protein: 3.5, carbs: 3, fat: 8 },
    { id: '7', name: 'Protein Shake (Whey)', calories: 140, protein: 25, carbs: 3, fat: 1.5 },
  ];

  const fetchDailySummary = async (targetDate = date) => {
    try {
      const response = await api.get(`/nutrition/logs/today?date=${targetDate}`);
      if (response.data) {
        setSummary(response.data.summary);
        setLoggedMeals(response.data.meals || []);
      }
    } catch (e) {
      console.warn('Failed to load real logs, using mock values', e);
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDailySummary();
  }, [date]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDailySummary();
  };

  // Water Increment Log handler
  const handleLogWater = async (amountMl: number) => {
    try {
      const payload = { amount: amountMl, date };
      const res = await api.post('/nutrition/water', payload);
      if (res.data) {
        fetchDailySummary();
      }
    } catch (error) {
      // Offline fallback state update
      setSummary((prev) => {
        const consumed = prev.water.consumed + amountMl;
        return {
          ...prev,
          water: {
            ...prev.water,
            consumed,
            remaining: Math.max(0, prev.water.target - consumed),
          },
        };
      });
      Alert.alert('Network Sync', 'Logged water offline temporarily.');
    }
  };

  // Search Food in Database dictionary
  const handleSearchFoods = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/nutrition/foods?q=${encodeURIComponent(queryText)}`);
      if (res.data && res.data.length > 0) {
        setSearchResults(res.data);
      } else {
        // Fallback local matching
        const matched = QUICK_FALLBACK_FOODS.filter((f) =>
          f.name.toLowerCase().includes(queryText.toLowerCase())
        );
        setSearchResults(matched);
      }
    } catch (e) {
      // Local fallback
      const matched = QUICK_FALLBACK_FOODS.filter((f) =>
        f.name.toLowerCase().includes(queryText.toLowerCase())
      );
      setSearchResults(matched);
    } finally {
      setIsSearching(false);
    }
  };

  // Hybrid Barcode Scanner Resolver
  const handleBarcodeScan = async (barcode: string) => {
    setIsSearching(true);
    try {
      const res = await api.get(`/nutrition/foods?barcode=${encodeURIComponent(barcode)}`);
      if (res.data && res.data.length > 0) {
        // Automatically select the resolved food to show servings configuration
        setSelectedFood(res.data[0]);
        setQuantity('1'); // default to 1 serving
      } else {
        Alert.alert(
          'Product Not Found',
          `No product found for barcode: ${barcode}. Feel free to add a custom food item.`
        );
      }
    } catch (e) {
      console.error('Error fetching barcode product details', e);
      Alert.alert(
        'Scan Failed',
        'Could not fetch product details from our databases. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Log food consumption
  const handleLogFood = async () => {
    if (!selectedFood) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please input a valid quantity amount.');
      return;
    }

    try {
      await api.post('/nutrition/logs', {
        foodId: selectedFood.id,
        quantity: qty,
        mealType: selectedMealType,
        date,
      });
      setIsLogModalVisible(false);
      setSelectedFood(null);
      setSearchQuery('');
      setSearchResults([]);
      setQuantity('1');
      fetchDailySummary();
    } catch (e) {
      Alert.alert('Error', 'Could not log food item to database.');
    }
  };

  // Create customized food log
  const handleCreateAndLogFood = async () => {
    if (!customName || !customCalories) {
      Alert.alert('Error', 'Please provide at least a food name and calorie count.');
      return;
    }

    setIsCreatingFood(true);
    try {
      // 1. Create the food in dictionary
      const foodRes = await api.post('/nutrition/foods', {
        name: customName,
        calories: parseFloat(customCalories),
        protein: parseFloat(customProtein || '0'),
        carbs: parseFloat(customCarbs || '0'),
        fat: parseFloat(customFat || '0'),
        servingSize: parseFloat(customServingSize),
        servingUnit: customServingUnit,
        barcode: customBarcode || undefined,
      });

      const newFood = foodRes.data;

      // 2. Log this newly created food
      await api.post('/nutrition/logs', {
        foodId: newFood.id,
        quantity: parseFloat(quantity),
        mealType: selectedMealType,
        date,
      });

      // Clear fields and refresh
      setIsLogModalVisible(false);
      setShowCustomForm(false);
      setCustomName('');
      setCustomCalories('');
      setCustomProtein('');
      setCustomCarbs('');
      setCustomFat('');
      setCustomBarcode('');
      fetchDailySummary();
    } catch (e) {
      Alert.alert('Error', 'Unable to create and log customized food.');
    } finally {
      setIsCreatingFood(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await api.delete(`/nutrition/logs/${logId}`);
      fetchDailySummary();
    } catch (e) {
      console.warn('Failed to delete food log:', e);
    }
  };

  const handleCloseLogModal = () => {
    setIsLogModalVisible(false);
    setShowCustomForm(false);
    setModalActiveTab('search');
    setSelectedFood(null);
    setSelectedImage(null);
    setAiResult(null);
    setAiQuantity('1');
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Hadafak needs media library permissions to pick an image.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setAiResult(null);
        if (result.assets[0].base64) {
          handleAiScan(result.assets[0].base64);
        }
      }
    } catch (e) {
      console.warn('Failed to pick image:', e);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  const takePhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Hadafak needs camera permissions to snap a photo.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setAiResult(null);
        if (result.assets[0].base64) {
          handleAiScan(result.assets[0].base64);
        }
      }
    } catch (e) {
      console.warn('Failed to take photo:', e);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const handleAiScan = async (base64Data: string) => {
    setIsAiScanning(true);
    try {
      const response = await api.post('/nutrition/scan', {
        imageBase64: base64Data,
      });
      setAiResult(response.data);
    } catch (e) {
      console.error('AI Scan request failed:', e);
      Alert.alert('Scan Failed', 'AI model analysis failed. Please check connection and try again.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleLogAiFood = async () => {
    if (!aiResult) return;
    const qty = parseFloat(aiQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please input a valid quantity/serving amount.');
      return;
    }

    try {
      // 1. Create a food dictionary entry for the AI scanned food
      const foodRes = await api.post('/nutrition/foods', {
        name: aiResult.name,
        calories: Math.round(aiResult.calories),
        protein: Math.round(aiResult.protein),
        carbs: Math.round(aiResult.carbs),
        fat: Math.round(aiResult.fat),
        servingSize: aiResult.servingSize,
        servingUnit: aiResult.servingUnit,
      });

      // 2. Log this newly created AI food to daily logs
      await api.post('/nutrition/logs', {
        foodId: foodRes.data.id,
        quantity: qty,
        mealType: selectedMealType,
        date,
      });

      // Clear states & Refresh
      handleCloseLogModal();
      fetchDailySummary();
    } catch (e) {
      Alert.alert('Error', 'Could not log scanned food to database.');
    }
  };

  // Helpers for render
  const getProgressWidth = (consumed: number, target: number): any => {
    if (!target) return '0%';
    const pct = Math.min(100, Math.round((consumed / target) * 100));
    return `${pct}%`;
  };

  const getMealItems = (mealType: string) => {
    return loggedMeals.filter((m) => m.mealType === mealType);
  };

  const getMealCalories = (mealType: string) => {
    return getMealItems(mealType).reduce((sum, item) => sum + (item.food.calories || 0), 0);
  };

  const openLogModal = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedMealType(mealType);
    setIsLogModalVisible(true);
  };

  // SVG Circular Ring details
  const radius = 64;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const targetCals = summary.calories.target || 2000;
  const consumedCals = summary.calories.consumed || 0;
  const progressRatio = Math.min(1, consumedCals / targetCals);
  const strokeDashoffset = circumference - progressRatio * circumference;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <Text style={styles.headerTitle}>Nutrition</Text>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.contentPadding}>
          {/* Unified Subsegment Tabs Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'tracker' && styles.tabButtonActive]}
              onPress={() => setActiveTab('tracker')}
              activeOpacity={0.8}
            >
              <Apple size={16} color={activeTab === 'tracker' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabButtonText, activeTab === 'tracker' && styles.tabButtonTextActive]}>
                Daily Tracker
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'recipes' && styles.tabButtonActive]}
              onPress={() => setActiveTab('recipes')}
              activeOpacity={0.8}
            >
              <Sparkles size={16} color={activeTab === 'recipes' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabButtonText, activeTab === 'recipes' && styles.tabButtonTextActive]}>
                Recipes Hub
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'tracker' ? (
          <View style={[styles.contentPadding, { flex: 1 }]}>
            {/* Main Calorie Circular Chart Card */}
            <View style={styles.chartCard}>
              <View style={styles.chartRow}>
                {/* SVG Ring */}
                <View style={styles.ringWrapper}>
                  <Svg height={160} width={160} viewBox="0 0 160 160">
                    <Defs>
                      <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={COLORS.primary} />
                        <Stop offset="100%" stopColor="#8C2F7A" />
                      </LinearGradient>
                    </Defs>
                    {/* Background Ring */}
                    <Circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={COLORS.primaryLight}
                      strokeWidth={stroke}
                      fill="transparent"
                      opacity={0.8}
                    />
                    {/* Consumed Ring */}
                    <Circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="url(#ringGrad)"
                      strokeWidth={stroke}
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      transform="rotate(-90 80 80)"
                    />
                  </Svg>
                  {/* Central Text */}
                  <View style={styles.ringInnerContent}>
                    <Text style={styles.ringValue}>{consumedCals}</Text>
                    <Text style={styles.ringLabel}>Kcal logged</Text>
                  </View>
                </View>

                {/* Target & Consumed Summary Stats */}
                <View style={styles.statsSummaryList}>
                  <View style={styles.summaryStatItem}>
                    <View style={[styles.bulletPoint, { backgroundColor: COLORS.primary }]} />
                    <View>
                      <Text style={styles.statLabel}>Goal Target</Text>
                      <Text style={styles.statVal}>{targetCals} kcal</Text>
                    </View>
                  </View>

                  <View style={[styles.summaryStatItem, { marginTop: 12 }]}>
                    <View style={[styles.bulletPoint, { backgroundColor: COLORS.success }]} />
                    <View>
                      <Text style={styles.statLabel}>Remaining</Text>
                      <Text style={styles.statVal}>
                        {Math.max(0, targetCals - consumedCals)} kcal
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Three Macro Grid Tracks */}
              <View style={styles.macrosContainer}>
                {/* Protein Track */}
                <View style={styles.macroProgressItem}>
                  <View style={styles.macroLabelRow}>
                    <Text style={styles.macroName}>Protein</Text>
                    <Text style={styles.macroAmount}>
                      {summary.protein.consumed}g / {summary.protein.target}g
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: getProgressWidth(summary.protein.consumed, summary.protein.target),
                          backgroundColor: COLORS.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Carbs Track */}
                <View style={[styles.macroProgressItem, { marginTop: 12 }]}>
                  <View style={styles.macroLabelRow}>
                    <Text style={styles.macroName}>Carbs</Text>
                    <Text style={styles.macroAmount}>
                      {summary.carbs.consumed}g / {summary.carbs.target}g
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: getProgressWidth(summary.carbs.consumed, summary.carbs.target),
                          backgroundColor: '#3B82F6',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Fat Track */}
                <View style={[styles.macroProgressItem, { marginTop: 12 }]}>
                  <View style={styles.macroLabelRow}>
                    <Text style={styles.macroName}>Fat</Text>
                    <Text style={styles.macroAmount}>
                      {summary.fat.consumed}g / {summary.fat.target}g
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: getProgressWidth(summary.fat.consumed, summary.fat.target),
                          backgroundColor: '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Section: Logged Meals Timeline */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Daily Meals Log</Text>
              <Text style={styles.sectionDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}</Text>
            </View>

            {/* Breakfast Card */}
            <View style={styles.mealGroupCard}>
              <View style={styles.mealGroupHeader}>
                <View>
                  <Text style={styles.mealTypeName}>Breakfast</Text>
                  <Text style={styles.mealTypeCalories}>{getMealCalories('breakfast')} kcal</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openLogModal('breakfast')}
                  style={styles.addMealCircle}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {getMealItems('breakfast').length > 0 ? (
                getMealItems('breakfast').map((item) => (
                  <View key={item.id} style={styles.loggedItemRow}>
                    <View style={styles.loggedItemDetails}>
                      <Text style={styles.loggedItemName}>{item.food.name}</Text>
                      <Text style={styles.loggedItemMacro}>
                        Qty: {item.quantity} • P: {item.food.protein}g • C: {item.food.carbs}g • F: {item.food.fat}g
                      </Text>
                    </View>
                    <View style={styles.loggedItemRight}>
                      <Text style={styles.loggedItemKcal}>{item.food.calories} kcal</Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.deleteButton}>
                        <Trash2 size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyMealText}>No breakfast logged yet.</Text>
              )}
            </View>

            {/* Lunch Card */}
            <View style={[styles.mealGroupCard, { marginTop: 14 }]}>
              <View style={styles.mealGroupHeader}>
                <View>
                  <Text style={styles.mealTypeName}>Lunch</Text>
                  <Text style={styles.mealTypeCalories}>{getMealCalories('lunch')} kcal</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openLogModal('lunch')}
                  style={styles.addMealCircle}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {getMealItems('lunch').length > 0 ? (
                getMealItems('lunch').map((item) => (
                  <View key={item.id} style={styles.loggedItemRow}>
                    <View style={styles.loggedItemDetails}>
                      <Text style={styles.loggedItemName}>{item.food.name}</Text>
                      <Text style={styles.loggedItemMacro}>
                        Qty: {item.quantity} • P: {item.food.protein}g • C: {item.food.carbs}g • F: {item.food.fat}g
                      </Text>
                    </View>
                    <View style={styles.loggedItemRight}>
                      <Text style={styles.loggedItemKcal}>{item.food.calories} kcal</Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.deleteButton}>
                        <Trash2 size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyMealText}>No lunch logged yet.</Text>
              )}
            </View>

            {/* Dinner Card */}
            <View style={[styles.mealGroupCard, { marginTop: 14 }]}>
              <View style={styles.mealGroupHeader}>
                <View>
                  <Text style={styles.mealTypeName}>Dinner</Text>
                  <Text style={styles.mealTypeCalories}>{getMealCalories('dinner')} kcal</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openLogModal('dinner')}
                  style={styles.addMealCircle}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {getMealItems('dinner').length > 0 ? (
                getMealItems('dinner').map((item) => (
                  <View key={item.id} style={styles.loggedItemRow}>
                    <View style={styles.loggedItemDetails}>
                      <Text style={styles.loggedItemName}>{item.food.name}</Text>
                      <Text style={styles.loggedItemMacro}>
                        Qty: {item.quantity} • P: {item.food.protein}g • C: {item.food.carbs}g • F: {item.food.fat}g
                      </Text>
                    </View>
                    <View style={styles.loggedItemRight}>
                      <Text style={styles.loggedItemKcal}>{item.food.calories} kcal</Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.deleteButton}>
                        <Trash2 size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyMealText}>No dinner logged yet.</Text>
              )}
            </View>

            {/* Snack Card */}
            <View style={[styles.mealGroupCard, { marginTop: 14 }]}>
              <View style={styles.mealGroupHeader}>
                <View>
                  <Text style={styles.mealTypeName}>Snacks</Text>
                  <Text style={styles.mealTypeCalories}>{getMealCalories('snack')} kcal</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openLogModal('snack')}
                  style={styles.addMealCircle}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {getMealItems('snack').length > 0 ? (
                getMealItems('snack').map((item) => (
                  <View key={item.id} style={styles.loggedItemRow}>
                    <View style={styles.loggedItemDetails}>
                      <Text style={styles.loggedItemName}>{item.food.name}</Text>
                      <Text style={styles.loggedItemMacro}>
                        Qty: {item.quantity} • P: {item.food.protein}g • C: {item.food.carbs}g • F: {item.food.fat}g
                      </Text>
                    </View>
                    <View style={styles.loggedItemRight}>
                      <Text style={styles.loggedItemKcal}>{item.food.calories} kcal</Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.deleteButton}>
                        <Trash2 size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyMealText}>No snacks logged yet.</Text>
              )}
            </View>

            {/* Section: Water tracker Log */}
            <View style={styles.waterTrackerCard}>
              <View style={styles.waterDetails}>
                <View style={styles.waterHeader}>
                  <GlassWater size={28} color="#3B82F6" style={{ marginRight: 10 }} />
                  <View>
                    <Text style={styles.waterTitle}>Water Counter</Text>
                    <Text style={styles.waterVolume}>
                      {summary.water.consumed} ml / {summary.water.target} ml
                    </Text>
                  </View>
                </View>

                {/* Visual Blue Progress Bar */}
                <View style={styles.waterProgressTrack}>
                  <View
                    style={[
                      styles.waterProgressFill,
                      { width: getProgressWidth(summary.water.consumed, summary.water.target) },
                    ]}
                  />
                </View>

                <View style={styles.waterQuickActions}>
                  <TouchableOpacity
                    onPress={() => handleLogWater(250)}
                    style={styles.waterAddBtn}
                    activeOpacity={0.7}
                  >
                    <Plus size={14} color="#3B82F6" style={{ marginRight: 4 }} />
                    <Text style={styles.waterAddText}>250 ml</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleLogWater(500)}
                    style={styles.waterAddBtn}
                    activeOpacity={0.7}
                  >
                    <Plus size={14} color="#3B82F6" style={{ marginRight: 4 }} />
                    <Text style={styles.waterAddText}>500 ml</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* AI Recipes Hub view */
          <View style={styles.recipesContent}>
            <View style={styles.contentPadding}>
              {/* Header / Intro Card with Search and AI builder button */}
              <View style={styles.recipesIntroCard}>
                <View style={styles.recipesIntroHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.recipesIntroTitle}>AI Recipe Builder</Text>
                    <Text style={styles.recipesIntroDesc}>Let AI build a custom recipe based on ingredients in your fridge.</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.fridgeOpenBtn}
                    onPress={() => setIsFridgeModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={16} color={COLORS.textInverse} style={{ marginRight: 6 }} />
                    <Text style={styles.fridgeOpenText}>Open Fridge</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.recipesSearchRow}>
                  <View style={styles.recipesSearchInputWrapper}>
                    <Search size={18} color={COLORS.textMuted} style={styles.searchIcon} />
                    <TextInput
                      style={styles.recipesSearchInput}
                      placeholder="Search database healthy recipes..."
                      placeholderTextColor={COLORS.textMuted}
                      value={recipesQuery}
                      onChangeText={setRecipesQuery}
                    />
                    {recipesQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setRecipesQuery('')}>
                        <X size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Horizontal Filter Tags */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScrollView}
              contentContainerStyle={styles.tagsContentContainer}
            >
              {[
                { label: 'All Recipes', value: '' },
                { label: 'High-Protein', value: 'High-Protein' },
                { label: 'Low-Carb', value: 'Low-Carb' },
                { label: 'Vegan', value: 'Vegan' },
                { label: 'Keto', value: 'Keto' },
                { label: 'High-Fiber', value: 'High-Fiber' },
              ].map((tagItem) => {
                const isSelected = selectedRecipeTag === tagItem.value;
                return (
                  <TouchableOpacity
                    key={tagItem.label}
                    style={[styles.tagPill, isSelected && styles.tagPillActive]}
                    onPress={() => setSelectedRecipeTag(tagItem.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                      {tagItem.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.contentPadding}>
              {/* Recipes List */}
              {loadingRecipes ? (
                <View style={styles.recipesLoader}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.recipesLoaderText}>Loading delicious recipes...</Text>
                </View>
              ) : recipes.length === 0 ? (
                <View style={styles.emptyRecipesCard}>
                  <Utensils size={40} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyRecipesTitle}>No Recipes Found</Text>
                  <Text style={styles.emptyRecipesDesc}>
                    Try clearing your search query, choosing a different tag, or creating a custom recipe using your fridge ingredients.
                  </Text>
                </View>
              ) : (
                recipes.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recipeListItemCard}
                    onPress={() => {
                      setSelectedRecipeDetail(item);
                      setIsDetailModalVisible(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.recipeHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={styles.recipeItemTitle} numberOfLines={1}>{item.title}</Text>
                          <View style={[
                            styles.sourceBadge,
                            item.source === 'ai' && { backgroundColor: '#EEF2FF' },
                            item.source === 'user' && { backgroundColor: '#ECFDF5' }
                          ]}>
                            <Text style={[
                              styles.sourceBadgeText,
                              item.source === 'ai' && { color: '#4F46E5' },
                              item.source === 'user' && { color: '#059669' }
                            ]}>
                              {item.source.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.recipeItemDesc} numberOfLines={2}>{item.description}</Text>
                      </View>
                    </View>

                    {/* Prep details */}
                    <View style={styles.recipePrepRow}>
                      <View style={styles.recipePrepItem}>
                        <Clock size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.recipePrepLabel}>Prep: {item.prepTime}m</Text>
                      </View>
                      <View style={styles.recipePrepItem}>
                        <Utensils size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.recipePrepLabel}>Cook: {item.cookTime}m</Text>
                      </View>
                      <View style={styles.recipePrepItem}>
                        <BookOpen size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.recipePrepLabel}>{item.servings} Servings</Text>
                      </View>
                    </View>

                    {/* Macros Strip */}
                    <View style={styles.recipeMacrosBar}>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Calories</Text>
                        <Text style={styles.macroPillValue}>{Math.round(item.calories)} Kcal</Text>
                      </View>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Protein</Text>
                        <Text style={styles.macroPillValue}>{item.protein}g</Text>
                      </View>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Carbs</Text>
                        <Text style={styles.macroPillValue}>{item.carbs}g</Text>
                      </View>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Fat</Text>
                        <Text style={styles.macroPillValue}>{item.fat}g</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* Bottom space */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Main Search & Log Meal Modal */}
      <Modal
        visible={isLogModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseLogModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Log {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}
              </Text>
              <TouchableOpacity
                onPress={handleCloseLogModal}
                style={styles.modalCloseCircle}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Custom food tab switch */}
            <View style={styles.modalTabHeader}>
              <TouchableOpacity
                style={[styles.modalTabBtn, modalActiveTab === 'search' && styles.modalTabBtnActive]}
                onPress={() => {
                  setModalActiveTab('search');
                  setShowCustomForm(false);
                }}
              >
                <Text style={[styles.modalTabLabel, modalActiveTab === 'search' && styles.modalTabLabelActive]}>
                  Search
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, modalActiveTab === 'scan' && styles.modalTabBtnActive]}
                onPress={() => {
                  setModalActiveTab('scan');
                  setShowCustomForm(false);
                }}
              >
                <Text style={[styles.modalTabLabel, modalActiveTab === 'scan' && styles.modalTabLabelActive]}>
                  AI Scan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, modalActiveTab === 'custom' && styles.modalTabBtnActive]}
                onPress={() => {
                  setModalActiveTab('custom');
                  setShowCustomForm(true);
                }}
              >
                <Text style={[styles.modalTabLabel, modalActiveTab === 'custom' && styles.modalTabLabelActive]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {modalActiveTab === 'search' && (
              /* Search flow */
              <View style={styles.searchFlowContainer}>
                {selectedFood ? (
                  /* Food selected: input servings/quantity */
                  <View style={styles.servingsConfigCard}>
                    <Apple size={36} color={COLORS.primary} style={{ marginBottom: 12 }} />
                    <Text style={styles.selectedFoodLabel}>{selectedFood.name}</Text>
                    <Text style={styles.selectedFoodMacros}>
                      1 serving size: {selectedFood.servingSize || 100} {selectedFood.servingUnit || 'g'} • {selectedFood.calories} Kcal
                    </Text>

                    <View style={styles.qtyInputRow}>
                      <Text style={styles.qtyLabel}>Number of Servings: </Text>
                      <TextInput
                        style={styles.qtyInput}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="decimal-pad"
                        placeholder="1.0"
                      />
                    </View>

                    <View style={styles.confirmActionsRow}>
                      <TouchableOpacity
                        onPress={() => setSelectedFood(null)}
                        style={styles.cancelChoiceBtn}
                      >
                        <Text style={styles.cancelChoiceText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleLogFood}
                        style={styles.confirmLogBtn}
                      >
                        <Text style={styles.confirmLogText}>Add Log</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* Type query & show result matches */
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={[styles.searchBarWrapper, { flex: 1 }]}>
                        <Search size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.searchInput}
                          value={searchQuery}
                          onChangeText={handleSearchFoods}
                          placeholder="Search oatmeal, banana, egg, breast..."
                          placeholderTextColor={COLORS.textMuted}
                          autoFocus
                        />
                      </View>
                      <TouchableOpacity
                        style={{
                          marginLeft: 12,
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: COLORS.surfaceLight,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => setIsScanModalVisible(true)}
                        activeOpacity={0.8}
                      >
                        <ScanBarcode size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    {isSearching ? (
                      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 24 }} />
                    ) : (
                      <FlatList
                        data={searchResults.length > 0 ? searchResults : QUICK_FALLBACK_FOODS.slice(0, 5)}
                        keyExtractor={(item) => item.id}
                        style={{ marginTop: 14 }}
                        ListHeaderComponent={
                          <Text style={styles.searchHeaderTitle}>
                            {searchResults.length > 0 ? 'Search Results' : 'Frequently Logged Suggestions'}
                          </Text>
                        }
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => setSelectedFood(item)}
                            style={styles.foodResultRow}
                            activeOpacity={0.7}
                          >
                            <View>
                              <Text style={styles.foodResultName}>{item.name}</Text>
                              <Text style={styles.foodResultSpecs}>
                                {item.servingSize || 100} {item.servingUnit || 'g'} • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                              </Text>
                            </View>
                            <View style={styles.foodResultRight}>
                              <Text style={styles.foodResultCalories}>{item.calories} Kcal</Text>
                              <ChevronRight size={18} color={COLORS.textMuted} />
                            </View>
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {modalActiveTab === 'scan' && (
              /* AI Scan flow */
              <ScrollView style={styles.aiScanContainer} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {!selectedImage ? (
                  <View style={styles.aiSelectorCard}>
                    <Sparkles size={48} color={COLORS.primary} style={{ marginBottom: 16 }} />
                    <Text style={styles.aiCardTitle}>Analyze Food with AI</Text>
                    <Text style={styles.aiCardSubtitle}>
                      Snap a photo of your meal or upload an image, and Gemini will estimate ingredients and macronutrients automatically!
                    </Text>

                    <View style={styles.aiActionsCol}>
                      <TouchableOpacity
                        style={styles.aiActionBtnPrimary}
                        onPress={takePhotoWithCamera}
                      >
                        <Camera size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.aiActionBtnText}>Take Live Photo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.aiActionBtnSecondary}
                        onPress={pickImageFromGallery}
                      >
                        <Upload size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.aiActionBtnTextSecondary}>Upload from Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.aiPreviewCard}>
                    <View style={styles.aiImagePreviewWrapper}>
                      <Image source={{ uri: selectedImage }} style={styles.aiImagePreview} />

                      {isAiScanning && (
                        <View style={styles.scannerOverlay}>
                          <ActivityIndicator size="large" color={COLORS.primary} />
                          <Text style={styles.scanningText}>Gemini AI is scanning...</Text>
                        </View>
                      )}
                    </View>

                    {isAiScanning && (
                      <View style={styles.aiLoadingPhrases}>
                        <Text style={styles.aiLoadingText}>• Reading visual properties...</Text>
                        <Text style={styles.aiLoadingText}>• Guessing ingredients & density...</Text>
                        <Text style={styles.aiLoadingText}>• Calculating estimated macros...</Text>
                      </View>
                    )}

                    {!isAiScanning && aiResult && (
                      <View style={styles.aiResultContent}>
                        <View style={styles.aiResultHeaderRow}>
                          <Sparkles size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.aiResultTitle}>AI Nutrition Estimate</Text>
                        </View>

                        <Text style={styles.aiFoodName}>{aiResult.name}</Text>
                        <Text style={styles.aiServingInfo}>
                          Est. Serving Size: {aiResult.servingSize} {aiResult.servingUnit}
                        </Text>

                        {/* Macros Grid */}
                        <View style={styles.aiMacrosGrid}>
                          <View style={[styles.aiMacroBox, { borderColor: '#E53E3E' }]}>
                            <Text style={[styles.aiMacroVal, { color: '#E53E3E' }]}>{Math.round(aiResult.calories)}</Text>
                            <Text style={styles.aiMacroLbl}>Calories</Text>
                          </View>
                          <View style={[styles.aiMacroBox, { borderColor: COLORS.primary }]}>
                            <Text style={[styles.aiMacroVal, { color: COLORS.primary }]}>{aiResult.protein}g</Text>
                            <Text style={styles.aiMacroLbl}>Protein</Text>
                          </View>
                          <View style={[styles.aiMacroBox, { borderColor: '#DD6B20' }]}>
                            <Text style={[styles.aiMacroVal, { color: '#DD6B20' }]}>{aiResult.carbs}g</Text>
                            <Text style={styles.aiMacroLbl}>Carbs</Text>
                          </View>
                          <View style={[styles.aiMacroBox, { borderColor: '#319795' }]}>
                            <Text style={[styles.aiMacroVal, { color: '#319795' }]}>{aiResult.fat}g</Text>
                            <Text style={styles.aiMacroLbl}>Fat</Text>
                          </View>
                        </View>

                        {/* Qty multiplier */}
                        <View style={styles.qtyInputRow}>
                          <Text style={styles.qtyLabel}>Number of Servings: </Text>
                          <TextInput
                            style={styles.qtyInput}
                            value={aiQuantity}
                            onChangeText={setAiQuantity}
                            keyboardType="decimal-pad"
                            placeholder="1.0"
                          />
                        </View>

                        <View style={styles.confirmActionsRow}>
                          <TouchableOpacity
                            onPress={() => setSelectedImage(null)}
                            style={styles.cancelChoiceBtn}
                          >
                            <Text style={styles.cancelChoiceText}>Retake Photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleLogAiFood}
                            style={styles.confirmLogBtn}
                          >
                            <Text style={styles.confirmLogText}>Log Food</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {!isAiScanning && !aiResult && (
                      <View style={{ marginTop: 16 }}>
                        <TouchableOpacity
                          style={styles.aiActionBtnSecondary}
                          onPress={() => setSelectedImage(null)}
                        >
                          <Text style={styles.aiActionBtnTextSecondary}>Clear & Go Back</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}

            {modalActiveTab === 'custom' && (
              /* Custom food insertion form */
              <ScrollView style={styles.customFormContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Food Name</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="e.g. Grandma's Apple Pie"
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </View>

                <View style={styles.gridInputRow}>
                  <View style={[styles.inputGroup, { width: '47%' }]}>
                    <Text style={styles.inputLabel}>Calories (kcal)</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="350"
                      keyboardType="numeric"
                      value={customCalories}
                      onChangeText={setCustomCalories}
                    />
                  </View>

                  <View style={[styles.inputGroup, { width: '47%' }]}>
                    <Text style={styles.inputLabel}>Protein (g)</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="12"
                      keyboardType="numeric"
                      value={customProtein}
                      onChangeText={setCustomProtein}
                    />
                  </View>
                </View>

                <View style={styles.gridInputRow}>
                  <View style={[styles.inputGroup, { width: '47%' }]}>
                    <Text style={styles.inputLabel}>Carbohydrates (g)</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="45"
                      keyboardType="numeric"
                      value={customCarbs}
                      onChangeText={setCustomCarbs}
                    />
                  </View>

                  <View style={[styles.inputGroup, { width: '47%' }]}>
                    <Text style={styles.inputLabel}>Fat (g)</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="8"
                      keyboardType="numeric"
                      value={customFat}
                      onChangeText={setCustomFat}
                    />
                  </View>
                </View>

                <View style={styles.gridInputRow}>
                  <View style={[styles.inputGroup, { width: '47%' }]}>
                    <Text style={styles.inputLabel}>Serving Size</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="100"
                      keyboardType="numeric"
                      value={customServingSize}
                      onChangeText={setCustomServingSize}
                    />
                  </View>

                  <View style={[styles.inputGroup, { width: '47%' }]}>
                    <Text style={styles.inputLabel}>Serving Unit</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="g or piece"
                      value={customServingUnit}
                      onChangeText={setCustomServingUnit}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Barcode (Optional)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="e.g. 0123456789012"
                    keyboardType="numeric"
                    value={customBarcode}
                    onChangeText={setCustomBarcode}
                  />
                </View>

                <View style={styles.qtyInputRow}>
                  <Text style={styles.qtyLabel}>Number of Servings: </Text>
                  <TextInput
                    style={styles.qtyInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleCreateAndLogFood}
                  style={styles.saveCustomBtn}
                  disabled={isCreatingFood}
                >
                  {isCreatingFood ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveCustomText}>Save & Log Item</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* AI Fridge Generator Modal */}
      <Modal
        visible={isFridgeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFridgeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>AI Fridge Recipe Builder</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFridgeModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.fridgeHelperText}>
                List ingredients you have in your fridge (separated by commas). Our culinary AI will formulate a customized meal that hits correct macronutrient proportions.
              </Text>

              <Text style={styles.inputLabel}>Ingredients in my Fridge</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="e.g. Chicken, rice, broccoli, garlic"
                placeholderTextColor={COLORS.textMuted}
                value={fridgeIngredients}
                onChangeText={setFridgeIngredients}
                multiline
              />

              {/* Quick ingredient suggestions */}
              <View style={styles.quickTagsWrapper}>
                {['chicken', 'beef', 'egg', 'oats', 'banana', 'rice', 'broccoli', 'tofu'].map((ing) => (
                  <TouchableOpacity
                    key={ing}
                    style={styles.quickIngTag}
                    onPress={() => {
                      const cur = fridgeIngredients.trim();
                      if (!cur) setFridgeIngredients(ing);
                      else if (cur.endsWith(',')) setFridgeIngredients(`${cur} ${ing}`);
                      else setFridgeIngredients(`${cur}, ${ing}`);
                    }}
                  >
                    <Text style={styles.quickIngTagText}>+ {ing}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Special prompt / style preference (Optional)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Low-carb diet, under 15 mins, spicy soy flavor"
                placeholderTextColor={COLORS.textMuted}
                value={fridgePrompt}
                onChangeText={setFridgePrompt}
              />

              <TouchableOpacity
                style={[styles.fridgeSubmitBtn, isGeneratingRecipe && { opacity: 0.6 }]}
                onPress={handleGenerateAiRecipe}
                disabled={isGeneratingRecipe}
                activeOpacity={0.8}
              >
                {isGeneratingRecipe ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Sparkles size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.fridgeSubmitText}>Generate AI Recipe</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Log Recipe Modal */}
      <Modal
        visible={isLogRecipeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLogRecipeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 380 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Log Recipe to Diary</Text>
              <TouchableOpacity
                onPress={() => setIsLogRecipeModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingBottom: 24 }}>
              <Text style={styles.inputLabel}>Meal Type</Text>
              <View style={styles.mealTypeSelectRow}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => {
                  const isSelected = logRecipeMealType === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mealSelectBtn, isSelected && styles.mealSelectBtnActive]}
                      onPress={() => setLogRecipeMealType(m)}
                    >
                      <Text style={[styles.mealSelectBtnText, isSelected && styles.mealSelectBtnTextActive]}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>How many servings?</Text>
              <TextInput
                style={styles.modalTextInput}
                keyboardType="decimal-pad"
                value={logRecipeServings}
                onChangeText={setLogRecipeServings}
              />

              <TouchableOpacity
                style={[styles.fridgeSubmitBtn, { marginTop: 24 }, isLoggingRecipe && { opacity: 0.6 }]}
                onPress={handleConfirmLogRecipe}
                disabled={isLoggingRecipe}
                activeOpacity={0.8}
              >
                {isLoggingRecipe ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.fridgeSubmitText}>Confirm & Log to Diary</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recipe Detail Modal */}
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsDetailModalVisible(false);
          setSelectedIngredientToSubstitute(null);
          setSubstitutionResult(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%', maxHeight: 700 }]}>
            {selectedRecipeDetail && (
              <>
                {/* Header */}
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {selectedRecipeDetail.title}
                    </Text>
                    <Text style={styles.modalSubtitle} numberOfLines={1}>
                      {selectedRecipeDetail.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsDetailModalVisible(false);
                      setSelectedIngredientToSubstitute(null);
                      setSubstitutionResult(null);
                    }}
                    style={styles.modalCloseCircle}
                  >
                    <X size={20} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {/* Detailed macros strip */}
                  <View style={[styles.recipeMacrosBar, { marginHorizontal: 0, paddingVertical: 14, backgroundColor: '#FAFAFA' }]}>
                    <View style={styles.recipeMacroPill}>
                      <Text style={styles.macroPillLabel}>Calories</Text>
                      <Text style={[styles.macroPillValue, { fontSize: 16, color: COLORS.primary }]}>{Math.round(selectedRecipeDetail.calories)} kcal</Text>
                    </View>
                    <View style={styles.recipeMacroPill}>
                      <Text style={styles.macroPillLabel}>Protein</Text>
                      <Text style={[styles.macroPillValue, { fontSize: 16 }]}>{selectedRecipeDetail.protein}g</Text>
                    </View>
                    <View style={styles.recipeMacroPill}>
                      <Text style={styles.macroPillLabel}>Carbs</Text>
                      <Text style={[styles.macroPillValue, { fontSize: 16 }]}>{selectedRecipeDetail.carbs}g</Text>
                    </View>
                    <View style={styles.recipeMacroPill}>
                      <Text style={styles.macroPillLabel}>Fat</Text>
                      <Text style={[styles.macroPillValue, { fontSize: 16 }]}>{selectedRecipeDetail.fat}g</Text>
                    </View>
                  </View>

                  <View style={styles.statsTimelineRow}>
                    <View style={styles.timeTag}>
                      <Clock size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.timeTagText}>Prep: {selectedRecipeDetail.prepTime} mins</Text>
                    </View>
                    <View style={styles.timeTag}>
                      <Utensils size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.timeTagText}>Cook: {selectedRecipeDetail.cookTime} mins</Text>
                    </View>
                  </View>

                  {/* Ingredients section */}
                  <View style={{ marginTop: 18 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={styles.detailSectionTitle}>Ingredients</Text>
                      <Text style={styles.substitutionTip}>Tap to AI substitute</Text>
                    </View>

                    {selectedRecipeDetail.ingredients?.length === 0 ? (
                      <Text style={styles.emptyIngredientsMsg}>No ingredients specified.</Text>
                    ) : (
                      selectedRecipeDetail.ingredients?.map((ing: any) => {
                        const isSelected = selectedIngredientToSubstitute?.id === ing.id;
                        return (
                          <View key={ing.id} style={{ marginBottom: 6 }}>
                            <TouchableOpacity
                              style={[
                                styles.ingredientItemRow,
                                isSelected && { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight }
                              ]}
                              onPress={() => {
                                setSelectedIngredientToSubstitute(ing);
                                setSubstituteNameInput('');
                                setSubstitutionResult(null);
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ingredientNameText}>
                                  {ing.customName || (ing.food ? ing.food.name : 'Unknown')}
                                </Text>
                              </View>
                              <Text style={styles.ingredientAmountText}>
                                {ing.amount} {ing.unit}
                              </Text>
                            </TouchableOpacity>

                            {/* AI Substitution sub-drawer inside list */}
                            {isSelected && (
                              <View style={styles.substitutionDrawer}>
                                <Text style={styles.subDrawerTitle}>AI Substitution Assistant</Text>
                                <Text style={styles.subDrawerDesc}>
                                  Enter an alternative food. We will match macro weights to find the exact replacement amount.
                                </Text>

                                <View style={styles.subInputRow}>
                                  <TextInput
                                    style={styles.subTextInput}
                                    placeholder="e.g. Tofu, Tempeh, Turkey"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={substituteNameInput}
                                    onChangeText={setSubstituteNameInput}
                                  />
                                  <TouchableOpacity
                                    style={styles.subSubmitBtn}
                                    onPress={handleFetchSubstitution}
                                    disabled={isSubstituting}
                                    activeOpacity={0.8}
                                  >
                                    {isSubstituting ? (
                                      <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                      <Text style={styles.subSubmitText}>Query AI</Text>
                                    )}
                                  </TouchableOpacity>
                                </View>

                                {substitutionResult && (
                                  <View style={styles.subResultBox}>
                                    <Text style={styles.subResultIntro}>
                                      Replace <Text style={{ fontWeight: 'bold' }}>{substitutionResult.originalIngredient}</Text> with:
                                    </Text>
                                    <Text style={styles.subResultAction}>
                                      {substitutionResult.suggestedAmount} {substitutionResult.unit} of {substitutionResult.suggestedReplacement}
                                    </Text>

                                    <View style={styles.subResultMacrosGrid}>
                                      <Text style={styles.subMacroLabel}>
                                        New Macros: {substitutionResult.macrosDifference.calories} Kcal • P: {substitutionResult.macrosDifference.protein}g • C: {substitutionResult.macrosDifference.carbs}g • F: {substitutionResult.macrosDifference.fat}g
                                      </Text>
                                    </View>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Instructions walkthrough section */}
                  <View style={{ marginTop: 18 }}>
                    <Text style={styles.detailSectionTitle}>Cooking Steps</Text>
                    {(!selectedRecipeDetail.instructions || selectedRecipeDetail.instructions.length === 0) ? (
                      <Text style={styles.emptyIngredientsMsg}>No preparation steps specified.</Text>
                    ) : (
                      selectedRecipeDetail.instructions.map((step: string, index: number) => (
                        <View key={index} style={styles.instructionStepCard}>
                          <View style={styles.instructionStepNumberBg}>
                            <Text style={styles.instructionStepNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.instructionStepDescText}>{step}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Spacer */}
                  <View style={{ height: 30 }} />
                </ScrollView>

                {/* Primary/Secondary action footer */}
                <View style={styles.detailActionFooter}>
                  <TouchableOpacity
                    style={styles.detailLogBtn}
                    onPress={() => {
                      setLogRecipeServings('1');
                      setIsLogRecipeModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.detailLogBtnText}>Log this Meal</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <BarcodeScannerModal
        visible={isScanModalVisible}
        onClose={() => setIsScanModalVisible(false)}
        onScan={handleBarcodeScan}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabButtonTextActive: {
    color: COLORS.text,
  },

  // Recipes Content styles
  recipesContent: {
    flex: 1,
  },
  recipesIntroCard: {
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
  },
  recipesIntroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recipesIntroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  recipesIntroDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    marginTop: 4,
  },
  fridgeOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  fridgeOpenText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  recipesSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipesSearchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#222222',
  },
  recipesSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },

  // Tag lists
  tagsScrollView: {
    marginHorizontal: -20,
    marginBottom: 18,
  },
  tagsContentContainer: {
    paddingHorizontal: 20,
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tagPillTextActive: {
    color: '#FFFFFF',
  },

  // Recipes list
  recipesLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  recipesLoaderText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 10,
  },
  emptyRecipesCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  emptyRecipesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyRecipesDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  recipeListItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  recipeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeItemTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginRight: 6,
    maxWidth: '70%',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  recipeItemDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  recipePrepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  recipePrepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  recipePrepLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  recipeMacrosBar: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 10,
    marginTop: 12,
  },
  recipeMacroPill: {
    flex: 1,
    alignItems: 'center',
  },
  macroPillLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  macroPillValue: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },

  // Fridge Modal / General
  fridgeHelperText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  quickTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 16,
  },
  quickIngTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  quickIngTagText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
  },
  fridgeSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
  },
  fridgeSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Meal selection row
  mealTypeSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  mealSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  mealSelectBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mealSelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  mealSelectBtnTextActive: {
    color: '#FFFFFF',
  },

  // Recipe detail elements
  statsTimelineRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  substitutionTip: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '800',
  },
  emptyIngredientsMsg: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  ingredientItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ingredientNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  ingredientAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // Substitution assistant sub-drawer
  substitutionDrawer: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    padding: 12,
    marginTop: -4,
  },
  subDrawerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B21A8',
  },
  subDrawerDesc: {
    fontSize: 10,
    color: '#7E22CE',
    marginTop: 2,
    marginBottom: 8,
  },
  subInputRow: {
    flexDirection: 'row',
  },
  subTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
    color: COLORS.text,
  },
  subSubmitBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  subSubmitText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  subResultBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 10,
    marginTop: 8,
  },
  subResultIntro: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  subResultAction: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6D28D9',
    marginTop: 2,
  },
  subResultMacrosGrid: {
    marginTop: 4,
  },
  subMacroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // Instruction step list
  instructionStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  instructionStepNumberBg: {
    backgroundColor: COLORS.primaryLight,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  instructionStepNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  instructionStepDescText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    fontWeight: '600',
  },

  // Detail modal footer
  detailActionFooter: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  detailLogBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  detailLogBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 16,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 32,
    padding: 22,
    ...SHADOWS.card,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringWrapper: {
    position: 'relative',
    height: 160,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  ringLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },
  statsSummaryList: {
    flex: 1,
    paddingLeft: 18,
    justifyContent: 'center',
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 1,
  },
  macrosContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
  },
  macroProgressItem: {},
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  macroAmount: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionDate: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  mealGroupCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 16,
  },
  mealGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 8,
  },
  mealTypeName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  mealTypeCalories: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  addMealCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMealText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  loggedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.border,
  },
  loggedItemDetails: {
    flex: 1,
    paddingRight: 12,
  },
  loggedItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  loggedItemMacro: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  loggedItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loggedItemKcal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 12,
  },
  deleteButton: {
    padding: 4,
  },
  waterTrackerCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 28,
    padding: 20,
    marginTop: 20,
  },
  waterDetails: {},
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  waterVolume: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 1,
  },
  waterProgressTrack: {
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 14,
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
  waterQuickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  waterAddBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4E2FC',
  },
  waterAddText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
  },
  // Modal layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
    height: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  searchIcon: {
    marginRight: 6,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTabHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  modalTabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.subtle,
  },
  modalTabLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  modalTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  searchFlowContainer: {
    flex: 1,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  searchHeaderTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  foodResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  foodResultName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  foodResultSpecs: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  foodResultRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foodResultCalories: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  // Selection sub-layout
  servingsConfigCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 28,
    marginTop: 12,
  },
  selectedFoodLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  selectedFoodMacros: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 50,
    width: '100%',
  },
  qtyLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
  },
  qtyInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'right',
  },
  confirmActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  cancelChoiceBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelChoiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  confirmLogBtn: {
    flex: 1.5,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmLogText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  // Custom form details
  customFormContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  gridInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveCustomBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  saveCustomText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  // AI Scan Styles
  aiScanContainer: {
    flex: 1,
  },
  aiSelectorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  aiCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  aiCardSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  aiActionsCol: {
    width: '100%',
    gap: 12,
  },
  aiActionBtnPrimary: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  aiActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  aiActionBtnSecondary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiActionBtnTextSecondary: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  aiPreviewCard: {
    marginTop: 10,
    alignItems: 'center',
  },
  aiImagePreviewWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  aiImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.85,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#FFF',
    marginTop: 12,
    fontWeight: '800',
    fontSize: 15,
  },
  aiLoadingPhrases: {
    marginTop: 16,
    width: '100%',
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  aiLoadingText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  aiResultContent: {
    width: '100%',
    marginTop: 20,
  },
  aiResultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiResultTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiFoodName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  aiServingInfo: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 16,
  },
  aiMacrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  aiMacroBox: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  aiMacroVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  aiMacroLbl: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
});
