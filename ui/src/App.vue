<template>
  <v-app>
    <!-- <v-app-bar app dense>
      <v-toolbar-title>FIND_A_NAME</v-toolbar-title>
      <v-spacer />
      {{ version }}
    </v-app-bar> -->

    <v-main>
      <v-container fluid class="fill-height ma-0 pa-0">
        <Map ref="map" />
        <Configurator ref="configurator" />
        <Progress ref="progress" />
        <Actions />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import Map from "./components/Map";
import Actions from "./components/Actions";
import Configurator from "./components/Configurator";
import Progress from "./components/Progress";

export default {
  components: {
    Map,
    Actions,
    Configurator,
    Progress
  },
  data() {
    return {
      version: require("../../package.json").version
    };
  }
};
</script>

<style>
html {
  overflow: hidden !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
