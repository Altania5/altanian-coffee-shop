// Import your images here
import latte from './latte.jpg';
import shakenEspresso from './shakenEspresso.jpg';

// Export them in an object
const images = {
    latte,
    shakenEspresso,
    americano: latte, // Use latte as fallback for americano
    macchiato: latte, // Use latte as fallback for macchiato
    coldbrew: latte, // Use latte as fallback for coldbrew
    croissant: latte, // Use latte as fallback for pastries
    shaken_espresso: shakenEspresso,
    default: latte // Use latte as default instead of external URL
};

export default images;