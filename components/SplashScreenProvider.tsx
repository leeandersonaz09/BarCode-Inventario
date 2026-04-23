import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { Package } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../components/useColorScheme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProviderProps {
  children: React.ReactNode;
}

export function SplashScreenProvider({ children }: SplashScreenProviderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [isAppReady, setIsAppReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const scanLinePos = useSharedValue(-50);

  useEffect(() => {
    // Start splash animation sequence
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    
    // Simulate scan line
    scanLinePos.value = withDelay(500, withTiming(120, { duration: 1500 }));

    // Wait for app to be ready
    const prepare = async () => {
      try {
        // Force splash to stay visible for at least 4 seconds
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Hide native splash early so our animation is visible
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsAppReady(true);
      }
    };

    prepare();
  }, []);

  useEffect(() => {
    if (isAppReady) {
      // Exit animation
      logoTranslateY.value = withDelay(500, withTiming(-50, { duration: 600 }));
      logoOpacity.value = withDelay(500, withTiming(0, { duration: 400 }));
      containerOpacity.value = withDelay(800, withTiming(0, { duration: 600 }, () => {
        runOnJS(setAnimationFinished)(true);
      }));
    }
  }, [isAppReady]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value }
    ],
    opacity: logoOpacity.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const animatedScanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePos.value }],
    opacity: interpolate(scanLinePos.value, [-50, 0, 80, 120], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));

  if (animationFinished) {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      {children}
      <Animated.View 
        pointerEvents="none" 
        style={[
          styles.container, 
          { backgroundColor: theme.background },
          animatedContainerStyle
        ]}
      >
        <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
          <Package size={100} color={theme.tint} strokeWidth={1.5} />
          <Animated.View style={[styles.scanLine, { backgroundColor: theme.accent }, animatedScanLineStyle]} />
        </Animated.View>
        
        <Animated.Text style={[styles.title, { color: theme.text, opacity: logoOpacity }]}>
          ESTOQUE
          <Animated.Text style={{ color: theme.tint }}> PRO</Animated.Text>
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  scanLine: {
    position: 'absolute',
    width: 110,
    height: 3,
    borderRadius: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  }
});
