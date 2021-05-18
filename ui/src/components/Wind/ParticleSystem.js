import * as Cesium from "cesium/Cesium";

import ParticlesRendering from "./ParticlesRendering";
import ParticlesComputing from "./ParticlesComputing";

class ParticleSystem {
  constructor(context, data, userInput, viewerParameters) {
    this.context = context;
    this.data = data;
    this.userInput = userInput;
    this.viewerParameters = viewerParameters;

    this.particlesComputing = new ParticlesComputing(
      this.context,
      this.data,
      this.userInput,
      this.viewerParameters
    );
    this.particlesRendering = new ParticlesRendering(
      this.context,
      this.data,
      this.userInput,
      this.viewerParameters,
      this.particlesComputing
    );
  }

  canvasResize(context) {
    this.particlesComputing.destroyParticlesTextures();
    this.particlesRendering.textures.colorTable.destroy();
    Object.keys(this.particlesComputing.windTextures).forEach(key => {
      this.particlesComputing.windTextures[key].destroy();
    });

    Object.keys(this.particlesRendering.framebuffers).forEach(key => {
      this.particlesRendering.framebuffers[key].destroy();
    });

    this.context = context;
    this.particlesComputing = new ParticlesComputing(
      this.context,
      this.data,
      this.userInput,
      this.viewerParameters
    );
    this.particlesRendering = new ParticlesRendering(
      this.context,
      this.data,
      this.userInput,
      this.viewerParameters,
      this.particlesComputing
    );
  }

  clearFramebuffers() {
    var clearCommand = new Cesium.ClearCommand({
      color: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
      depth: 1.0,
      framebuffer: undefined,
      pass: Cesium.Pass.OPAQUE
    });

    Object.keys(this.particlesRendering.framebuffers).forEach(key => {
      clearCommand.framebuffer = this.particlesRendering.framebuffers[key];
      clearCommand.execute(this.context);
    });
  }

  refreshParticles(maxParticlesChanged) {
    this.clearFramebuffers();

    this.particlesComputing.destroyParticlesTextures();
    this.particlesComputing.createParticlesTextures(
      this.context,
      this.userInput,
      this.viewerParameters
    );

    if (maxParticlesChanged) {
      var geometry = this.particlesRendering.createSegmentsGeometry(
        this.userInput
      );
      this.particlesRendering.primitives.segments.geometry = geometry;
      var vertexArray = Cesium.VertexArray.fromGeometry({
        context: this.context,
        geometry: geometry,
        attributeLocations: this.particlesRendering.primitives.segments
          .attributeLocations,
        bufferUsage: Cesium.BufferUsage.STATIC_DRAW
      });
      this.particlesRendering.primitives.segments.commandToExecute.vertexArray = vertexArray;
    }
  }

  applyOptions(options) {
    var maxParticlesChanged = false;
    if (this.userInput.maxParticles != options.maxParticles) {
      maxParticlesChanged = true;
    }

    Object.keys(options).forEach(key => {
      this.userInput[key] = options[key];
    });
    this.refreshParticles(maxParticlesChanged);
  }

  applyViewerParameters(viewerParameters) {
    Object.keys(viewerParameters).forEach(key => {
      this.viewerParameters[key] = viewerParameters[key];
    });
    this.refreshParticles(false);
  }

  destroy() {
    this.clearFramebuffers();
    this.particlesComputing.destroyParticlesTextures();
  }
}

export default ParticleSystem;
