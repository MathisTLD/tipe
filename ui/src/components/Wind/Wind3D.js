import * as Cesium from "cesium/Cesium";

import Util from "./Util";
import DataProcess from "./DataProcess";
import ParticleSystem from "./ParticleSystem";

// TODO: fix trails' color

class Wind3D {
  constructor(viewer, debug = false) {
    var options = {
      particles: {
        maxParticles: 64 * 64,
        particleHeight: 100.0,
        fadeOpacity: 0.92,
        dropRate: 0.003,
        dropRateBump: 0.15,
        speedFactor: 0.2,
        lineWidth: 3
      }
    };
    this.options = options;

    this.destroyCallbacks = [];

    if (debug) {
      options.useDefaultRenderLoop = false;
    }

    this.viewer = viewer;
    this.scene = this.viewer.scene;
    this.camera = this.viewer.camera;

    this.viewerParameters = {
      lonRange: new Cesium.Cartesian2(),
      latRange: new Cesium.Cartesian2(),
      pixelSize: 0.0
    };
    // use a smaller earth radius to make sure distance to camera > 0
    this.globeBoundingSphere = new Cesium.BoundingSphere(
      Cesium.Cartesian3.ZERO,
      0.99 * 6378137.0
    );
    this.updateViewerParameters();

    DataProcess.loadData().then(data => {
      this.particleSystem = new ParticleSystem(
        this.scene.context,
        data,
        this.getParticlesOptions(),
        this.viewerParameters
      );
      this.addPrimitives();

      this.setupEventListeners();

      if (debug) {
        this.debug();
      }
    });
  }

  addPrimitives() {
    // the order of primitives.add() should respect the dependency of primitives
    this.scene.primitives.add(
      this.particleSystem.particlesComputing.primitives.calculateSpeed
    );
    this.scene.primitives.add(
      this.particleSystem.particlesComputing.primitives.updatePosition
    );
    this.scene.primitives.add(
      this.particleSystem.particlesComputing.primitives.postProcessingPosition
    );

    this.scene.primitives.add(
      this.particleSystem.particlesRendering.primitives.segments
    );
    this.scene.primitives.add(
      this.particleSystem.particlesRendering.primitives.trails
    );
    this.scene.primitives.add(
      this.particleSystem.particlesRendering.primitives.screen
    );
  }
  removePrimitives() {
    [
      this.particleSystem.particlesComputing,
      this.particleSystem.particlesRendering.primitives
    ].forEach(primitives =>
      Object.values(primitives).forEach(primitive =>
        this.scene.primitives.remove(primitive)
      )
    );
  }

  updateViewerParameters() {
    var viewRectangle = this.camera.computeViewRectangle(
      this.scene.globe.ellipsoid
    );
    var lonLatRange = Util.viewRectangleToLonLatRange(viewRectangle);
    this.viewerParameters.lonRange.x = lonLatRange.lon.min;
    this.viewerParameters.lonRange.y = lonLatRange.lon.max;
    this.viewerParameters.latRange.x = lonLatRange.lat.min;
    this.viewerParameters.latRange.y = lonLatRange.lat.max;

    var pixelSize = this.camera.getPixelSize(
      this.globeBoundingSphere,
      this.scene.drawingBufferWidth,
      this.scene.drawingBufferHeight
    );

    if (pixelSize > 0) {
      this.viewerParameters.pixelSize = pixelSize;
    }
  }

  setupEventListeners() {
    const that = this;

    const rmCallbacks = [];

    rmCallbacks.push(
      this.camera.moveStart.addEventListener(function() {
        that.scene.primitives.show = false;
      })
    );

    rmCallbacks.push(
      this.camera.moveEnd.addEventListener(function() {
        that.updateViewerParameters();
        that.particleSystem.applyViewerParameters(that.viewerParameters);
        that.scene.primitives.show = true;
      })
    );

    var resized = false;
    function onResize() {
      resized = true;
      that.scene.primitives.show = false;
      that.removePrimitives();
    }
    window.addEventListener("resize", onResize);
    rmCallbacks.push(() => window.removeEventListener("resize", onResize));

    rmCallbacks.push(
      this.scene.preRender.addEventListener(function() {
        if (resized) {
          that.particleSystem.canvasResize(that.scene.context);
          resized = false;
          that.addPrimitives();
          that.scene.primitives.show = true;
        }
      })
    );

    function onParticleSystemOptionsChanged() {
      that.particleSystem.applyOptions(that.getParticlesOptions());
    }
    window.addEventListener(
      "particleSystemOptionsChanged",
      onParticleSystemOptionsChanged
    );
    rmCallbacks.push(() =>
      window.removeEventListener(
        "particleSystemOptionsChanged",
        onParticleSystemOptionsChanged
      )
    );

    this.destroyCallbacks.push(...rmCallbacks);
  }
  getParticlesOptions() {
    // make sure maxParticles is exactly the square of particlesTextureSize
    const particlesTextureSize = Math.ceil(
      Math.sqrt(this.options.particles.maxParticles)
    );
    this.options.particles.particlesTextureSize = particlesTextureSize;
    this.options.particles.maxParticles =
      particlesTextureSize * particlesTextureSize;
    return this.options.particles;
  }

  debug() {
    const that = this;

    var animate = function() {
      that.viewer.resize();
      that.viewer.render();
      requestAnimationFrame(animate);
    };
    const SPECTOR = require("spectorjs");
    var spector = new SPECTOR.Spector();
    spector.displayUI();
    spector.spyCanvases();

    animate();
  }
  destroy() {
    // FIXME: find a propper way to destroy wind system
    // FIXME: why ??
    this.removePrimitives();
    this.particleSystem.destroy();
    // deregister event listeners
    this.destroyCallbacks.forEach(cb => cb());
  }
}

export default Wind3D;
