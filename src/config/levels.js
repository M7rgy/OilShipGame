'use strict';

/**
 * Level configuration for the five runs through the Strait.
 *
 * Difficulty scales along three axes:
 *  - passage: the navigable channel between the rocky shores narrows
 *    (passageTop grows / passageBottom shrinks toward the middle).
 *  - spawns: mines get denser and missiles fire more often and fly faster.
 *  - current: the water current pushing the ship around gets stronger and
 *    more chaotic (gusts change direction more often).
 *
 * distance   : metres of strait to cross (world pixels = distance * 10)
 * scrollSpeed: baseline forward drift of the ship in px/s (the loaded tanker
 *              never fully stops in the shipping lane)
 * passageTop / passageBottom: y bounds (px, 720-high playfield) of safe water
 * mineEvery  : average horizontal px between floating mine clusters
 * mineChance : chance that a spawn slot actually holds a mine (0..1)
 * missileEvery: average seconds between missile launches
 * missileSpeed: missile cruise speed px/s
 * missileTurn : missile homing turn rate deg/s (higher = harder to shake)
 * currentForce: mean water-current acceleration px/s^2 applied to the ship
 * currentShift: seconds between current direction changes (lower = choppier)
 * waterTint / skyTop / skyBottom: palette so each leg of the strait looks distinct
 */
const LEVELS = [
  {
    id: 1,
    name: 'Khasab Approach',
    briefing: 'Calm seas. Scattered mines drift in the shallows. Watch the current.',
    distance: 900,
    scrollSpeed: 40,
    passageTop: 120,
    passageBottom: 660,
    mineEvery: 520,
    mineChance: 0.7,
    missileEvery: 11,
    missileSpeed: 150,
    missileTurn: 40,
    currentForce: 14,
    currentShift: 6.0,
    waterTint: 0x0d4f6e,
    skyTop: 0x2a6f97,
    skyBottom: 0xf2c078
  },
  {
    id: 2,
    name: 'Qeshm Narrows',
    briefing: 'The channel tightens. Shore batteries are waking up.',
    distance: 1100,
    scrollSpeed: 46,
    passageTop: 160,
    passageBottom: 630,
    mineEvery: 430,
    mineChance: 0.78,
    missileEvery: 8.5,
    missileSpeed: 175,
    missileTurn: 52,
    currentForce: 24,
    currentShift: 4.5,
    waterTint: 0x0b4460,
    skyTop: 0x1f5f8b,
    skyBottom: 0xe8a05d
  },
  {
    id: 3,
    name: 'Larak Gauntlet',
    briefing: 'Dense minefield ahead. Missiles now track harder. Currents swirl.',
    distance: 1300,
    scrollSpeed: 52,
    passageTop: 195,
    passageBottom: 600,
    mineEvery: 350,
    mineChance: 0.85,
    missileEvery: 6.5,
    missileSpeed: 200,
    missileTurn: 66,
    currentForce: 36,
    currentShift: 3.2,
    waterTint: 0x093a55,
    skyTop: 0x174a75,
    skyBottom: 0xc97b4a
  },
  {
    id: 4,
    name: 'Hengam Chokepoint',
    briefing: 'Night passage. The strait is a corridor of spikes and fire.',
    distance: 1500,
    scrollSpeed: 58,
    passageTop: 230,
    passageBottom: 570,
    mineEvery: 285,
    mineChance: 0.9,
    missileEvery: 5.0,
    missileSpeed: 225,
    missileTurn: 80,
    currentForce: 50,
    currentShift: 2.4,
    waterTint: 0x072e46,
    skyTop: 0x0e3556,
    skyBottom: 0x8c4c3a
  },
  {
    id: 5,
    name: 'Hormuz Breakout',
    briefing: 'Full blockade. Thread the needle and make for open ocean.',
    distance: 1800,
    scrollSpeed: 64,
    passageTop: 265,
    passageBottom: 540,
    mineEvery: 230,
    mineChance: 0.95,
    missileEvery: 3.8,
    missileSpeed: 250,
    missileTurn: 95,
    currentForce: 66,
    currentShift: 1.7,
    waterTint: 0x05243a,
    skyTop: 0x081f38,
    skyBottom: 0x5e2f33
  }
];

// px per "metre" of strait distance
const WORLD_SCALE = 10;
