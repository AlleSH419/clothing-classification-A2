# ===== Colab cell: Grad-CAM gallery for the report + Gradio app =====
# Run after the training cells (uses CLASSES, test_tf, dev, timm, torch, glob, plt, np, time).
import gradio as gr, platform
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from PIL import Image

MODEL_NAME = "convnext_tiny_v3"  # final model (see report, Section 6.1)
model = timm.create_model("convnext_tiny", pretrained=False, num_classes=5)
model.load_state_dict(torch.load(f"/content/{MODEL_NAME}.pt")); model.to(dev).eval()
cam = GradCAM(model=model, target_layers=[model.stages[-1]])

def run(img):
    x = test_tf(img).unsqueeze(0).to(dev)
    with torch.no_grad(): p = torch.softmax(model(x), 1)[0].cpu()
    g = cam(input_tensor=x, targets=None)[0]
    rgb = np.array(img.resize((224, 224))).astype(np.float32) / 255
    return p, show_cam_on_image(rgb, g, use_rgb=True)

# --- Grad-CAM gallery (2 test images per class) for the report ---
fig, ax = plt.subplots(2, 10, figsize=(22, 5))
for ci, c in enumerate(CLASSES):
    for k, f in enumerate(sorted(glob.glob(f"/content/data/test/{c}/*.jpg"))[:2]):
        img = Image.open(f).convert("RGB"); p, heat = run(img)
        col = ci * 2 + k
        ax[0, col].imshow(img.resize((224, 224))); ax[0, col].set_title(f"true: {c}", fontsize=9)
        ax[1, col].imshow(heat); ax[1, col].set_title(f"pred: {CLASSES[p.argmax()]} {p.max():.2f}", fontsize=9)
        ax[0, col].axis("off"); ax[1, col].axis("off")
fig.suptitle(f"Grad-CAM explanations ({MODEL_NAME})", fontsize=14)
plt.tight_layout(); plt.savefig("/content/results/gradcam_examples.png", dpi=120); plt.show()

# --- Gradio app ---
LAT = []
def predict(img):
    if img is None: return None, None, ""
    img = img.convert("RGB")
    x = test_tf(img).unsqueeze(0).to(dev)
    torch.cuda.synchronize(); t = time.time()
    with torch.no_grad(): p = torch.softmax(model(x), 1)[0].cpu()
    torch.cuda.synchronize(); ms = (time.time() - t) * 1000; LAT.append(ms)
    _, heat = run(img)
    info = (f"Latency: {ms:.1f} ms (avg {np.mean(LAT):.1f} ms over {len(LAT)} runs)\n"
            f"Device: {torch.cuda.get_device_name(0)} | torch {torch.__version__} | Python {platform.python_version()}\n"
            f"Model: {MODEL_NAME}")
    return {c: float(p[i]) for i, c in enumerate(CLASSES)}, heat, info

examples = [sorted(glob.glob(f"/content/data/test/{c}/*.jpg"))[0] for c in CLASSES]
demo = gr.Interface(
    fn=predict,
    inputs=gr.Image(type="pil", sources=["upload", "webcam"], label="Upload a photo or use the camera"),
    outputs=[gr.Label(num_top_classes=5, label="Prediction"),
             gr.Image(label="Grad-CAM explanation"),
             gr.Textbox(label="Latency & environment")],
    examples=examples,
    title="Clothing Classifier: ConvNeXt-Tiny + Grad-CAM",
    description=("Classes: bottomwear, footwear, headwear, topwear, underwear. "
                 "Part of the training data is SYNTHETIC (generated with SD-Turbo) and labeled as such. "
                 "Uploaded images are not stored."),
)
demo.launch(share=True)
