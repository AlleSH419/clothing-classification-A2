# Clothing Classification with SOTA CV + Demo (Assignment 2)

Astana IT University, Computer Vision, Assignment 2.

The project classifies clothing images into **5 classes**: `bottomwear`, `footwear`, `headwear`, `topwear`, `underwear`.
It compares a simple CNN baseline against **ConvNeXt-Tiny** (transfer learning). It adds **synthetic training data generated with SD-Turbo** and runs an ablation with and without it. It explains predictions with **Grad-CAM** in an interactive **Gradio** app that runs in Google Colab.

| Resource | Link |
|---|---|
| Colab notebook (app + training) | [Open in Colab](https://colab.research.google.com/drive/1AKU5sftyO1XpXhpPCqnWl0lzfOAZEaMc?usp=sharing) |
| Demo video | [Google Drive folder](https://drive.google.com/drive/folders/1bbq25MwW8DvBIzF6LCfoBJexVg46V8Jh?usp=sharing) |
| Report (PDF) | [report/A2_Report.pdf](report/A2_Report.pdf) |

**Author:** Kurmantayev Ali, SE-2431

### Real-world test (20 own phone photos, flat-lay)

| Model | Catalog test acc | Real-world acc | Real-world macro-F1 |
|---|---|---|---|
| ConvNeXt | 0.982 | 0.75 | 0.72 |
| ConvNeXt + syn | 0.987 | 0.60 | 0.56 |
| ConvNeXt v2 (+ flat-lay synthetic, strong aug) | 0.991 | 0.75 | 0.73 |
| **ConvNeXt v3** (clean flat-lay prompts) | 0.987 | 0.75 | **0.75** |

There is a gap of about 24 pp between catalog and real-world accuracy, so the domain gap is the main open problem (see report, Section 6.1).

## Pipeline

```
Fashion Product Images (HF) ──► 5-class subset (300/class, 70/15/15 split)
                                   │
            ┌──────────────────────┼─────────────────────────────┐
            ▼                      ▼                             ▼
     Baseline CNN          ConvNeXt-Tiny (ImageNet)     SD-Turbo synthetic images
     (from scratch)        fine-tuned                   (+100 headwear, +100 underwear)
            │                      │                             │
            └──────────► metrics, ablation ◄─────────────────────┘
                                   │
                                   ▼
              Gradio app: upload/camera → prediction → Grad-CAM + latency
```

## Dataset

* Source: [Fashion Product Images (Small)](https://huggingface.co/datasets/ashraq/fashion-product-images-small), a public e-commerce catalog of product photos.
* Mapping from `subCategory`: Shoes→footwear, Innerwear→underwear, Topwear→topwear, Headwear→headwear, Bottomwear→bottomwear.
* 300 images per class (headwear has 293), split 70/15/15 → train 1045 / val 223 / test 225.
* Augmentation: resize 224×224, horizontal flip, rotation ±15°, color jitter, ImageNet normalization.
* Synthetic data: 200 images generated with `stabilityai/sd-turbo` (1 step, 512→256 px). Files are named `synthetic_*.jpg` and are used **only in train**, never in val or test.

## Results (test set, 225 images)

| Model | Train data | Accuracy | Macro-F1 | Latency (T4, bs=1) |
|---|---|---|---|---|
| Baseline CNN | real | 0.809 | 0.802 | 0.8 ms |
| ConvNeXt-Tiny | real | **0.982** | **0.982** | 5.9 ms |
| Baseline CNN | real + synthetic | 0.800 | 0.791 | 0.8 ms |
| ConvNeXt-Tiny | real + synthetic | **0.987** | **0.987** | 6.8 ms |
| ConvNeXt-Tiny v2 | + flat-lay synthetic, strong aug | 0.991 | 0.991 | 7.8 ms |
| **ConvNeXt-Tiny v3** (final model) | + cleaned flat-lay synthetic | 0.987 | 0.987 | 8.5 ms |

Synthetic data helps the pretrained ConvNeXt (headwear errors 2 → 0, +0.45 pp accuracy) but not the from-scratch CNN (−1.1 pp). The CNN cannot bridge the domain gap between 512-px generated images and 60×80 catalog photos. With a single seed and 225 test images, both differences are within noise (1–2 images).

Training curves, confusion matrices, Grad-CAM examples and synthetic samples are in [`results/`](results/).

## How to run

### Colab (recommended)
1. Open the notebook in Colab: **Runtime → Change runtime type → T4 GPU**.
2. **Runtime → Run all**. The cells run in this order: data → baseline → ConvNeXt → synthetic generation → ablation → Grad-CAM + app → flat-lay generation (v2) → v3 → real-world evaluation. The whole run takes about 35 minutes.
3. The app cell prints a public `https://*.gradio.live` link (temporary). Set `MODEL_NAME = "convnext_tiny_v3"` in it to use the final model.

### Local
```bash
pip install -r requirements.txt
python app/app.py --weights convnext_tiny_v3.pt
```
`convnext_tiny_v3.pt` is saved by the notebook in `/content/`. Download it from the Colab file panel.

## Repository structure

```
notebooks/clothing_A2.ipynb   full pipeline (Colab)
app/app.py                    local Gradio app
app/colab_app_cell.py         Grad-CAM gallery + Gradio app cell used in Colab
results/                      plots, metrics (summary.csv), app and real-world screenshots
report/A2_Report.pdf          report
```

## Ethics

* The dataset is a public e-commerce catalog. Many images show professional models wearing the items, including underwear, with visible faces. These are published retail photos, not private individuals, and they are used only for research. The app does not store uploaded images.
* Synthetic images are clearly labeled (file names, figure titles, app description) and kept out of the evaluation sets.
* Limitation: catalog images on white backgrounds, so accuracy on real-world photos (cluttered scenes, worn clothing) will be lower.
