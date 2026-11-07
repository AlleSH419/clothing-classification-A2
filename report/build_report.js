const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, ImageRun, ExternalHyperlink, LevelFormat, BorderStyle, Footer, PageNumber,
} = require("docx");

const IMG = path.join(__dirname, "img");
const OUT = process.argv[2];
const FONT = "Arial";
const W = 9026; // A4 content width in DXA with 1" margins

const V3 = {
  test_acc: "0.987", test_f1: "0.987", rw_acc: "0.75", rw_f1: "**0.75**",
  fig: "realworld_comparison",
  figCaption: "Figure 9. Confusion matrices on the 20 real-world phone photos for the four ConvNeXt versions.",
  discussion: "**Result.** Catalog accuracy stays at 98–99 % for every version, while real-world accuracy stays at about 0.75. The errors move between classes instead of disappearing. v2 fixes the T-shirt (topwear 4/4) but breaks the track pants (bottomwear 1/4 → underwear). v3 fixes the pants (4/4) but now sends the T-shirt and boxer briefs to bottomwear. v3 is the most balanced model (highest macro-F1 0.75, no class below 2/4), so it is the final model. The real lesson is the gap of about 24 pp between in-distribution and real-world accuracy. Catalog photos plus synthetic images cannot fully replace real flat-lay photos, and each of our test classes holds a single object, so one hard object decides the whole class. The most effective next step is to collect a few hundred real phone photos of varied garments, not to generate more synthetic data.",
};
const STUDENT = "Kurmantayev Ali, group SE-2431";
const VIDEO = "https://drive.google.com/drive/folders/1bbq25MwW8DvBIzF6LCfoBJexVg46V8Jh?usp=sharing"; // Drive folder link

const LINKS = {
  github: "https://github.com/AlleSH419/clothing-classification-A2",
  colab: "https://colab.research.google.com/drive/1AKU5sftyO1XpXhpPCqnWl0lzfOAZEaMc?usp=sharing",
};

// ---------- helpers ----------
function runs(text, base = {}) {
  // **bold** support
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) => p.startsWith("**")
    ? new TextRun({ text: p.slice(2, -2), bold: true, ...base })
    : new TextRun({ text: p, ...base }));
}
const P = (text, opts = {}) => new Paragraph({ children: runs(text), spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED, ...opts });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const B = (text) => new Paragraph({ numbering: { reference: "bul", level: 0 }, children: runs(text), spacing: { after: 60 } });
const N = (text) => new Paragraph({ numbering: { reference: "num", level: 0 }, children: runs(text), spacing: { after: 60 } });
const CODE = (t) => new Paragraph({ children: [new TextRun({ text: t, font: "Consolas", size: 19 })], spacing: { after: 40 }, indent: { left: 360 } });
const Caption = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: t, italics: true, size: 19, color: "444444" })] });

function img(name, widthPx) {
  const file = path.join(IMG, name + ".png");
  const buf = fs.readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: widthPx, height: Math.round(widthPx * h / w) } })],
  });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(rows, widths, { boldRows = [] } = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((c, j) => new TableCell({
        width: { size: widths[j], type: WidthType.DXA }, borders,
        shading: i === 0 ? { type: ShadingType.CLEAR, fill: "DCE6F1", color: "auto" } : undefined,
        margins: { top: 50, bottom: 50, left: 90, right: 90 },
        children: [new Paragraph({
          alignment: j === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
          children: runs(String(c), { size: 19, bold: i === 0 || boldRows.includes(i) }),
        })],
      })),
    })),
  });
}
const gap = () => new Paragraph({ spacing: { after: 80 }, children: [] });
const link = (label, url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text: label, style: "Hyperlink" })] });

// ---------- content ----------
const c = [];

c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Astana IT University · Computer Vision · Assignment 2", size: 20, color: "555555" })] }));
c.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun("Level-Up Clothing Classification: ConvNeXt, SD-Turbo Synthetic Data and a Grad-CAM Demo")] }));
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Student: " + STUDENT + "   ·   Instructor: Nurym Kaiyrkhan", size: 21 })] }));
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "GitHub: ", bold: true, size: 20 }), link(LINKS.github, LINKS.github)] }));
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Colab notebook + app: ", bold: true, size: 20 }), link("Open in Google Colab", LINKS.colab)] }));
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79", space: 6 } }, children: [new TextRun({ text: "Demo video: ", bold: true, size: 20 }), VIDEO ? link("Google Drive folder", VIDEO) : new TextRun({ text: "[insert video link]", size: 20, color: "C00000" })] }));

