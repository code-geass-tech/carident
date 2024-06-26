import { Alert, StyleSheet } from 'react-native';
import { View } from '@/components/Themed';
import { useColorScheme, View as NormalView, Text, Dimensions } from 'react-native';

import MapView, { Marker, Callout } from 'react-native-maps';
import { useState, useEffect, useRef } from 'react';
import Animated, { SlideInDown, SlideOutDown, SlideOutLeft } from 'react-native-reanimated';
import * as Location from 'expo-location'
import PlaceCard from '@/components/PlaceCard';
import { Loader } from '@/components/Loader';
import { getNearbyClinics, Coords } from '@/services/mapService';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';

import { YStack, SizableText, Button } from 'tamagui';
import { Search, CheckCircle2, ChevronRight, Locate } from '@tamagui/lucide-icons';
import { Link } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.85;
const cardMargin = 10; 

const LATITIUDE_DELTA = 0.00422
const LONGITUDE_DELTA = 0.00421

interface MapRegion {
  latitude: number,
  longitude: number,
  latitudeDelta: number,
  longitudeDelta: number
}

const INITIAL_REGION = {
  /* Feut */
  latitude: 14.604326629763175,
  longitude: 120.98867833889382,
  latitudeDelta: LATITIUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA 
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject>()
  const [region, setRegion] = useState<MapRegion>(INITIAL_REGION)
  const [nearbyPlaces, setNearbyPlaces] = useState<any>()
  const [loading, setLoading] = useState(false)

  const carouselRef = useRef<ICarouselInstance>(null)
  const mapRef = useRef<any>()
  const theme = useColorScheme()

  const getCurrentLocation = async () => {
    const location = await Location.getCurrentPositionAsync()
    setLocation(location)
    setRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: LATITIUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA
    })
    mapRef?.current?.animateCamera(
      {
        center: { ...region },
      },
      { duration: 2000 }
    );
  }
  
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status != 'granted') {
        Alert.alert("Permission to access location was denied.")
        return;
      }
      getCurrentLocation()
    })()

  }, [])

  const onMarkerPress = (place: Coords, index: number) => {
    mapRef?.current?.animateCamera(
      {
        center: {
          ...place,
          latitudeDelta: LATITIUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA, 
        },
      },
      { duration: 2000 }
    );
    carouselRef.current?.scrollTo({index: index, animated: true})
  };

  const getNearby =  async () => {
    setLoading(true)
    setNearbyPlaces(null)

    await getNearbyClinics({...location?.coords!})
      .then((nearby) => {
        setNearbyPlaces(nearby)
        console.log(nearby)
      })
      .catch((error) => {
        console.log(error)
        Alert.alert("No nearby clinics")
      })
      .finally(() => {
        setLoading(false)
      })
  }
  
  return (
    <View style={styles.container}>
       <MapView
        style={styles.map}
        initialRegion={INITIAL_REGION}
        region={region}
        ref={mapRef}
        userInterfaceStyle={theme ?? 'light'}
        showsUserLocation
       >
        {nearbyPlaces && nearbyPlaces.map((nearby: any, index: number) => {
          return (
            <Marker key={index} 
              coordinate={{
                latitude: nearby.geometry.location.lat,
                longitude: nearby.geometry.location.lng
              }} 
              onPress={() => onMarkerPress({
                latitude: nearby.geometry.location.lat,
                longitude: nearby.geometry.location.lng
              }, index)}>
              <Callout>
                <NormalView style={{ padding: 5 }}>
                  <Text>{nearby.name}</Text>
                </NormalView>
              </Callout>
            </Marker>
          )
        })}
        </MapView>
        <Animated.View style={styles.absolute}>
          { nearbyPlaces ? 
          <Animated.View entering={SlideOutLeft} exiting={SlideOutDown}>
            <Carousel 
              ref={carouselRef} 
              width={screenWidth} 
              height={245}
              data={nearbyPlaces} 
              renderItem={({ item, index }: any) => {
              return (
                <PlaceCard place={{
                  coordinate: {
                    latitude: item.geometry.latitude,
                    longitude: item.geometry.longitude
                  },
                  title: item.name,
                  description: item.vicinity,
                  rating: item.rating,
                  reviews: item.user_ratings_total,
                  open_now: item.opening_hours?.open_now ?? false
                }}
                onPress={() => {
                  onMarkerPress({
                    latitude: item.geometry.location.lat,
                    longitude: item.geometry.location.lng
                  }, index)
                }}
                />
              )
            }} mode='parallax' />
          </Animated.View>
          :
          <Animated.View entering={SlideInDown}>
            {/*<PromptCard onPress={getNearby}/>*/}
          </Animated.View>
          }
        </Animated.View>
        <YStack position='absolute' flex={1} top={0} right={0} alignItems='flex-end' margin="$2" gap="$2">
          <Link href="/partner" asChild style={{alignSelf: "flex-end"}}>
            <Button icon={CheckCircle2} theme={'blue'} iconAfter={ChevronRight}>
              Partnered Clinics
            </Button>
          </Link>
          <Button padding="$3" icon={<Search size="$1" />} onPress={getNearby}></Button>
          <Button padding="$3" icon={<Locate size="$1"/>} onPress={getCurrentLocation}/>
        </YStack>
        { loading && <Loader />}
    </View>
  );
}

interface PromptCardProps {
  onPress: () => void
}

function PromptCard({onPress}: PromptCardProps) {
  return (
    <YStack
      justifyContent={"center"}
      gap={5}
      alignItems="center"
      flex={1}
      borderRadius={10}
      margin={cardMargin}
      backgroundColor={"$background"}
    >
      <SizableText paddingVertical={2}>Tap on Nearby Clinics to View</SizableText>
      <Button width={'100%'} borderTopEndRadius={0} borderTopStartRadius={0} onPress={onPress}>
        Get Nearby
      </Button>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  absolute: {
    position: 'absolute',
    bottom: 0,
  },
  scrollContent: {
    justifyContent: 'center',
  },
  toolbox: {
    top: 0,
    alignSelf: 'flex-end',
    justifyContent:'flex-end',
    backgroundColor: 'transparent',
    position: 'absolute'
  },
  tool: {
    flexShrink: 1,
    margin: 3
  }
});
