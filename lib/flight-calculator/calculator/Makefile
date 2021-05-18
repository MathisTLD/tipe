OUTPUT = ${OUTPUT_DIR}calculator

SRC_DIR = src
BUILD_DIR = _build

modules = utils geo wind aircraft algorithm index
modules_cmx = $(foreach module,$(modules),$(BUILD_DIR)/$(module).cmx)
pkg = core_kernel.pairing_heap str yojson ppx_yojson_conv grib

comma:= ,
empty:=
space:= $(empty) $(empty)
# ocamlfind ocamlopt -package yojson -c -I src/ src/geo.ml
ocamlopt=ocamlfind ocamlopt -package $(subst $(space),$(comma),$(pkg)) -I $(BUILD_DIR)

%.cmx:
	$(ocamlopt) -o $@ -c $(addprefix $(SRC_DIR)/, $(addsuffix .ml, $(basename $(notdir $@))))

executable: $(modules_cmx)
	$(ocamlopt) -linkpkg -o $(OUTPUT) $(modules_cmx)

.merlin:
	rm -f .merlin
	echo S $(SRC_DIR) >> .merlin
	echo B $(BUILD_DIR) >> .merlin
	echo PKG $(pkg) >> .merlin

.PHONY: clean .merlin
clean:
	rm -rf $(BUILD_DIR)/**

all: clean .merlin executable
