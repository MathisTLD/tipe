import * as Cesium from "cesium/Cesium";

import Util from "./Util";
import DataProcess from "./DataProcess";
import CustomPrimitive from "./CustomPrimitive";

class ParticlesComputing {
  constructor(context, data, options, viewerParameters) {
    this.createWindTextures(context, data);
    this.createParticlesTextures(context, options, viewerParameters);
    this.createComputingPrimitives(data, options, viewerParameters);
  }

  createWindTextures(context, data) {
    var windTextureOptions = {
      context: context,
      width: data.dimensions.lon,
      height: data.dimensions.lat * data.dimensions.lev,
      pixelFormat: Cesium.PixelFormat.LUMINANCE,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      flipY: false,
      sampler: new Cesium.Sampler({
        // the values of texture will not be interpolated
        minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
        magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST
      })
    };

    this.windTextures = {
      U: Util.createTexture(windTextureOptions, data.U.array),
      V: Util.createTexture(windTextureOptions, data.V.array)
    };
  }

  createParticlesTextures(context, options, viewerParameters) {
    var particlesTextureOptions = {
      context: context,
      width: options.particlesTextureSize,
      height: options.particlesTextureSize,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      flipY: false,
      sampler: new Cesium.Sampler({
        // the values of texture will not be interpolated
        minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
        magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST
      })
    };

    var particlesArray = DataProcess.randomizeParticles(
      options.maxParticles,
      viewerParameters
    );
    var zeroArray = new Float32Array(4 * options.maxParticles).fill(0);

    this.particlesTextures = {
      previousParticlesPosition: Util.createTexture(
        particlesTextureOptions,
        particlesArray
      ),
      currentParticlesPosition: Util.createTexture(
        particlesTextureOptions,
        particlesArray
      ),
      nextParticlesPosition: Util.createTexture(
        particlesTextureOptions,
        particlesArray
      ),

      postProcessingPosition: Util.createTexture(
        particlesTextureOptions,
        particlesArray
      ),
      postProcessingSpeed: Util.createTexture(
        particlesTextureOptions,
        zeroArray
      ),

      particlesSpeed: Util.createTexture(particlesTextureOptions, zeroArray)
    };
  }

  destroyParticlesTextures() {
    Object.keys(this.particlesTextures).forEach(key => {
      this.particlesTextures[key].destroy();
    });
  }