c.push(H2("Abstract"));
c.push(P("We upgrade an Assignment 1-style clothing classifier (5 classes: bottomwear, footwear, headwear, topwear, underwear) with two state-of-the-art components: an ImageNet-pretrained **ConvNeXt-Tiny** backbone and **SD-Turbo** text-to-image synthetic data for the weakest classes. On a held-out test set of 225 real images, ConvNeXt raises accuracy from **80.9 % to 98.2 %** (macro-F1 0.802 → 0.982). Adding 200 synthetic images raises catalog accuracy further to **98.7 %** (macro-F1 0.987), but slightly hurts the from-scratch CNN and, as shown later, **lowers** accuracy on real phone photos (0.60 vs 0.75). We ship an interactive Gradio app (upload or camera → prediction → Grad-CAM → latency, 10–16 ms on a T4). Grad-CAM and a real-world phone test reveal a dataset shortcut that the test metric hides. Two further iterations with flat-lay synthetic data (v2, v3) keep catalog accuracy at 98.7–99.1 % and balance the real-world errors (macro-F1 0.72 → 0.75), but real-world accuracy stays at 75 %. The domain gap remains the main open problem."));

// 1
c.push(H1("1. Introduction"));
c.push(P("Automatic garment categorization underpins e-commerce search, catalog tagging and recommendation. Assignment 1 required a baseline model (logistic regression, SVM or a simple CNN); here we re-implement a simple-CNN baseline of that type as the reference point. We keep the same topic and ask three questions. (1) How much does a modern pretrained backbone help over a CNN trained from scratch? (2) Can a one-step diffusion generator fill weak classes with useful synthetic data? (3) What does the model actually look at, and does its accuracy transfer to photos taken outside the catalog?"));

// 2
c.push(H1("2. Dataset Update"));
c.push(P("**Source.** Fashion Product Images (Small), a public e-commerce catalog of 44,072 product photos (Hugging Face mirror ashraq/fashion-product-images-small). The dataset field subCategory is mapped to our classes: Shoes → footwear, Innerwear → underwear, Topwear → topwear, Headwear → headwear, Bottomwear → bottomwear."));
c.push(P("**Size, balance and split.** 300 random images per class (headwear has only 293), 1,493 real images in total, split 70 / 15 / 15 per class with a fixed seed."));
c.push(P("**Augmentation (train only).** Resize to 224×224, random horizontal flip, random rotation ±15°, color jitter (brightness, contrast and saturation 0.3), ImageNet normalization. Validation and test images are only resized and normalized."));
c.push(P("**Synthetic share.** +100 headwear and +100 underwear images generated with SD-Turbo (Section 3.2). In the first ablation they make up 200 / 1,245 = **16.1 %** of the training set (the final v3 model uses 36.5 %, see Section 6.1) and **0 %** of validation and test, so every reported metric is computed on real images only."));
c.push(table([
  ["Class", "Train (real)", "Val", "Test", "Synthetic (train)"],
  ["bottomwear", 210, 45, 45, 0], ["footwear", 210, 45, 45, 0], ["headwear", 205, 43, 45, 100],
  ["topwear", 210, 45, 45, 0], ["underwear", 210, 45, 45, 100], ["Total", 1045, 223, 225, 200],
], [2626, 1600, 1400, 1400, 2000], { boldRows: [6] }));
c.push(Caption("Table 1. Dataset composition after the update."));
c.push(img("synthetic_samples", 600));
c.push(Caption("Figure 1. Samples of the SYNTHETIC images (SD-Turbo). They are labeled in file names (synthetic_*.jpg) and figure titles."));

