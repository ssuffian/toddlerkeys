import type { PictureTheme } from '../shared/contracts';

export type LetterPicture = { icon: string; word: string };

export const LETTER_PICTURES: Record<PictureTheme, Record<string, LetterPicture>> = {
  mixed: {
    A: { icon: '🍎', word: 'Apple' }, B: { icon: '⚽️', word: 'Ball' }, C: { icon: '🐱', word: 'Cat' },
    D: { icon: '🐶', word: 'Dog' }, E: { icon: '🐘', word: 'Elephant' }, F: { icon: '🐟', word: 'Fish' },
    G: { icon: '🍇', word: 'Grapes' }, H: { icon: '🏠', word: 'House' }, I: { icon: '🍦', word: 'Ice cream' },
    J: { icon: '🧃', word: 'Juice' }, K: { icon: '🪁', word: 'Kite' }, L: { icon: '🦁', word: 'Lion' },
    M: { icon: '🌙', word: 'Moon' }, N: { icon: '🪺', word: 'Nest' }, O: { icon: '🐙', word: 'Octopus' },
    P: { icon: '🐷', word: 'Pig' }, Q: { icon: '👑', word: 'Queen' }, R: { icon: '🐰', word: 'Rabbit' },
    S: { icon: '☀️', word: 'Sun' }, T: { icon: '🐢', word: 'Turtle' }, U: { icon: '☂️', word: 'Umbrella' },
    V: { icon: '🎻', word: 'Violin' }, W: { icon: '🐳', word: 'Whale' }, X: { icon: '🎼', word: 'Xylophone' },
    Y: { icon: '🐂', word: 'Yak' }, Z: { icon: '🦓', word: 'Zebra' },
  },
  animals: {
    A: { icon: '🐜', word: 'Ant' }, B: { icon: '🐻', word: 'Bear' }, C: { icon: '🐱', word: 'Cat' },
    D: { icon: '🐶', word: 'Dog' }, E: { icon: '🐘', word: 'Elephant' }, F: { icon: '🦊', word: 'Fox' },
    G: { icon: '🐐', word: 'Goat' }, H: { icon: '🐴', word: 'Horse' }, I: { icon: '🦎', word: 'Iguana' },
    J: { icon: '🪼', word: 'Jellyfish' }, K: { icon: '🐨', word: 'Koala' }, L: { icon: '🦁', word: 'Lion' },
    M: { icon: '🐵', word: 'Monkey' }, N: { icon: '🐋', word: 'Narwhal' }, O: { icon: '🐙', word: 'Octopus' },
    P: { icon: '🐧', word: 'Penguin' }, Q: { icon: '🐦', word: 'Quail' }, R: { icon: '🐰', word: 'Rabbit' },
    S: { icon: '🐍', word: 'Snake' }, T: { icon: '🐯', word: 'Tiger' }, U: { icon: '🦄', word: 'Unicorn' },
    V: { icon: '🦅', word: 'Vulture' }, W: { icon: '🐳', word: 'Whale' }, X: { icon: '🐿️', word: 'Xerus' },
    Y: { icon: '🐂', word: 'Yak' }, Z: { icon: '🦓', word: 'Zebra' },
  },
  food: {
    A: { icon: '🍎', word: 'Apple' }, B: { icon: '🍌', word: 'Banana' }, C: { icon: '🧁', word: 'Cupcake' },
    D: { icon: '🍩', word: 'Donut' }, E: { icon: '🥚', word: 'Egg' }, F: { icon: '🍟', word: 'Fries' },
    G: { icon: '🍇', word: 'Grapes' }, H: { icon: '🍔', word: 'Hamburger' }, I: { icon: '🍦', word: 'Ice cream' },
    J: { icon: '🧃', word: 'Juice' }, K: { icon: '🥝', word: 'Kiwi' }, L: { icon: '🍋', word: 'Lemon' },
    M: { icon: '🥭', word: 'Mango' }, N: { icon: '🍜', word: 'Noodles' }, O: { icon: '🍊', word: 'Orange' },
    P: { icon: '🍕', word: 'Pizza' }, Q: { icon: '🌮', word: 'Quesadilla' }, R: { icon: '🍚', word: 'Rice' },
    S: { icon: '🍓', word: 'Strawberry' }, T: { icon: '🍅', word: 'Tomato' }, U: { icon: '🍜', word: 'Udon' },
    V: { icon: '🥕', word: 'Vegetables' }, W: { icon: '🍉', word: 'Watermelon' }, X: { icon: '🍉', word: 'Xigua' },
    Y: { icon: '🍠', word: 'Yam' }, Z: { icon: '🥒', word: 'Zucchini' },
  },
  transport: {
    A: { icon: '✈️', word: 'Airplane' }, B: { icon: '🚌', word: 'Bus' }, C: { icon: '🚗', word: 'Car' },
    D: { icon: '🚚', word: 'Delivery truck' }, E: { icon: '🚙', word: 'Electric car' }, F: { icon: '⛴️', word: 'Ferry' },
    G: { icon: '🚠', word: 'Gondola' }, H: { icon: '🚁', word: 'Helicopter' }, I: { icon: '🚆', word: 'Intercity train' },
    J: { icon: '✈️', word: 'Jet' }, K: { icon: '🛶', word: 'Kayak' }, L: { icon: '🚂', word: 'Locomotive' },
    M: { icon: '🚇', word: 'Metro' }, N: { icon: '🚆', word: 'Night train' }, O: { icon: '🚍', word: 'Oncoming bus' },
    P: { icon: '🛻', word: 'Pickup truck' }, Q: { icon: '🏍️', word: 'Quad bike' }, R: { icon: '🚀', word: 'Rocket' },
    S: { icon: '🛴', word: 'Scooter' }, T: { icon: '🚊', word: 'Tram' }, U: { icon: '🚲', word: 'Unicycle' },
    V: { icon: '🚐', word: 'Van' }, W: { icon: '🚃', word: 'Wagon' }, X: { icon: '⛵️', word: 'Xebec' },
    Y: { icon: '⛵️', word: 'Yacht' }, Z: { icon: '🎈', word: 'Zeppelin' },
  },
};
