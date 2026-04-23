import { useEffect, useState } from 'react';

import sewerTiles from '../assets/pixel-dungeon/environment/tiles_sewers.png';
import water0 from '../assets/pixel-dungeon/environment/water0.png';
import water1 from '../assets/pixel-dungeon/environment/water1.png';
import water2 from '../assets/pixel-dungeon/environment/water2.png';
import water3 from '../assets/pixel-dungeon/environment/water3.png';
import water4 from '../assets/pixel-dungeon/environment/water4.png';
import warriorSprite from '../assets/pixel-dungeon/sprites/warrior.png';
import mageSprite from '../assets/pixel-dungeon/sprites/mage.png';
import rogueSprite from '../assets/pixel-dungeon/sprites/rogue.png';
import huntressSprite from '../assets/pixel-dungeon/sprites/huntress.png';
import itemsSprite from '../assets/pixel-dungeon/sprites/items.png';
import ratSprite from '../assets/pixel-dungeon/sprites/rat.png';
import batSprite from '../assets/pixel-dungeon/sprites/bat.png';
import gnollSprite from '../assets/pixel-dungeon/sprites/gnoll.png';
import gooSprite from '../assets/pixel-dungeon/sprites/goo.png';
import scorpioSprite from '../assets/pixel-dungeon/sprites/scorpio.png';

export default function useAssetImages() {
  const [assetImages, setAssetImages] = useState({
    tiles: null,
    waterFrames: [null, null, null, null, null],
    warrior: null,
    mage: null,
    rogue: null,
    huntress: null,
    items: null,
    rat: null,
    bat: null,
    gnoll: null,
    goo: null,
    scorpio: null,
  });

  useEffect(() => {
    const loadImage = (src, key, onLoad) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (onLoad) {
          onLoad(img);
        } else {
          setAssetImages(prev => ({ ...prev, [key]: img }));
        }
      };
    };

    const loadWaterFrame = (src, frameIndex) => {
      loadImage(src, null, (img) => {
        setAssetImages(prev => {
          const nextFrames = prev.waterFrames.slice();
          nextFrames[frameIndex] = img;
          return { ...prev, waterFrames: nextFrames };
        });
      });
    };

    loadImage(sewerTiles, 'tiles');
    loadWaterFrame(water0, 0);
    loadWaterFrame(water1, 1);
    loadWaterFrame(water2, 2);
    loadWaterFrame(water3, 3);
    loadWaterFrame(water4, 4);
    loadImage(warriorSprite, 'warrior');
    loadImage(mageSprite, 'mage');
    loadImage(rogueSprite, 'rogue');
    loadImage(huntressSprite, 'huntress');
    loadImage(itemsSprite, 'items');
    loadImage(ratSprite, 'rat');
    loadImage(batSprite, 'bat');
    loadImage(gnollSprite, 'gnoll');
    loadImage(gooSprite, 'goo');
    loadImage(scorpioSprite, 'scorpio');
  }, []);

  return assetImages;
}
