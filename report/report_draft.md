# Level-Up Clothing Classification with SOTA Computer Vision and an Interactive Demo

**Course:** Computer Vision, Astana IT University. **Instructor:** Nurym Kaiyrkhan
**Student:** _TODO name, group_
**Links:** GitHub: https://github.com/AlleSH419/clothing-classification-A2 · Colab app: https://colab.research.google.com/drive/1AKU5sftyO1XpXhpPCqnWl0lzfOAZEaMc?usp=sharing · Demo video: _TODO_

---

## 1. Introduction
Automatic clothing categorization is a core task for e-commerce search, inventory tagging and recommendation. This work classifies product images into five garment groups (bottomwear, footwear, headwear, topwear, underwear). We upgrade a simple CNN baseline with (1) a modern ImageNet-pretrained ConvNeXt-Tiny backbone and (2) text-to-image synthetic data generated with SD-Turbo for the weakest classes. We add Grad-CAM explanations and ship an interactive Gradio demo.

## 2. Dataset update
* **Source:** Fashion Product Images (Small), a public catalog of 44,072 product photos (Hugging Face `ashraq/fashion-product-images-small`).
* **Class mapping (subCategory → class):** Shoes→footwear, Innerwear→underwear, Topwear→topwear, Headwear→headwear, Bottomwear→bottomwear.
* **Size and balance:** 300 random images per class (headwear has 293 available), 1,493 real images in total. Stratified 70/15/15 split → 1,045 train / 223 val / 225 test.
* **Augmentation (train only):** resize 224×224, horizontal flip, random rotation ±15°, color jitter (brightness, contrast, saturation 0.3), ImageNet normalization.
* **Synthetic share:** +100 headwear and +100 underwear images from SD-Turbo. Synthetic images make up 200 / 1,245 = **16.1 %** of the augmented training set and 0 % of val and test.

| Class | Train | Val | Test | Synthetic (train) |
|---|---|---|---|---|
| bottomwear | 210 | 45 | 45 | 0 |
| footwear | 210 | 45 | 45 | 0 |
| headwear | 205 | 43 | 45 | 100 |
| topwear | 210 | 45 | 45 | 0 |
| underwear | 210 | 45 | 45 | 100 |

## 3. SOTA methods
### 3.1 ConvNeXt-Tiny (transfer learning)
ConvNeXt (Liu et al., 2022, "A ConvNet for the 2020s") modernizes ResNet with Transformer-era design choices: a patchify stem (4×4 stride-4 convolution), inverted bottlenecks, large 7×7 depthwise kernels, LayerNorm instead of BatchNorm, GELU activations and fewer normalization layers. It matches Swin Transformers in accuracy while keeping the simplicity and speed of a pure CNN. We fine-tune the ImageNet-pretrained Tiny variant (28 M parameters) end to end with AdamW (lr 1e-4, cosine schedule, 6 epochs).

_Diagram: input 224² → stem 4×4/4 → Stage1 (×3) → Stage2 (×3) → Stage3 (×9) → Stage4 (×3) → GAP → LayerNorm → FC(5)_
_TODO: cite Neurohive page (assignment requirement)_

**Why it helps:** the baseline confuses visually similar small items (underwear ↔ headwear and topwear). Pretrained features capture fabric texture and shape far better than a CNN trained from scratch on about 1k images.

### 3.2 Synthetic data with SD-Turbo
SD-Turbo is a distilled Stable Diffusion model trained with Adversarial Diffusion Distillation (ADD). It produces an image in **one denoising step**. We prompt it with templates such as *"e-commerce product photo of a {color} {item}, isolated on plain white background, centered, studio lighting, no person"* across 8 item types × 10 colors per class, to fill the long tail of the weakest classes.

**Why it helps:** it adds intra-class diversity (colors and item sub-types) to the classes with the lowest baseline recall, at a cost of about 0.1 s per image on a T4.

## 4. Experiments
**Setup:** Google Colab, NVIDIA T4, PyTorch + timm, batch size 32, cross-entropy loss. The best checkpoint is chosen by validation accuracy. Latency is measured at batch size 1 on GPU, averaged over 50 runs.

### 4.1 Main results (test, 225 images)
| Model | Accuracy | Macro-F1 | Params | Latency | Train time |
|---|---|---|---|---|---|
| Baseline CNN (A1-style) | 0.809 | 0.802 | 0.39 M | 0.8 ms | 89 s |
| ConvNeXt-Tiny | **0.982** | **0.982** | 27.8 M | 5.9 ms | 161 s |

Per-class F1, baseline → ConvNeXt: bottomwear 0.921→1.000, footwear 0.889→1.000, headwear 0.688→0.977, topwear 0.854→0.978, underwear 0.657→0.956.

### 4.2 Ablation: with and without synthetic data
| Model | Real only | Real + synthetic | Δ Macro-F1 |
|---|---|---|---|
| Baseline CNN | 0.802 (acc 0.809) | 0.791 (acc 0.800) | −0.011 |
| ConvNeXt-Tiny | 0.982 (acc 0.982) | **0.987 (acc 0.987)** | **+0.005** |

