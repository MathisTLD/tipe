<template>
  <v-dialog v-model="dialog" persistent max-width="800px">
    <v-card>
      <v-card-title>
        <span class="headline">Wind Options</span>
      </v-card-title>
      <v-card-text>
        <v-list dense>
          <v-list-item v-for="(val, prop) in options.particles" :key="prop">
            <v-text-field
              :label="prop"
              v-model.number="options.particles[prop]"
              type="number"
              dense
            />
          </v-list-item>
          <v-list-item>
            <v-text-field
              readonly
              :value="dataDate"
              label="data"
              :clearable="!!options.data"
              @click:clear="loadData(null)"
            />
          </v-list-item>
          <v-list-item>
            <v-switch inset v-model="show" label="Show" />
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false" color="error">
          <v-icon>fa-times</v-icon>
        </v-btn>
        <v-btn @click="validateOptions()" color="success">
          <v-icon>fa-check</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import Vue from "vue";
import hotkeys from "hotkeys-js";
import Wind3D from "./Wind/Wind3D";

export default {
  data() {
    return {
      show: false,
      dialog: false,
      options: {
        data: null,
        particles: {
          maxParticles: 64 * 64,
          particleHeight: 100.0,
          fadeOpacity: 0.92,
          dropRate: 0.003,
          dropRateBump: 0.15,
          speedFactor: 0.2,
          lineWidth: 3
        }
      }
    };
  },
  watch: {
    show(val) {
      this.toggle(val);
    }
  },
  computed: {
    $app() {
      return this.$root.$children[0];
    },
    $map() {
      return this.$parent;
    },
    dataDate() {
      if (!this.options.data) return "live";
      else {
        const data = this.options.data;
        const str = data[0].dataDate.toString();
        const y = str.substr(0, 4),
          m = str.substr(4, 2) - 1,
          d = str.substr(6, 2);
        const date = new Date(y, m, d);
        date.setUTCHours(data[0].dataTime);
        return date.toString();
      }
    }
  },
  methods: {
    toggle(_show = null) {
      const show = _show === null ? !this.show : _show;
      if (show === !!this.wind3D) return;
      if (show) {
        if (this.$map.viewer.scene._mode !== 3)
          return alert("please switch to 3D view before showing wind");
        if (this.wind3D) {
          this.wind3D.destroy();
          delete this.wind3D;
        }
        this.wind3D = new Wind3D(this.$map.viewer, this.options, false); // snd arg represents debug mode
      } else {
        this.wind3D.destroy();
        delete this.wind3D;
      }
      this.show = show;
    },
    toggleConfigurator(_show = null) {
      const show = _show === null ? !this.dialog : _show;
      this.dialog = show;
    },
    validateOptions() {
      if (this.wind3D) {
        this.wind3D.onParticleSystemOptionsChanged();
      }
      this.dialog = false;
    },
    init() {
      // hide wind when not in 3D
      this.$map.viewer.scene.morphStart.addEventListener((_, prevMode) => {
        if (prevMode === 3) this.toggle(false);
      });
      this.$map.viewer.scene.morphComplete.addEventListener(
        (_, prevMode, nextMode) => {
          if (nextMode === 3) this.toggle(true);
        }
      );
    },
    reload() {
      if (this.show) {
        this.toggle(false);
        this.toggle(true);
      }
    },
    loadData(data) {
      Vue.set(this.options, "data", data || null);
      this.reload();
    }
  },
  created() {
    hotkeys("alt+w", () => {
      this.toggle();
    });
  },
  beforeDestroy() {
    this.toggle(false); // prevents errors on hot relaod
  }
};
</script>
