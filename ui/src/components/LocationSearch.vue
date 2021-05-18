<template>
  <v-autocomplete
    v-model="location"
    :items="candidates"
    :loading="loadingResults"
    :search-input.sync="search"
    hide-no-data
    hide-details
    item-text="description"
    prepend-icon="fa-map-marker-alt"
    placeholder="Start typing to Search"
    clearable
    return-object
    @change="select"
  />
</template>

<script>
import axios from "axios";
import debounce from "lodash/debounce";

export default {
  props: {
    value: {
      required: true,
      type: Object
    }
  },
  data() {
    return {
      location: null,
      locations: [],
      searchCandidates: [],
      search: "",
      loadingResults: false,
      cancelNextSearch: false,
      makeSearchDebounced: null
    };
  },
  computed: {
    candidates() {
      return this.locations
        .map(loc => ({ ...loc, place_id: loc.id }))
        .concat(this.searchCandidates);
    }
  },
  watch: {
    search(value) {
      if (!value) {
        return;
      }
      // Debounce the input and wait for a pause of at
      // least 500 milliseconds.
      if (!this.makeSearchDebounced)
        this.makeSearchDebounced = debounce(this.makeSearch.bind(this), 500);
      this.makeSearchDebounced(value);
    }
  },
  created() {
    this.cancelNextSearch = true;
    this.location = this.value;
    if (this.location) this.searchCandidates = [this.location];
    axios.get("/api/places/get-saved").then(({ data: locations }) => {
      this.locations.push(
        ...locations.map(({ id, description, location: { lat, lon } }) => ({
          id,
          description,
          lat,
          lon
        }))
      );
    });
  },
  methods: {
    select() {
      this.cancelNextSearch = true;

      let location = this.location;
      if (this.location) {
        let { place_id } = location;
        axios
          .get("/api/places/geocode", {
            params: {
              place_id
            }
          })
          .then(response => {
            Object.assign(this.location, response.data.location);
            this.$emit("input", this.location);
          })
          .catch(error => {
            console.error(error);
          });
      }
    },
    async makeSearch(input) {
      // Handle empty value
      if (!input) {
        this.searchCandidates = [];
      }
      // Items have already been requested
      if (this.loadingResults) {
        return;
      }
      if (this.cancelNextSearch) {
        this.cancelNextSearch = false;
        return;
      }

      this.loadingResults = true;
      await axios
        .get("/api/places/autocomplete", {
          params: {
            input
          }
        })
        .then(response => {
          this.searchCandidates = response.data;
        })
        .catch(error => {
          console.error(error);
          this.error = "Unknown Error. Please check details and try again.";
        })
        .finally(() => (this.loadingResults = false));
    }
  }
};
</script>
