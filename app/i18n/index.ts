import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      filters: {
        difficulty: 'Difficulty',
        numberOfHoles: 'Number of Holes',
        priceRange: 'Price Range',
        amenities: 'Amenities',
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        expert: 'Expert',
        professional: 'Professional',
        budget: 'Budget',
        moderate: 'Moderate',
        expensive: 'Expensive',
        luxury: 'Luxury',
        proShop: 'Pro Shop',
        restaurant: 'Restaurant',
        practiceFacility: 'Practice Facility',
        drivingRange: 'Driving Range',
        cartRental: 'Cart Rental',
        clubRental: 'Club Rental',
        selected: 'selected',
        notSelected: 'not selected',
      },
      errors: {
        somethingWentWrong: 'Something went wrong',
        tryAgain: 'Try again',
        failedToInitialize: 'Failed to initialize framework',
      },
      loading: {
        initializing: 'Initializing...',
      },
    },
  },
  es: {
    translation: {
      filters: {
        difficulty: 'Dificultad',
        numberOfHoles: 'Número de Hoyos',
        priceRange: 'Rango de Precios',
        amenities: 'Servicios',
        beginner: 'Principiante',
        intermediate: 'Intermedio',
        advanced: 'Avanzado',
        expert: 'Experto',
        professional: 'Profesional',
        budget: 'Económico',
        moderate: 'Moderado',
        expensive: 'Costoso',
        luxury: 'Lujo',
        proShop: 'Tienda Pro',
        restaurant: 'Restaurante',
        practiceFacility: 'Área de Práctica',
        drivingRange: 'Campo de Práctica',
        cartRental: 'Alquiler de Carrito',
        clubRental: 'Alquiler de Palos',
        selected: 'seleccionado',
        notSelected: 'no seleccionado',
      },
      errors: {
        somethingWentWrong: 'Algo salió mal',
        tryAgain: 'Intentar de nuevo',
        failedToInitialize: 'Error al inicializar el framework',
      },
      loading: {
        initializing: 'Inicializando...',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 