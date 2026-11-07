"""Local Gradio demo: upload/camera -> prediction -> Grad-CAM heatmap + latency.

Usage:
    pip install -r requirements.txt
    python app/app.py --weights convnext_tiny_v3.pt

The weights file is produced by the Colab notebook (notebooks/clothing_A2.ipynb).
"""
import argparse
import platform
import time

import gradio as gr
import numpy as np
import timm
import torch
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from torchvision import transforms

CLASSES = ["bottomwear", "footwear", "headwear", "topwear", "underwear"]
MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)
TF = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), transforms.Normalize(MEAN, STD)])


def build(weights: str, device: str):
    model = timm.create_model("convnext_tiny", pretrained=False, num_classes=len(CLASSES))
    model.load_state_dict(torch.load(weights, map_location=device))
    return model.to(device).eval()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default="convnext_tiny_v3.pt")
    ap.add_argument("--share", action="store_true")
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = build(args.weights, device)
    cam = GradCAM(model=model, target_layers=[model.stages[-1]])
    dev_name = torch.cuda.get_device_name(0) if device == "cuda" else platform.processor() or "CPU"
    latencies = []

    def predict(img):
        if img is None:
            return None, None, ""
        img = img.convert("RGB")
        x = TF(img).unsqueeze(0).to(device)
        if device == "cuda":
            torch.cuda.synchronize()
        t = time.time()
        with torch.no_grad():
            p = torch.softmax(model(x), 1)[0].cpu()
        if device == "cuda":
            torch.cuda.synchronize()
        ms = (time.time() - t) * 1000
        latencies.append(ms)
        heat_map = cam(input_tensor=x, targets=None)[0]
        rgb = np.array(img.resize((224, 224))).astype(np.float32) / 255
        heat = show_cam_on_image(rgb, heat_map, use_rgb=True)
        info = (f"Latency: {ms:.1f} ms (avg {np.mean(latencies):.1f} ms over {len(latencies)} runs)\n"
                f"Device: {dev_name} | torch {torch.__version__} | Python {platform.python_version()}")
        return {c: float(p[i]) for i, c in enumerate(CLASSES)}, heat, info

    demo = gr.Interface(
        fn=predict,
        inputs=gr.Image(type="pil", sources=["upload", "webcam"], label="Upload a photo or use the camera"),
        outputs=[gr.Label(num_top_classes=5, label="Prediction"),
                 gr.Image(label="Grad-CAM explanation"),
                 gr.Textbox(label="Latency & environment")],
        title="Clothing Classifier: ConvNeXt-Tiny + Grad-CAM",
        description=("Classes: bottomwear, footwear, headwear, topwear, underwear. "
                     "Part of the training data is SYNTHETIC (generated with SD-Turbo) and labeled as such. "
                     "Uploaded images are not stored."),
    )
    demo.launch(share=args.share)


if __name__ == "__main__":
    main()