// 3
c.push(H1("3. SOTA Methods"));
c.push(img("pipeline", 600));
c.push(Caption("Figure 2. Overall pipeline: real and synthetic data → two classifiers → ablation → interactive app."));
c.push(H2("3.1 ConvNeXt-Tiny (transfer learning)"));
c.push(P("ConvNeXt [1] is a pure convolutional network that is \"modernized\" step by step toward the design of Vision Transformers. As the Neurohive CNN guide [5] summarizes, it borrows Transformer design choices and stays competitive with Transformers of the same size. The key changes over ResNet-50 are:"));
c.push(B("**Patchify stem:** a 4×4 convolution with stride 4 instead of a 7×7 convolution plus max-pooling."));
c.push(B("**Stage ratio 3:3:9:3**, similar to Swin-T, with an inverted-bottleneck block: 7×7 depthwise conv → LayerNorm → 1×1 conv (4× expand) → GELU → 1×1 conv."));
c.push(B("**Large 7×7 depthwise kernels**, which mimic the large receptive field of self-attention windows."));
c.push(B("**LayerNorm instead of BatchNorm, GELU instead of ReLU**, fewer activations and normalizations, and separate downsampling layers."));
c.push(P("We use the Tiny variant (27.8 M parameters, ImageNet-1k weights from timm), replace the head with a 5-way linear layer, and fine-tune all layers with AdamW (lr 1e-4, weight decay 1e-4, cosine schedule, 6 epochs, batch size 32). **Why it helps our topic:** the baseline confuses small, low-texture garments (underwear vs headwear and topwear). Pretrained features already encode fabric texture, garment shape and part layout, which about 1k training images cannot teach from scratch."));
c.push(H2("3.2 SD-Turbo synthetic data (Adversarial Diffusion Distillation)"));
c.push(P("SD-Turbo is Stable Diffusion 2.1 distilled with **Adversarial Diffusion Distillation (ADD)** [2]. A student network learns to produce an image in one denoising step. It is trained with (a) a score-distillation loss toward a frozen multi-step teacher and (b) an adversarial loss from a discriminator built on frozen ViT features. The result is a 512×512 image from a single forward pass, about 0.1 s on a T4."));
c.push(P("We generate 100 images for each of the two weakest baseline classes from the template: "));
c.push(CODE("\"e-commerce product photo of a {color} {item}, isolated on plain white"));
c.push(CODE(" background, centered, studio lighting, no person\""));
c.push(P("This uses 10 colors × 8 item types per class (e.g. baseball cap, beanie, fedora; boxer briefs, sports bra, thermal vest). Settings: 1 step, guidance 0, fixed seeds, resized to 256×256. **Why it helps:** it adds intra-class diversity (colors and sub-types) where the baseline recall is lowest, at almost zero cost and with no need to photograph or scrape new data."));

