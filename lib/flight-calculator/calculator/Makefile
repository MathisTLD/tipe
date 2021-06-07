OUTPUT = ${OUTPUT_DIR}calculator

SRC_DIR = src
BUILD_DIR = _build
DOC_DIR = docs

modules = utils geo wind aircraft algorithm index
modules_ml = $(foreach module,$(modules),$(SRC_DIR)/$(module).ml)
modules_cmx = $(foreach module,$(modules),$(BUILD_DIR)/$(module).cmx)
modules_odoc = $(foreach module,$(modules),$(BUILD_DIR)/$(module).odoc)
pkg = core_kernel core_kernel.pairing_heap str yojson ppx_yojson_conv grib

comma:= ,
empty:=
space:= $(empty) $(empty)

ocamlopt=ocamlfind ocamlopt -package $(subst $(space),$(comma),$(pkg)) -I $(BUILD_DIR)
ocamldoc=ocamlfind ocamldoc $(foreach p, $(pkg), -package $(p)) -I $(BUILD_DIR)

%.cmx %.cmt:
	$(ocamlopt) -o $@ -bin-annot -c $(addprefix $(SRC_DIR)/, $(addsuffix .ml, $(basename $(notdir $@))))

%.odoc: %.cmt
	odoc compile --pkg=calculator -r $(@:.odoc=.cmt)

docs: $(modules_odoc)
	mkdir -p $(DOC_DIR)/html
	rm -rf $(DOC_DIR)/html/**
	for f in $(modules_odoc); do \
		odoc html -I $(BUILD_DIR) -o $(DOC_DIR)/html $$f; \
	done
	odoc support-files -o $(DOC_DIR)/html
	mkdir -p $(DOC_DIR)/jpg
	rm -rf $(DOC_DIR)/jpg/**
	for f in $(shell find docs -name *.html); do \
		src=$$f; \
		dest=$${f//html/jpg}; \
		mkdir -p $$(dirname $$dest); \
		wkhtmltoimage -q --enable-local-file-access -f jpg --crop-w 720 --crop-y 80 file://$$PWD/$$f $$dest; \
	done
	# mkdir -p $(DOC_DIR)/pdf
	# rm -rf $(DOC_DIR)/pdf/**
	# for f in $(shell find docs -name *.html); do \
	# 	src=$$f; \
	# 	dest=$${f//html/pdf}; \
	# 	mkdir -p $$(dirname $$dest); \
	# 	wkhtmltopdf -q --enable-local-file-access file://$$PWD/$$f $$dest; \
	# done


executable: $(modules_cmx)
	$(ocamlopt) -linkpkg -o $(OUTPUT) $(modules_cmx)

.merlin:
	rm -f .merlin
	echo S $(SRC_DIR) >> .merlin
	echo B $(BUILD_DIR) >> .merlin
	echo PKG $(pkg) >> .merlin

.PHONY: .merlin docs_html docs_pdf docs
clean:
	rm -rf $(BUILD_DIR)/**

all: clean .merlin executable docs
