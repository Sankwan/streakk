// Visual constants adapted from supplied Genex candidate. No runtime platform dependencies.
export const CONFIG = {
  car: {
    length: 4.55,
    width: 1.95,
    height: 1.22,
    wheelBase: 2.70, // distance between front and rear axle
    trackWidth: 1.66, // distance between left and right wheel centers
    wheelRadius: 0.35,
    wheelWidth: 0.28,
    // Local-space convention: origin on the ground (y=0), centered laterally, halfway between the axles.
    // +Z = forward, +Y = up, +X = the car's LEFT side, -X = RIGHT side.
    frontAxleZ: 1.35, // = wheelBase / 2
    rearAxleZ: -1.35,
    collisionHalfLength: 2.25,
    collisionHalfWidth: 0.95,
  },

  // Player + opponent liveries: Ghana taxi two-tone. `color` is the body paint, `accent` the taxi
  // panels on the front and rear quarters (yellow / orange, as on Accra's taxis; see references/car*.jpg).
  liveries: [
    { name: 'YOU', color: 0x713c38, accent: 0xb58a46 }, // player: taxi red with yellow quarters
    { name: 'KOJO', color: 0x747b77, accent: 0xb27a3d }, // silver-grey with orange
    { name: 'AMA', color: 0x303633, accent: 0xae7c40 }, // black with orange
    { name: 'KWAME', color: 0xc5c3b6, accent: 0xb58a46 }, // white with yellow
    { name: 'ESI', color: 0x475f4b, accent: 0xb58a46 }, // forest green with yellow
    { name: 'YAW', color: 0x643c3d, accent: 0xa88a50 }, // maroon with gold
    { name: 'AKOSUA', color: 0x40566a, accent: 0xb27a3d }, // royal blue with orange
    { name: 'KOFI', color: 0xb58a46, accent: 0x343b34 }, // yellow with black quarters
  ],

};
export const LAYERS={DEFAULT:0,NO_REFLECTION:3};