// 4
c.push(H1("4. Experiments"));
c.push(P("**Setup.** Google Colab, NVIDIA Tesla T4, PyTorch + timm. Loss: cross-entropy. The checkpoint with the best validation accuracy is evaluated on the test set. Latency is the pure forward pass at batch size 1 on the GPU, averaged over 50 runs after warm-up. The baseline CNN (A1-style) has 4 blocks of Conv3×3-BN-ReLU-MaxPool (32→256 channels), global average pooling, dropout 0.3 and an FC layer. It is trained for 15 epochs with AdamW at lr 1e-3."));
c.push(H2("4.1 Main results: baseline vs SOTA"));
c.push(table([
  ["Model", "Train data", "Accuracy", "Macro-F1", "Params", "Latency", "Train time"],
  ["Baseline CNN", "real", "0.809", "0.802", "0.39 M", "0.8 ms", "89 s"],
  ["ConvNeXt-Tiny", "real", "0.982", "0.982", "27.8 M", "5.9 ms", "161 s"],
  ["Baseline CNN", "real + syn", "0.800", "0.791", "0.39 M", "0.8 ms", "115 s"],
  ["ConvNeXt-Tiny", "real + syn", "**0.987**", "**0.987**", "27.8 M", "6.8 ms", "189 s"],
], [1826, 1300, 1100, 1100, 1100, 1200, 1400]));
c.push(Caption("Table 2. Test-set results (225 real images)."));
c.push(table([
  ["Class", "CNN", "CNN + syn", "ConvNeXt", "ConvNeXt + syn"],
  ["bottomwear", "0.921", "0.943", "1.000", "0.989"],
  ["footwear", "0.889", "0.854", "1.000", "1.000"],
  ["headwear", "0.688", "0.681", "0.977", "**1.000**"],
  ["topwear", "0.854", "0.840", "0.978", "0.978"],
  ["underwear", "0.657", "0.638", "0.956", "**0.967**"],
], [2626, 1600, 1600, 1600, 1600]));
c.push(Caption("Table 3. Per-class F1 on the test set."));
c.push(P("ConvNeXt removes almost all baseline errors: +17.3 pp accuracy and +0.18 macro-F1. The biggest gains are on the two hard classes, headwear (+0.29 F1) and underwear (+0.30 F1). The cost is 70× more parameters and about 7× higher latency, which is still far below real-time limits."));
c.push(H2("4.2 Training curves and confusion matrices"));
c.push(img("baseline_cnn", 600));
c.push(Caption("Figure 3. Baseline CNN: loss, accuracy, confusion matrix (test)."));
c.push(img("convnext_tiny", 600));
c.push(Caption("Figure 4. ConvNeXt-Tiny: loss, accuracy, confusion matrix (test)."));
c.push(P("The baseline converges slowly, and its validation accuracy oscillates between 0.63 and 0.86. Its dominant error is underwear predicted as headwear or topwear (only 23 / 45 correct), plus headwear predicted as footwear (9). ConvNeXt reaches 96 % validation accuracy after the first epoch. Its only test errors are 2 headwear → underwear and 2 underwear → topwear. A train/val gap appears after epoch 4, so more epochs would only overfit."));
c.push(H2("4.3 Ablation: with vs without synthetic data"));
c.push(table([
  ["Model", "Real only (F1)", "Real + synthetic (F1)", "Δ Macro-F1", "Δ Accuracy"],
  ["Baseline CNN", "0.802", "0.791", "−0.011", "−0.9 pp"],
  ["ConvNeXt-Tiny", "0.982", "0.987", "**+0.005**", "**+0.45 pp**"],
], [2226, 1700, 2000, 1500, 1600]));
c.push(Caption("Table 4. Ablation of the SD-Turbo synthetic images."));
c.push(img("convnext_tiny_syn", 600));
c.push(Caption("Figure 5. ConvNeXt-Tiny trained with synthetic data: headwear errors drop to 0."));
c.push(P("**Discussion.** Synthetic data helps the pretrained ConvNeXt: headwear recall goes from 0.956 to 1.000, underwear F1 from 0.956 to 0.967, and the remaining errors are single images. It does not help the CNN trained from scratch. SD-Turbo images are high-resolution, smoothly shaded renders, while real catalog photos are small (60×80 px) and often show a person wearing the item. A network without a pretrained prior picks up generator-specific cues instead of garment shape, so the domain gap outweighs the added diversity. Also, several \"underwear\" generations look like athletic shorts, which overlap with bottomwear. With a single seed and 225 test images, the ConvNeXt gain equals **one** test image. The honest conclusion is \"no harm, small gain on the targeted classes\", not a significant improvement. Training time grows by about 18 %, and inference cost is unchanged (the 5.9 vs 6.8 ms difference is measurement noise)."));

// 5
c.push(H1("5. Explainability (Grad-CAM)"));
c.push(img("gradcam_examples", 600));
c.push(Caption("Figure 6. Grad-CAM on the last ConvNeXt stage, 2 test images per class (all correct, confidence 0.99–1.00)."));
c.push(P("Grad-CAM [3] weights the last-stage feature maps by the gradient of the predicted class score. The heatmaps show that the model attends to the garment rather than the white background: the leg split and trousers for bottomwear, the toe of the shoe for footwear, the whole cap for headwear, and the briefs and waistband for underwear. For **topwear**, however, the heat spreads to the model's **face and neck**. The classifier partly uses \"a person's upper body is visible\" as a cue for topwear, which is a shortcut learned from the catalog. Section 6 shows that this shortcut causes real errors."));