  createComputingPrimitives(data, options, viewerParameters) {
    const dimension = new Cesium.Cartesian3(
      data.dimensions.lon,
      data.dimensions.lat,
      data.dimensions.lev
    );
    const minimum = new Cesium.Cartesian3(
      data.lon.min,
      data.lat.min,
      data.lev.min
    );
    const maximum = new Cesium.Cartesian3(
      data.lon.max,
      data.lat.max,
      data.lev.max
    );
    const interval = new Cesium.Cartesian3(
      (maximum.x - minimum.x) / (dimension.x - 1),
      (maximum.y - minimum.y) / (dimension.y - 1),
      dimension.z > 1 ? (maximum.z - minimum.z) / (dimension.z - 1) : 1.0
    );
    const uSpeedRange = new Cesium.Cartesian2(data.U.min, data.U.max);
    const vSpeedRange = new Cesium.Cartesian2(data.V.min, data.V.max);

    const that = this;

    this.primitives = {
      calculateSpeed: new CustomPrimitive({
        commandType: "Compute",
        uniformMap: {
          U: function() {
            return that.windTextures.U;
          },
          V: function() {
            return that.windTextures.V;
          },
          currentParticlesPosition: function() {
            return that.particlesTextures.currentParticlesPosition;
          },
          dimension: function() {
            return dimension;
          },
          minimum: function() {
            return minimum;
          },
          maximum: function() {
            return maximum;
          },
          interval: function() {
            return interval;
          },
          uSpeedRange: function() {
            return uSpeedRange;
          },
          vSpeedRange: function() {
            return vSpeedRange;
          },
          pixelSize: function() {
            return viewerParameters.pixelSize;
          },
          speedFactor: function() {
            return options.speedFactor;
          }
        },
        fragmentShaderSource: new Cesium.ShaderSource({
          sources: [require("raw-loader!./glsl/calculateSpeed.frag").default]
        }),
        outputTexture: this.particlesTextures.particlesSpeed,
        preExecute: function() {
          // swap textures before binding
          var temp;
          temp = that.particlesTextures.previousParticlesPosition;
          that.particlesTextures.previousParticlesPosition =
            that.particlesTextures.currentParticlesPosition;
          that.particlesTextures.currentParticlesPosition =
            that.particlesTextures.postProcessingPosition;
          that.particlesTextures.postProcessingPosition = temp;

          // swap speed
          temp = that.particlesTextures.particlesSpeed;
          that.particlesTextures.particlesSpeed =
            that.particlesTextures.postProcessingSpeed;
          that.particlesTextures.postProcessingSpeed = temp;

          // keep the outputTexture up to date
          that.primitives.calculateSpeed.commandToExecute.outputTexture =
            that.particlesTextures.particlesSpeed;
        }
      }),

      updatePosition: new CustomPrimitive({
        commandType: "Compute",
        uniformMap: {
          currentParticlesPosition: function() {
            return that.particlesTextures.currentParticlesPosition;
          },
          particlesSpeed: function() {
            return that.particlesTextures.particlesSpeed;
          }
        },
        fragmentShaderSource: new Cesium.ShaderSource({
          sources: [require("raw-loader!./glsl/updatePosition.frag").default]
        }),
        outputTexture: this.particlesTextures.nextParticlesPosition,
        preExecute: function() {
          // keep the outputTexture up to date
          that.primitives.updatePosition.commandToExecute.outputTexture =
            that.particlesTextures.nextParticlesPosition;
        }
      }),

      postProcessingPosition: new CustomPrimitive({
        commandType: "Compute",
        uniformMap: {
          nextParticlesPosition: function() {
            return that.particlesTextures.nextParticlesPosition;
          },
          particlesSpeed: function() {
            return that.particlesTextures.particlesSpeed;
          },
          lonRange: function() {
            return viewerParameters.lonRange;
          },
          latRange: function() {
            return viewerParameters.latRange;
          },
          randomCoefficient: function() {
            var randomCoefficient = Math.random();
            return randomCoefficient;
          },
          dropRate: function() {
            return options.dropRate;
          },
          dropRateBump: function() {
            return options.dropRateBump;
          }
        },
        fragmentShaderSource: new Cesium.ShaderSource({
          sources: [
            require("raw-loader!./glsl/postProcessingPosition.frag").default
          ]
        }),
        outputTexture: this.particlesTextures.postProcessingPosition,
        preExecute: function() {
          // keep the outputTexture up to date
          that.primitives.postProcessingPosition.commandToExecute.outputTexture =
            that.particlesTextures.postProcessingPosition;
        }
      }),
      postProcessingSpeed: new CustomPrimitive({
        commandType: "Compute",
        uniformMap: {
          postProcessingPosition: function() {
            return that.particlesTextures.postProcessingPosition;
          },
          nextParticlesSpeed: function() {
            return that.particlesTextures.nextParticlesSpeed;
          }
        },
        fragmentShaderSource: new Cesium.ShaderSource({
          sources: [
            require("raw-loader!./glsl/postProcessingSpeed.frag").default
          ]
        }),
        outputTexture: this.particlesTextures.postProcessingSpeed,
        preExecute: function() {
          // keep the outputTexture up to date
          that.primitives.postProcessingSpeed.commandToExecute.outputTexture =
            that.particlesTextures.postProcessingSpeed;
        }
      })
    };
  }
}

export default ParticlesComputing;
