/* Static, bundled 3D artwork. No event discovery or ticketing requests. */
(() => {
  'use strict';
  const LOCAL_ART='/assets/littlest-tokyo.glb';
  window.NES_LOAD_ART = function(world) {
    if(!world.attachArtistScene || !window.NES_GLTFLoader) return Promise.reject(new Error('The 3D artwork loader is unavailable.'));
    const loader=new window.NES_GLTFLoader();
    return new Promise((resolve,reject)=>{
      loader.load(window.NES_ART_URL || LOCAL_ART, gltf=>{
        if(world.dead){reject(new Error('The city has closed.'));return;}
        try{world.attachArtistScene(gltf.scene,gltf.animations);resolve(true);}
        catch(error){reject(error);}
      },undefined,()=>reject(new Error('The city artwork could not load. Reload to try again.')));
    });
  };
})();