// 6
c.push(H1("6. Demo Application"));
c.push(P("The app is built with Gradio and runs in the Colab notebook (public share link). Flow: **upload or webcam → top-5 class probabilities → Grad-CAM overlay → latency (per request and running average) and environment** (GPU, torch and Python versions, model name). The interface states that part of the training data is synthetic and that uploads are not stored. End-to-end latency is **10–16 ms** per image on a Tesla T4 (torch 2.14, Python 3.13), including preprocessing and host-device transfer. A local version (app/app.py) runs on CPU or GPU. The **final deployed model is ConvNeXt v3** (Section 6.1); the screenshots below were taken earlier with convnext_tiny_syn and motivated the v2/v3 iterations."));
c.push(img("app_beanie", 560));
c.push(Caption("Figure 7. App on a real phone photo: knit beanie → headwear 100 % (screenshots in this section use convnext_tiny_syn, before the v2/v3 iterations of Section 6.1)."));
c.push(P("**Real-world test** with our own phone photos (garments lying flat on a carpet, no person):"));
c.push(table([
  ["Photo", "Prediction", "Correct?", "Grad-CAM focus"],
  ["Track pants", "bottomwear 94 %", "yes", "crotch / leg split"],
  ["Knit beanie", "headwear 100 %", "yes", "rounded side contour"],
  ["T-shirt (flat)", "underwear 98 %", "**no** (topwear)", "small patch on the chest"],
], [2226, 2300, 1900, 2600]));
c.push(Caption("Table 5. Out-of-distribution check in the app (model convnext_tiny_syn)."));
c.push(img("app_tshirt_fail", 520));
c.push(Caption("Figure 8. Failure case: a flat-lying T-shirt is classified as underwear."));
c.push(P("The T-shirt failure confirms the shortcut seen in Section 5. In the catalog, almost every topwear image shows the garment **worn by a model**, while flat-lying cotton items without a person are mostly undershirts and vests from Innerwear. The model learned \"flat cotton garment with no person → underwear\" instead of the T-shirt's shape. The 98.7 % test accuracy therefore measures in-distribution performance only. Possible fixes: add flat-lay topwear photos, segment the garment (SAM-style mask) and remove the person and background before classification, and use stronger crop and background-replacement augmentation."));

// 6.1 iteration
c.push(H2("6.1 Fixing the shortcut: flat-lay synthetic data (v2, v3)"));
c.push(P("To act on this finding we built a small **real-world test set**: 20 phone photos (4 per class) of garments lying flat on carpets, floors and bedding, used **only for evaluation**. Caveat: apart from footwear, each class is one physical item photographed 4 times on different backgrounds, so the set holds about 8 distinct objects. Every error repeats across correlated photos, so these numbers are indicative, not statistically strong."));
c.push(B("**v2:** +80 SD-Turbo **flat-lay** images for **every** class (8 item types × 10 colors × 8 indoor backgrounds; generating them for topwear only would create a new \"carpet → topwear\" shortcut) plus stronger augmentation (RandomResizedCrop 0.6–1.0, rotation ±20°, grayscale 10 %)."));
c.push(B("**v3:** error analysis of v2 showed that ambiguous prompts (\"white undershirt\", \"boxer shorts\" in underwear; \"shorts\", \"leggings\" in bottomwear) overlap visually across classes. We regenerated those two classes with unambiguous items and softened the crop (scale 0.75–1.0). **Final v3 training set:** 1,045 real + 200 product-style synthetic + 400 flat-lay synthetic (80 per class) = 1,645 images, of which **600 (36.5 %) are synthetic**. Validation and test remain 100 % real."));
c.push(table([
  ["Model", "Catalog test acc", "Catalog macro-F1", "Real-world acc (n=20)", "Real-world macro-F1"],
  ["ConvNeXt", "0.982", "0.982", "0.75", "0.72"],
  ["ConvNeXt + syn", "0.987", "0.987", "0.60", "0.56"],
  ["ConvNeXt v2 (flat-lay)", "0.991", "0.991", "0.75", "0.73"],
  ["ConvNeXt v3 (clean prompts)", V3.test_acc, V3.test_f1, V3.rw_acc, V3.rw_f1],
], [2626, 1550, 1550, 1700, 1600]));
c.push(Caption("Table 6. In-distribution (catalog) vs real-world (own phone photos) performance."));
c.push(img(V3.fig, 600));
c.push(Caption(V3.figCaption));
c.push(P(V3.discussion));
c.push(P("**Methodological note.** v3 was designed after looking at v2's errors on the same 20 photos, so its real-world score is optimistically biased. A fresh, larger photo set would be needed for an unbiased estimate."));

