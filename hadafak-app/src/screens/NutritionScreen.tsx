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
  Heart,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { api } from '../services/api';
import { storage } from '../utils/storage';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { StateFeedback } from '../components/StateFeedback';
import { useAlert } from '../components/CustomAlert';

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
  const { showAlert } = useAlert();
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

  // Recipes Hub additional states
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>([]);
  const [servingsScale, setServingsScale] = useState(1);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Helper helpers
  const detectTimerMinutes = (text: string): number | null => {
    const match = text.match(/(\d+)\s*(minute|minutes|min|mins)\b/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const calculateMatchScore = (recipe: any, fridgeString: string) => {
    if (!fridgeString || !fridgeString.trim()) return 0;
    const userIngredients = fridgeString
      .split(',')
      .map((i) => i.trim().toLowerCase())
      .filter(Boolean);
    if (userIngredients.length === 0) return 0;
    const recipeIngs = recipe.ingredients?.map((ing: any) => 
      (ing.customName || ing.food?.name || '').toLowerCase()
    ) || [];
    if (recipeIngs.length === 0) return 0;
    let matches = 0;
    recipeIngs.forEach((rIng: string) => {
      if (userIngredients.some((uIng) => rIng.includes(uIng) || uIng.includes(rIng))) {
        matches++;
      }
    });
    return Math.round((matches / recipeIngs.length) * 100);
  };

  const toggleFavorite = async (recipeId: string) => {
    let updatedFavs: string[];
    if (favoriteRecipeIds.includes(recipeId)) {
      updatedFavs = favoriteRecipeIds.filter(id => id !== recipeId);
    } else {
      updatedFavs = [...favoriteRecipeIds, recipeId];
    }
    setFavoriteRecipeIds(updatedFavs);
    try {
      await storage.setItem('favorite_recipes', JSON.stringify(updatedFavs));
    } catch (err) {
      console.warn('Error saving favorites:', err);
    }
  };

  const handleOpenRecipeDetail = (item: any) => {
    setSelectedRecipeDetail(item);
    setServingsScale(item.servings || 1);
    setIsCookingMode(false);
    setActiveStepIndex(0);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setIsDetailModalVisible(true);
  };

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favs = await storage.getItem('favorite_recipes');
        if (favs) {
          setFavoriteRecipeIds(JSON.parse(favs));
        }
      } catch (err) {
        console.warn('Error loading favorites:', err);
      }
    };
    loadFavorites();
  }, []);

  // Countdown Timer Effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      Alert.alert('Cooking Timer Complete!', 'Your cooking step timer has finished.');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

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
      const tagParam = selectedRecipeTag === 'Favorites' ? '' : selectedRecipeTag;
      fetchRecipes(recipesQuery, tagParam);
    }
  }, [recipesQuery, selectedRecipeTag, activeTab]);

  // AI Recipe generation handler
  const handleGenerateAiRecipe = async () => {
    if (!fridgeIngredients.trim()) {
      showAlert({
        title: 'Missing Ingredients',
        message: 'No ingredients were entered.',
        why: 'The AI recipe generator needs to know what ingredients you have available in order to suggest a matching meal.',
        actionGuide: 'Type at least one ingredient (e.g., chicken breast, white rice, or broccoli) in the text field.',
        type: 'warning',
      });
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
        showAlert({
          title: 'Recipe Generated!',
          message: 'Your AI recipe was successfully created.',
          why: 'A new recipe matching your ingredients has been saved directly to your personalized catalog.',
          actionGuide: 'Review the steps, preparation details, and nutritional macros below.',
          type: 'success',
        });
        setFridgeIngredients('');
        setFridgePrompt('');
        setIsFridgeModalVisible(false);
        // Refresh catalog list and open detail of the newly generated recipe
        await fetchRecipes(recipesQuery, selectedRecipeTag);
        handleOpenRecipeDetail(res.data);
      }
    } catch (err: any) {
      showAlert({
        title: 'Generation Failed',
        message: 'Failed to generate your recipe.',
        why: err.response?.data?.message || 'The AI service experienced an error or is temporarily offline.',
        actionGuide: 'Check your internet connection, adjust your ingredient list, and submit the request again.',
        type: 'error',
      });
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // Log Recipe to diary handler
  const handleConfirmLogRecipe = async () => {
    if (!selectedRecipeDetail) return;
    const servingsNum = parseFloat(logRecipeServings);
    if (isNaN(servingsNum) || servingsNum <= 0) {
      showAlert({
        title: 'Invalid Servings',
        message: 'The serving size quantity is invalid.',
        why: 'Servings must be a positive number greater than zero.',
        actionGuide: 'Please enter a valid numeric value (e.g., 1.0, 2.5) for the servings input.',
        type: 'warning',
      });
      return;
    }

    setIsLoggingRecipe(true);
    try {
      await api.post(`/recipes/${selectedRecipeDetail.id}/log`, {
        servings: servingsNum,
        mealType: logRecipeMealType,
        date,
      });
      showAlert({
        title: 'Meal Logged Successfully',
        message: 'Your recipe has been logged to your daily journal.',
        why: 'The database recorded the consumption of this recipe and updated your active calorie intake and macronutrients.',
        actionGuide: 'Review your updated rings to see how this affects your remaining calories for today.',
        type: 'success',
      });
      setIsLogRecipeModalVisible(false);
      setIsDetailModalVisible(false);
      // Reload daily logs to reflect macros in circular chart rings
      fetchDailySummary();
    } catch (err: any) {
      showAlert({
        title: 'Meal Logging Failed',
        message: 'Could not log the recipe to your journal.',
        why: err.response?.data?.message || 'A database sync error occurred or server session expired.',
        actionGuide: 'Please verify your network connection and try submitting the entry again.',
        type: 'error',
      });
    } finally {
      setIsLoggingRecipe(false);
    }
  };

  // Get AI substitutions handler
  const handleFetchSubstitution = async () => {
    if (!selectedIngredientToSubstitute) return;
    if (!substituteNameInput.trim()) {
      showAlert({
        title: 'Input Needed',
        message: 'The replacement food name is missing.',
        why: 'The AI service requires a target ingredient name to calculate equivalent weights and nutrition changes.',
        actionGuide: 'Enter the name of the food item you want to swap in (e.g., olive oil instead of butter) in the text box.',
        type: 'warning',
      });
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
      showAlert({
        title: 'Substitution Info Not Found',
        message: 'Could not find swap instructions for this item.',
        why: err.response?.data?.message || 'The food item you entered is not recognized or lacks complete nutrition details in our database.',
        actionGuide: 'Try entering a different, more common alternative food name (e.g., Greek yogurt, coconut oil) and search again.',
        type: 'error',
      });
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
  const [barcodeScanTarget, setBarcodeScanTarget] = useState<'search' | 'custom'>('search');

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
  const [frequentFoods, setFrequentFoods] = useState<FoodItem[]>([]);

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

      try {
        const frequentRes = await api.get('/nutrition/foods/frequent');
        if (frequentRes.data) {
          setFrequentFoods(frequentRes.data);
        }
      } catch (freqErr) {
        console.warn('Failed to load frequent foods:', freqErr);
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
      showAlert({
        title: 'Logged Offline',
        message: 'Hydration logged offline temporarily.',
        why: 'Your device is currently disconnected from the internet.',
        actionGuide: 'Hadafak saved your water intake locally and will sync automatically once you are back online.',
        type: 'info',
      });
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
    if (barcodeScanTarget === 'custom') {
      setCustomBarcode(barcode);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/nutrition/foods?barcode=${encodeURIComponent(barcode)}`);
      if (res.data && res.data.length > 0) {
        // Automatically select the resolved food to show servings configuration
        setSelectedFood(res.data[0]);
        setQuantity('1'); // default to 1 serving
      } else {
        showAlert({
          title: 'Product Not Found',
          message: `No product found for barcode: ${barcode}`,
          why: 'This specific barcode is not registered in our food databases yet.',
          actionGuide: 'Please enter this food manually or check the barcode numbers and try again.',
          type: 'warning',
        });
      }
    } catch (e) {
      console.error('Error fetching barcode product details', e);
      showAlert({
        title: 'Barcode Scan Failed',
        message: 'Could not fetch product details.',
        why: 'The network connection timed out or database search request failed.',
        actionGuide: 'Check your internet connection, ensure the barcode is fully in view, and try scanning again.',
        type: 'error',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Log food consumption
  const handleLogFood = async () => {
    if (!selectedFood) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      showAlert({
        title: 'Invalid Quantity',
        message: 'The food serving size quantity is invalid.',
        why: 'Serving portion must be a positive number greater than zero.',
        actionGuide: 'Enter a valid positive number in the serving quantity input.',
        type: 'warning',
      });
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
      showAlert({
        title: 'Food Log Failed',
        message: 'Could not log the selected food item to your diary.',
        why: 'A network request error occurred or the session token is invalid.',
        actionGuide: 'Verify your internet connection and tap the Log button again.',
        type: 'error',
      });
    }
  };

  // Create customized food log
  const handleCreateAndLogFood = async () => {
    if (!customName || !customCalories) {
      showAlert({
        title: 'Missing Required Fields',
        message: 'Food name and calorie values are required.',
        why: 'We need at least the food name and total calories to accurately track your metrics and display progress indicators.',
        actionGuide: 'Please supply a descriptive food name and a valid calorie value, then try logging again.',
        type: 'warning',
      });
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
      showAlert({
        title: 'Custom Food Log Failed',
        message: 'Unable to save and log your custom food item.',
        why: 'A network error occurred or the nutrition server declined the custom attributes.',
        actionGuide: 'Check your internet connection, ensure the calorie and macro numbers are correct, and try again.',
        type: 'error',
      });
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
      showAlert({
        title: 'Media Access Denied',
        message: 'Hadafak cannot open your image gallery.',
        why: 'Media library access permission has been denied by your operating system.',
        actionGuide: 'Go to your device app settings, allow media permissions for Hadafak, and try again.',
        type: 'warning',
      });
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
      showAlert({
        title: 'Gallery Import Failed',
        message: 'Could not load your selected image.',
        why: 'An internal error occurred while reading the file path or permission was denied.',
        actionGuide: 'Try choosing another image or snapping a new photo directly using your camera.',
        type: 'error',
      });
    }
  };

  const takePhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Camera Access Denied',
        message: 'Hadafak cannot open your device camera.',
        why: 'Camera hardware permissions were blocked or not granted.',
        actionGuide: 'Open your phone Settings -> Apps -> Hadafak -> Permissions, allow Camera usage, and try again.',
        type: 'warning',
      });
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
      showAlert({
        title: 'Camera Capture Failed',
        message: 'Could not capture photo from the camera.',
        why: 'The camera interface closed unexpectedly or device storage is full.',
        actionGuide: 'Please check your device storage availability and try relaunching the camera.',
        type: 'error',
      });
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
      showAlert({
        title: 'AI Scan Failed',
        message: 'The AI model could not analyze your meal image.',
        why: 'The image resolution might be insufficient, the food is unrecognizable, or our AI server encountered an error.',
        actionGuide: 'Take a clearer photo in good lighting, check your network connection, and retry.',
        type: 'error',
      });
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleLogAiFood = async () => {
    if (!aiResult) return;
    const qty = parseFloat(aiQuantity);
    if (isNaN(qty) || qty <= 0) {
      showAlert({
        title: 'Invalid Servings',
        message: 'Serving amount entered is incorrect.',
        why: 'The serving size quantity must be a positive decimal number greater than zero.',
        actionGuide: 'Enter a valid numeric multiplier (e.g. 1.0, 0.5, 2.0) in the serving field.',
        type: 'warning',
      });
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
      showAlert({
        title: 'Logging Failed',
        message: 'Could not save the AI scanned meal to your database.',
        why: 'The food entry could not be synchronized due to a network connection issue or database rejection.',
        actionGuide: 'Verify your internet connection and try pressing "Log Scanned Meal" again.',
        type: 'error',
      });
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
        <StateFeedback
          type="loading"
          title="Loading Nutrition Tracker..."
          description="Syncing macro goals, logged meals, and hydration counter."
        />
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

                  {/* Separate Favorites Heart Toggle */}
                  <TouchableOpacity
                    style={[
                      styles.favoritesToggleBtn,
                      selectedRecipeTag === 'Favorites' && styles.favoritesToggleBtnActive
                    ]}
                    onPress={() => setSelectedRecipeTag(selectedRecipeTag === 'Favorites' ? '' : 'Favorites')}
                    activeOpacity={0.8}
                  >
                    <Heart
                      size={18}
                      color={selectedRecipeTag === 'Favorites' ? '#FFFFFF' : '#EF4444'}
                      fill={selectedRecipeTag === 'Favorites' ? '#FFFFFF' : 'transparent'}
                    />
                  </TouchableOpacity>
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
                <StateFeedback
                  type="loading"
                  title="Loading delicious recipes..."
                  containerStyle={{ minHeight: 250 }}
                />
              ) : (() => {
                const isFavTag = selectedRecipeTag === 'Favorites';
                const filteredRecipes = isFavTag
                  ? recipes.filter((r) => favoriteRecipeIds.includes(r.id))
                  : recipes;
                
                if (filteredRecipes.length === 0) {
                  return (
                    <StateFeedback
                      type="empty"
                      title={isFavTag ? "No Favorite Recipes" : "No Recipes Found"}
                      description={isFavTag ? "Save your favorite recipes by tapping the heart icon in their detail cards." : "Try clearing your search query, choosing a different tag, or creating a custom recipe using your fridge ingredients."}
                      containerStyle={{ minHeight: 250 }}
                      icon={<Utensils size={36} color={COLORS.primary} />}
                    />
                  );
                }

                return filteredRecipes.map((item) => {
                  const matchScore = calculateMatchScore(item, fridgeIngredients);
                  const isFavorite = favoriteRecipeIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.recipeListItemCard}
                      onPress={() => handleOpenRecipeDetail(item)}
                      activeOpacity={0.9}
                    >
                      {/* Floating Favorite Heart Button */}
                      <TouchableOpacity
                        style={styles.favoriteHeartFloating}
                        onPress={() => toggleFavorite(item.id)}
                        activeOpacity={0.7}
                      >
                        <Heart
                          size={16}
                          color={isFavorite ? '#EF4444' : '#9CA3AF'}
                          fill={isFavorite ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>

                      <View style={styles.recipeCardMainRow}>
                        {/* Recipe Image / Fallback Thumbnail */}
                        <View style={styles.recipeCardImageContainer}>
                          {item.imageUrl ? (
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={styles.recipeCardImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.recipeCardImagePlaceholder}>
                              <Utensils size={24} color={COLORS.primary} />
                            </View>
                          )}
                        </View>

                        {/* Recipe Text content */}
                        <View style={styles.recipeCardContentRight}>
                          <View style={styles.recipeBadgesRow}>
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
                            {matchScore > 0 && (
                              <View style={[styles.sourceBadge, { backgroundColor: '#ECFDF5', marginLeft: 6 }]}>
                                <Text style={[styles.sourceBadgeText, { color: '#059669' }]}>
                                  {matchScore}% MATCH
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.recipeItemTitle} numberOfLines={1}>{item.title}</Text>
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
                  );
                });
              })()
              }
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
                        onPress={() => {
                          setBarcodeScanTarget('search');
                          setIsScanModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <ScanBarcode size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    {isSearching ? (
                      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 24 }} />
                    ) : (
                      <FlatList
                        data={
                          searchResults.length > 0
                            ? searchResults
                            : frequentFoods.length > 0
                            ? frequentFoods
                            : QUICK_FALLBACK_FOODS.slice(0, 5)
                        }
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
                          <Text style={styles.scanningText}>HADAFAK scanning your food please wait</Text>
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
                  <View style={styles.barcodeInputContainer}>
                    <TextInput
                      style={[styles.modalTextInput, { flex: 1 }]}
                      placeholder="e.g. 0123456789012"
                      keyboardType="numeric"
                      value={customBarcode}
                      onChangeText={setCustomBarcode}
                    />
                    <TouchableOpacity
                      style={styles.inlineScanButton}
                      onPress={() => {
                        setBarcodeScanTarget('custom');
                        setIsScanModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <ScanBarcode size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
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
                placeholder="Selected ingredients will appear here..."
                placeholderTextColor={COLORS.textMuted}
                value={fridgeIngredients}
                onChangeText={setFridgeIngredients}
                multiline
              />

              {/* Category-based Ingredient Selector */}
              <Text style={[styles.inputLabel, { marginTop: 12, fontSize: 13, color: COLORS.textMuted }]}>
                Tap ingredients to add/remove:
              </Text>
              {[
                {
                  category: 'Proteins',
                  items: ['Chicken', 'Beef', 'Egg', 'Tofu', 'Turkey', 'Salmon', 'Tuna'],
                },
                {
                  category: 'Carbs & Grains',
                  items: ['Oats', 'Rice', 'Sweet Potato', 'Pasta', 'Quinoa', 'Bread'],
                },
                {
                  category: 'Produce & Veggies',
                  items: ['Banana', 'Broccoli', 'Spinach', 'Garlic', 'Tomato', 'Onion', 'Avocado'],
                },
                {
                  category: 'Dairy & Extras',
                  items: ['Milk', 'Greek Yogurt', 'Cheese', 'Olive Oil', 'Butter', 'Soy Sauce'],
                },
              ].map((group) => (
                <View key={group.category} style={{ marginTop: 10 }}>
                  <Text style={styles.fridgeGroupTitle}>{group.category}</Text>
                  <View style={styles.quickTagsWrapper}>
                    {group.items.map((ing) => {
                      const lowerIng = ing.toLowerCase();
                      const currentList = fridgeIngredients
                        .split(',')
                        .map((x) => x.trim().toLowerCase())
                        .filter(Boolean);
                      const isSelected = currentList.includes(lowerIng);
                      return (
                        <TouchableOpacity
                          key={ing}
                          style={[
                            styles.quickIngTag,
                            isSelected && {
                              backgroundColor: COLORS.primaryLight,
                              borderColor: COLORS.primary,
                            },
                          ]}
                          onPress={() => {
                            let newList: string[];
                            if (isSelected) {
                              newList = currentList.filter((x) => x !== lowerIng);
                            } else {
                              newList = [...currentList, lowerIng];
                            }
                            setFridgeIngredients(newList.join(', '));
                          }}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.quickIngTagText,
                              isSelected && { color: COLORS.primary, fontWeight: '700' },
                            ]}
                          >
                            {isSelected ? '✓' : '+'} {ing}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.modalTitle, { flexShrink: 1 }]} numberOfLines={1}>
                        {selectedRecipeDetail.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(selectedRecipeDetail.id)}
                        style={{ marginLeft: 10, padding: 4 }}
                      >
                        <Heart
                          size={22}
                          color={favoriteRecipeIds.includes(selectedRecipeDetail.id) ? '#EF4444' : COLORS.textMuted}
                          fill={favoriteRecipeIds.includes(selectedRecipeDetail.id) ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
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

                {isCookingMode ? (
                  <View style={{ flex: 1, paddingVertical: 10 }}>
                    {/* Header with step number & close button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={styles.wizardStepHeading}>
                        Step {activeStepIndex + 1} of {selectedRecipeDetail.instructions?.length || 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setIsCookingMode(false)}
                        style={styles.exitWizardBtn}
                      >
                        <Text style={styles.exitWizardText}>Exit Chef Mode</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.wizardProgressBarTrack}>
                      <View
                        style={[
                          styles.wizardProgressBarFill,
                          {
                            width: `${((activeStepIndex + 1) / (selectedRecipeDetail.instructions?.length || 1)) * 100}%`,
                          },
                        ]}
                      />
                    </View>

                    <ScrollView style={{ flex: 1, marginTop: 20 }} showsVerticalScrollIndicator={false}>
                      <View style={styles.wizardCard}>
                        <Text style={styles.wizardInstructionText}>
                          {selectedRecipeDetail.instructions?.[activeStepIndex]}
                        </Text>
                      </View>

                      {/* Timer Integration */}
                      {(() => {
                        const stepText = selectedRecipeDetail.instructions?.[activeStepIndex] || '';
                        const minutes = detectTimerMinutes(stepText);
                        if (minutes !== null) {
                          return (
                            <View style={styles.timerContainer}>
                              <Text style={styles.timerTitle}>Step Timer: {minutes} min suggested</Text>
                              <Text style={styles.timerDisplay}>
                                {timerSeconds > 0 ? formatTime(timerSeconds) : `${minutes}:00`}
                              </Text>
                              <View style={styles.timerControls}>
                                <TouchableOpacity
                                  style={[styles.timerBtn, isTimerRunning ? styles.timerBtnPause : styles.timerBtnStart]}
                                  onPress={() => {
                                    if (timerSeconds === 0) {
                                      setTimerSeconds(minutes * 60);
                                    }
                                    setIsTimerRunning(!isTimerRunning);
                                  }}
                                >
                                  <Text style={styles.timerBtnText}>
                                    {isTimerRunning ? 'Pause' : timerSeconds > 0 ? 'Resume' : 'Start'}
                                  </Text>
                                </TouchableOpacity>
                                {timerSeconds > 0 && (
                                  <TouchableOpacity
                                    style={[styles.timerBtn, styles.timerBtnReset]}
                                    onPress={() => {
                                      setTimerSeconds(0);
                                      setIsTimerRunning(false);
                                    }}
                                  >
                                    <Text style={styles.timerBtnText}>Reset</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </ScrollView>

                    {/* Wizard Nav controls */}
                    <View style={styles.wizardNavFooter}>
                      <TouchableOpacity
                        style={[styles.wizardNavBtn, activeStepIndex === 0 && { opacity: 0.5 }]}
                        onPress={() => {
                          if (activeStepIndex > 0) {
                            setActiveStepIndex(prev => prev - 1);
                            setTimerSeconds(0);
                            setIsTimerRunning(false);
                          }
                        }}
                        disabled={activeStepIndex === 0}
                      >
                        <Text style={styles.wizardNavBtnText}>Previous</Text>
                      </TouchableOpacity>

                      {activeStepIndex < (selectedRecipeDetail.instructions?.length || 1) - 1 ? (
                        <TouchableOpacity
                          style={[styles.wizardNavBtn, styles.wizardNavBtnNext]}
                          onPress={() => {
                            setActiveStepIndex(prev => prev + 1);
                            setTimerSeconds(0);
                            setIsTimerRunning(false);
                          }}
                        >
                          <Text style={[styles.wizardNavBtnText, { color: '#FFF' }]}>Next Step</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.wizardNavBtn, styles.wizardNavBtnFinish]}
                          onPress={() => {
                            setIsCookingMode(false);
                            showAlert({
                              title: 'Chef Mode Complete!',
                              message: 'Well done cooking this delicious healthy meal!',
                              type: 'success',
                              why: 'You have walked through all the required kitchen steps.',
                              actionGuide: 'Tap Log this Meal in the details screen to save the macros to your daily tracker.'
                            });
                          }}
                        >
                          <Text style={[styles.wizardNavBtnText, { color: '#FFF' }]}>Finish</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : (
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {/* Recipe Image Banner */}
                    {selectedRecipeDetail.imageUrl ? (
                      <Image
                        source={{ uri: selectedRecipeDetail.imageUrl }}
                        style={styles.detailRecipeImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.detailRecipeImagePlaceholder}>
                        <Utensils size={40} color={COLORS.primary} />
                        <Text style={styles.detailRecipeImagePlaceholderText}>Healthy Recipe</Text>
                      </View>
                    )}

                    {/* Portion / Servings Scaler */}
                    <View style={styles.portionScalerCard}>
                      <Text style={styles.portionScalerTitle}>Scale Recipe Servings</Text>
                      <View style={styles.portionControls}>
                        <TouchableOpacity
                          onPress={() => setServingsScale((prev) => Math.max(1, prev - 1))}
                          style={styles.portionBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.portionBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.portionValue}>
                          {servingsScale} {servingsScale === 1 ? 'serving' : 'servings'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setServingsScale((prev) => prev + 1)}
                          style={styles.portionBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.portionBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Detailed macros strip */}
                    <View style={[styles.recipeMacrosBar, { marginHorizontal: 0, paddingVertical: 14, backgroundColor: '#FAFAFA' }]}>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Calories</Text>
                        <Text style={[styles.macroPillValue, { fontSize: 16, color: COLORS.primary }]}>
                          {Math.round(selectedRecipeDetail.calories * servingsScale)} kcal
                        </Text>
                      </View>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Protein</Text>
                        <Text style={[styles.macroPillValue, { fontSize: 16 }]}>
                          {Math.round(selectedRecipeDetail.protein * servingsScale * 10) / 10}g
                        </Text>
                      </View>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Carbs</Text>
                        <Text style={[styles.macroPillValue, { fontSize: 16 }]}>
                          {Math.round(selectedRecipeDetail.carbs * servingsScale * 10) / 10}g
                        </Text>
                      </View>
                      <View style={styles.recipeMacroPill}>
                        <Text style={styles.macroPillLabel}>Fat</Text>
                        <Text style={[styles.macroPillValue, { fontSize: 16 }]}>
                          {Math.round(selectedRecipeDetail.fat * servingsScale * 10) / 10}g
                        </Text>
                      </View>
                    </View>

                    {/* Calorie Budget Impact Analysis */}
                    {(() => {
                      const remainingCals = Math.max(0, summary.calories.target - summary.calories.consumed);
                      const mealCals = Math.round(selectedRecipeDetail.calories * servingsScale);
                      const remainingAfterLog = Math.max(0, remainingCals - mealCals);
                      return (
                        <View style={styles.macroImpactBox}>
                          <TrendingUp size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.macroImpactText}>
                            Logging this will leave you with{' '}
                            <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>
                              {remainingAfterLog} kcal
                            </Text>{' '}
                            remaining for today.
                          </Text>
                        </View>
                      );
                    })()}

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
                          const baseServings = selectedRecipeDetail.servings || 1;
                          const scaledAmount = Math.round(((ing.amount / baseServings) * servingsScale) * 10) / 10;
                          const displayAmount = isNaN(scaledAmount) ? ing.amount : scaledAmount;
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
                                  {displayAmount} {ing.unit}
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
                                          New Macros: {substitutionResult.macrosDifference.calories} KCal • P: {substitutionResult.macrosDifference.protein}g • C: {substitutionResult.macrosDifference.carbs}g • F: {substitutionResult.macrosDifference.fat}g
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={styles.detailSectionTitle}>Cooking Steps</Text>
                        {selectedRecipeDetail.instructions && selectedRecipeDetail.instructions.length > 0 && (
                          <TouchableOpacity
                            style={styles.startCookingBtn}
                            onPress={() => {
                              setIsCookingMode(true);
                              setActiveStepIndex(0);
                              setTimerSeconds(0);
                              setIsTimerRunning(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Sparkles size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.startCookingText}>Chef Mode</Text>
                          </TouchableOpacity>
                        )}
                      </View>
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
                )}

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
    marginBottom: 18,
  },
  tagsContentContainer: {
    paddingHorizontal: 20,
  },
  favoritesToggleBtn: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  favoritesToggleBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
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
  fridgeGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  portionScalerCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  portionScalerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  portionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  portionBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  portionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 20,
    minWidth: 80,
    textAlign: 'center',
  },
  macroImpactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  macroImpactText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  startCookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  startCookingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  wizardStepHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  exitWizardBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
  },
  exitWizardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  wizardProgressBarTrack: {
    height: 6,
    backgroundColor: '#EAEAEA',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  wizardProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  wizardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wizardInstructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 28,
    textAlign: 'center',
  },
  timerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  timerDisplay: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  timerControls: {
    flexDirection: 'row',
  },
  timerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  timerBtnStart: {
    backgroundColor: COLORS.primary,
  },
  timerBtnPause: {
    backgroundColor: '#F59E0B',
  },
  timerBtnReset: {
    backgroundColor: '#EF4444',
  },
  timerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  wizardNavFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    marginTop: 12,
  },
  wizardNavBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  wizardNavBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  wizardNavBtnNext: {
    backgroundColor: COLORS.primary,
  },
  wizardNavBtnFinish: {
    backgroundColor: '#10B981',
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
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineScanButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
  favoriteHeartFloating: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  recipeCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeCardImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  recipeCardImage: {
    width: '100%',
    height: '100%',
  },
  recipeCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  recipeCardContentRight: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  recipeBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailRecipeImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
  },
  detailRecipeImagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailRecipeImagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
