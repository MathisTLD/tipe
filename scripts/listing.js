const path = require("path");
const fs = require("fs-extra");
const glob = require("glob");
const { mdToPdf } = require("md-to-pdf");
const { PDFDocument } = require("pdf-lib");

const ROOT_DIR = path.resolve(__dirname, "..");

function langFromExt(ext) {
  switch (ext) {
    case ".js":
      return "js";
    case ".vue":
      return "vue";
    case ".ml":
      return "ocaml";
    default:
      return "";
  }
}

class File {
  constructor(name, dir) {
    if (!dir) throw new TypeError("please provide a parent dir");
    this.parent = dir;
    this.path = path.resolve(this.parent.path, name);
  }
  async getMarkdown() {
    const content = await fs.readFile(this.path, "utf8");
    let md = `#### **\`${path.relative(ROOT_DIR, this.path)}\`**\n`;
    const lang = langFromExt(path.extname(this.path));
    md += "```" + lang + "\n";
    md += content.trim();
    md += "\n```\n";
    return md;
  }
}
class Directory {
  constructor(name, parent = null) {
    this.parent = parent;
    this.path = this.parent ? path.resolve(this.parent.path, name) : "./";
    this.files = {};
    this.subdirectories = {};
  }
  add(...srcs) {
    srcs.forEach((src) => {
      const rel = path.relative(this.path, src);
      const _rel = rel.split(path.sep);
      if (_rel.length === 1) {
        const name = path.basename(src);
        if (fs.lstatSync(path.resolve(this.path, name)).isDirectory()) {
          this.addDirectory(name);
        } else {
          this.addFile(name);
        }
      } else {
        const subdirName = _rel[0];
        if (!(subdirName in this.subdirectories)) {
          this.addDirectory(subdirName);
        }
        const subdir = this.subdirectories[subdirName];
        subdir.add(src);
      }
    });
  }
  addFile(name) {
    const file = new File(name, this);
    this.files[name] = file;
    return file;
  }
  addDirectory(name) {
    const dir = new Directory(name, this);
    this.subdirectories[name] = dir;
    return dir;
  }
  async buildPDF() {
    const childDocs = await Promise.all(
      Object.values(this.subdirectories).map((dir) => dir.buildPDF())
    );
    const md = await Promise.all(
      Object.values(this.files).map((file) => file.getMarkdown())
    ).then((mds) => mds.sort((a, b) => a.length - b.length).join("\n"));
    let doc = md
      ? await mdToPdf(
          {
            content:
              (this.parent
                ? `## **\`${path.relative(ROOT_DIR, this.path)}\`**\n`
                : "") + md,
          },
          {
            pdf_options: {
              margin: "5mm",
            },
          }
        ).then(async (pdf) => {
          const doc = await PDFDocument.load(pdf.content);
          if (doc.getPages().length % 2 !== 0) doc.addPage();
          return doc;
        })
      : await PDFDocument.create();
    for (let childDoc of childDocs) {
      const copiedPages = await doc.copyPages(
        childDoc,
        childDoc.getPageIndices()
      );
      copiedPages.forEach((page) => doc.addPage(page));
    }
    return doc;
  }
}

async function main() {
  const root = new Directory();
  root.path = ROOT_DIR;
  const files = [
    ["main.js"],
    ["campbell.config.js"],
    ["lib/**/*.js", { ignore: "lib/**/calculator/**" }],
    ["lib/**/calculator/src/*.ml"],
    ["public/**/*.js"],
    ["ui/**/*.vue", { ignore: "**/node_modules/**" }],
    ["ui/src/main.js"],
  ]
    .map((args) => glob.sync.apply(null, args))
    .flat()
    .map((src) => path.resolve(ROOT_DIR, src));
  root.add(...files);
  await root
    .buildPDF()
    .then(async (doc) =>
      fs.outputFile(path.resolve(ROOT_DIR, "source.pdf"), await doc.save())
    );
}

main();