Per-class F1 for ConvNeXt, real → real+synthetic: headwear 0.977 → **1.000** (recall 0.956 → 1.000), underwear 0.956 → 0.967, bottomwear 1.000 → 0.989, topwear 0.978 → 0.978, footwear 1.000 → 1.000. For the baseline, real → real+synthetic: headwear 0.688 → 0.681, underwear 0.657 → 0.638.

**Discussion.** Synthetic images help the pretrained ConvNeXt: both targeted classes improve, and the remaining headwear errors disappear. They do not help the CNN trained from scratch. SD-Turbo images are rendered at high resolution with soft studio shading, while the real catalog images are small (60×80) and flat. A network with no pretrained prior learns these generator-specific cues instead of garment shape, so the domain gap outweighs the extra diversity. Also, several "underwear" generations look like athletic shorts, which overlap with bottomwear. Training on synthetic data adds about 18 % training time and does not change inference cost (the latency difference, 5.9 → 6.8 ms, is measurement noise). With one seed and 225 test images, the ConvNeXt gain equals one image, so it should be read as "no harm, small benefit on the targeted classes" rather than a significant improvement.

_Figures: results/screenshots/synthetic_samples.webp, convnext_syn_curves.png, baseline_syn_curves.png_

### 4.3 Training curves and confusion matrices
_Figures: results/baseline_cnn.png, results/convnext_tiny.png_
The baseline's validation accuracy fluctuates strongly (0.63–0.86), and its main error is underwear predicted as headwear or topwear (only 23/45 correct). ConvNeXt converges within 1–2 epochs. Its only errors are 2 headwear→underwear and 2 underwear→topwear.

## 5. Explainability
_Figure: results/screenshots/gradcam_examples.webp_ (2 test images per class, convnext_tiny_syn, all predicted correctly with confidence 0.99–1.00).
Grad-CAM on the last ConvNeXt stage shows that the model looks at the garment, not the white background. For bottomwear it attends to the legs and trousers. For footwear it attends to the toe and front of the shoe. For headwear it covers the whole cap, crown and visor. For underwear it attends to the briefs and waistband area. For topwear the heatmap covers the torso but also spreads to the model's face and neck. This shows a shortcut risk: the classifier partly uses "a person's upper body is visible" as a cue for topwear. That could cause errors on topwear photographed flat without a model, and it motivates SAM-style garment masking as future work.

## 6. Demo application
Gradio app running in Colab: upload or webcam → top-5 probabilities → Grad-CAM overlay → latency (per request and running average) plus device and environment info.
End-to-end latency in the app is 10–16 ms per image on a Tesla T4 (torch 2.14, Python 3.13). This includes preprocessing and transfer, so it is higher than the 6.8 ms pure forward pass.

**Real-world test (own phone photos, items lying flat on a carpet):**

| Photo | Prediction | Correct? | Grad-CAM focus |
|---|---|---|---|
| Track pants | bottomwear 94 % | ✅ | crotch / leg split |
| Knit beanie | headwear 100 % | ✅ | rounded side contour |
| T-shirt (flat, no person) | **underwear 98 %** | ❌ (topwear) | small patch on the chest |

_Screenshots: results/screenshots/app_pants.webp, app_beanie.webp, app_tshirt_fail.webp_

The T-shirt failure confirms the shortcut found in Section 5. In the training catalog, almost every topwear image shows the garment worn by a model, while flat-lying cotton items without a person are mostly undershirts and vests from the Innerwear category. The model learned "flat cotton garment with no person → underwear" instead of the garment's shape. The 98.7 % test accuracy therefore measures in-distribution performance only. Fixes include adding flat-lay topwear photos, background and person removal (SAM-style masking) before classification, and stronger augmentation such as random crops and background replacement.

## 7. Ethics and limitations
* **Data:** a public e-commerce catalog. Many images show professional models wearing the garments, including underwear, with visible faces. They are published retail photos used for non-commercial research, not images of private individuals. We do not redistribute the raw images (the notebook downloads them from the original source), and the app does not store uploads.
* **Synthetic media:** clearly labeled through file names, figure titles and the app description. It is excluded from evaluation to avoid inflated metrics.
* **Bias:** the catalog comes from one retailer, has mostly white backgrounds and a South-Asian fashion distribution. Performance on street photos or worn clothing is expected to drop.
* **Misuse and generated content:** low risk. The generator prompts explicitly ask for "no person". Even so, SD-Turbo sometimes rendered partial bodies (legs or torso, never faces) for underwear prompts. Its built-in safety checker is disabled by default in diffusers. Samples were reviewed visually in a grid, all synthetic images are labeled SYNTHETIC, and none are shown publicly in the app.
* **Limitations:** small test set (225 images), single seed, the "topwear" class mixes shirts and jackets.

## 8. Reproducibility
See README: open the notebook in Colab with a T4 GPU, then Run all (about 20 min). Weights are saved to `/content/*.pt`. The local app runs with `python app/app.py --weights convnext_tiny.pt`.

## 9. Conclusion
_TODO_

## References
1. Z. Liu et al., "A ConvNet for the 2020s," CVPR 2022.
2. A. Sauer et al., "Adversarial Diffusion Distillation," arXiv:2311.17042, 2023 (SD-Turbo).
3. R. Selvaraju et al., "Grad-CAM," ICCV 2017.
4. P. Aggarwal, Fashion Product Images Dataset, Kaggle / Hugging Face.
5. _TODO Neurohive link(s)_
