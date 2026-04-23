import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, Pressable, ViewToken } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';
import { ScanBarcode, Package, Database, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../components/useColorScheme';

const { width } = Dimensions.get('window');

interface OnboardingProps {
  onFinished: () => void;
}

export function Onboarding({ onFinished }: OnboardingProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useTranslation();

  const SLIDES = useMemo(() => [
    {
      id: '1',
      title: t('onboarding.slide1_title'),
      description: t('onboarding.slide1_desc'),
      icon: ScanBarcode,
      color: '#1F7A68',
    },
    {
      id: '2',
      title: t('onboarding.slide2_title'),
      description: t('onboarding.slide2_desc'),
      icon: Package,
      color: '#EF8354',
    },
    {
      id: '3',
      title: t('onboarding.slide3_title'),
      description: t('onboarding.slide3_desc'),
      icon: Database,
      color: '#57C7A5',
    },
  ], [t]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('@has_seen_onboarding', 'true');
      onFinished();
    } catch (e) {
      console.warn(e);
    }
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      runOnJS(setCurrentIndex)(viewableItems[0].index ?? 0);
    }
  }).current;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <Slide item={item} index={index} scrollX={scrollX} />
        )}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <Dot index={index} scrollX={scrollX} key={index} />
          ))}
        </View>

        <Pressable 
          style={({ pressed }) => [
            styles.button, 
            { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }
          ]}
          onPress={currentIndex === SLIDES.length - 1 ? handleFinish : undefined}
        >
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? t('onboarding.button_start') : t('onboarding.button_next')}
          </Text>
          <ArrowRight size={20} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

function Slide({ item, index, scrollX }: { item: any, index: number, scrollX: Animated.SharedValue<number> }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const animatedIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.iconContainer, { backgroundColor: `${item.color}1F` }, animatedIconStyle]}>
        <item.icon size={120} color={item.color} strokeWidth={1.5} />
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: theme.mutedText }]}>{item.description}</Text>
      </View>
    </View>
  );
}

function Dot({ index, scrollX }: { index: number, scrollX: Animated.SharedValue<number> }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const animatedDotStyle = useAnimatedStyle(() => {
    const widthDot = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [10, 24, 10],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );
    return { width: widthDot, opacity };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: theme.tint }, animatedDotStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 30,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  button: {
    height: 60,
    paddingHorizontal: 32,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
