OUTPUT = ${OUTPUT_DIR}calculator

SRC_DIR = src
BUILD_DIR = _build

modules = geo wind algorithm index
modules_cmx = $(foreach module,$(modules),$(BUILD_DIR)/$(module).cmx)
pkg = yojson grib

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
	echo S $(SRC_DIR) >> .merlin
	echo B $(BUILD_DIR) >> .merlin
	echo PKG $(pkg) >> .merlin

.PHONY: clean
clean:
	rm -rf $(BUILD_DIR)/**

all: executable