// 7
c.push(H1("7. Ethics and Limitations"));
c.push(B("**Data and consent.** The dataset is a public e-commerce catalog. Many images show professional models wearing the garments, including underwear, with visible faces. These are published retail photos used for non-commercial coursework, not images of private individuals. We do not redistribute the raw images (the notebook downloads them from the original source), and the app does not store uploads."));
c.push(B("**Synthetic media disclosure.** All generated images are labeled SYNTHETIC (file names, figure titles, app description) and excluded from validation and test to avoid inflated metrics."));
c.push(B("**Generated content risk.** Although prompts say \"no person\", SD-Turbo sometimes rendered partial bodies (legs or torso, never faces) for underwear prompts. The diffusers safety checker is disabled by default for this model. Samples were reviewed visually, and the generations are used only for training and are not exposed in the app."));
c.push(B("**Bias.** One retailer, mostly white studio backgrounds and a specific regional fashion distribution. Accuracy on street photos, worn clothing or other cultures' garments will be lower (see Table 5)."));
c.push(B("**Limitations.** Small test set (225 images) and a single seed, so differences under about 1 pp are not significant. \"Topwear\" mixes shirts and jackets. Latency is measured on a cloud T4 only."));

// 8
c.push(H1("8. Reproducibility"));
c.push(N("Open the Colab notebook (link above) → Runtime → Change runtime type → **T4 GPU**."));
c.push(N("Runtime → **Run all**. Cells: data download and split → baseline → ConvNeXt → SD-Turbo generation → ablation → Grad-CAM gallery and Gradio app → flat-lay generation (v2) → v3 regeneration and training → real-world evaluation. Total time is about 35 minutes."));
c.push(N("Weights are saved to /content/{baseline_cnn, convnext_tiny, *_syn, convnext_tiny_v2, convnext_tiny_v3}.pt, and metrics and plots to /content/results. The last cell prints a public gradio.live link."));
c.push(N("Local run: pip install -r requirements.txt; python app/app.py --weights convnext_tiny_v3.pt (final model)."));
c.push(P("Environment: Python 3.13, torch 2.14 (CUDA 13), timm, diffusers, grad-cam, gradio. Seeds: data split 42, generation seeds 0–99 and 1000–1099. Code, notebook, figures and metrics (results/summary.csv) are in the GitHub repository."));

// 9
c.push(H1("9. Conclusion"));
c.push(P("Replacing the A1-style CNN with a pretrained ConvNeXt-Tiny is by far the most effective upgrade (+17 pp accuracy). One-step SD-Turbo synthetic data is cheap and gives a small gain for the pretrained model on the catalog test, but it does not help a model trained from scratch, and the first synthetic set even lowered real-world accuracy (0.75 → 0.60). Grad-CAM combined with a simple real-world test exposed a \"person visible → topwear\" shortcut that a 98.7 % test score hides. Two iterations of flat-lay synthetic data balanced the real-world errors (macro-F1 0.75) but did not close the ~24 pp gap between catalog and real-world accuracy. Real flat-lay photos and garment segmentation before classification are the most promising next steps."));

// refs
c.push(H1("References"));
[
  "Z. Liu, H. Mao, C.-Y. Wu, C. Feichtenhofer, T. Darrell, S. Xie, \"A ConvNet for the 2020s,\" CVPR 2022.",
  "A. Sauer, D. Lorenz, A. Blattmann, R. Rombach, \"Adversarial Diffusion Distillation,\" arXiv:2311.17042, 2023.",
  "R. R. Selvaraju et al., \"Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization,\" ICCV 2017.",
  "P. Aggarwal, \"Fashion Product Images (Small),\" Kaggle; HF mirror: huggingface.co/datasets/ashraq/fashion-product-images-small.",
  "Neurohive, \"Convolutional Neural Network (CNN): How It Works, With PyTorch\" (ConvNeXt section), https://neurohive.io/en/guides/convolutional-neural-network/",
  "R. Wightman, \"PyTorch Image Models (timm),\" GitHub, 2019–2026.",
].forEach((r) => c.push(new Paragraph({ numbering: { reference: "ref", level: 0 }, children: [new TextRun({ text: r, size: 20 })], spacing: { after: 60 } })));

// ---------- document ----------
const doc = new Document({
  creator: "A2 Computer Vision",
  title: "Level-Up Clothing Classification",
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 34, bold: true, color: "1F4E79" }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 28, bold: true, color: "1F4E79" }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 23, bold: true, color: "2E5C8A" }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      { reference: "ref", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "[%1]", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 500 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1300, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "777777" })] })] }) },
    children: c,
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("written", OUT); });
