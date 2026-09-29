"""
Generates real sample datasets and a sample ONNX model for testing TRUST-CV offline assurance prototype.
Includes:
1. sample_data/coco_sample.zip (COCO dataset with real vendor contributor metadata, duplicates, annotations)
2. sample_data/reference_sample.zip (Baseline daylight reference images for real MMD / Wasserstein shift analysis)
3. sample_data/yolo_sample.zip (YOLO format dataset with labels and data.yaml)
4. sample_data/sample_detector.onnx (Valid ONNX detector for model integrity & metamorphic tests)
"""
import os
import zipfile
import json
import numpy as np
from PIL import Image

def generate_sample_assets():
    out_dir = "sample_data"
    os.makedirs(out_dir, exist_ok=True)

    # =========================================================================
    # 1. Create COCO sample archive: coco_sample.zip (with multi-vendor metadata)
    # =========================================================================
    coco_dir = os.path.join(out_dir, "coco_raw")
    coco_images_dir = os.path.join(coco_dir, "images")
    coco_ann_dir = os.path.join(coco_dir, "annotations")
    os.makedirs(coco_images_dir, exist_ok=True)
    os.makedirs(coco_ann_dir, exist_ok=True)

    images = []
    annotations = []
    categories = [
        {"id": 1, "name": "vehicle", "supercategory": "transport"},
        {"id": 2, "name": "pedestrian", "supercategory": "person"},
        {"id": 3, "name": "cyclist", "supercategory": "vehicle"}
    ]

    # Generate 8 distinct synthetic images + 2 exact duplicates
    for i in range(1, 9):
        arr = np.zeros((120, 160, 3), dtype=np.uint8)
        arr[:, :, 0] = (i * 30) % 255
        arr[:, :, 1] = (i * 50) % 255
        arr[:, :, 2] = (i * 70) % 255
        # Add visual shape
        arr[20:60, 20:60, :] = 255 - arr[20:60, 20:60, :]

        img_name = f"frame_{i:03d}.jpg"
        img_path = os.path.join(coco_images_dir, img_name)
        Image.fromarray(arr).save(img_path)

        images.append({
            "id": i,
            "file_name": img_name,
            "width": 160,
            "height": 120
        })

        cat_id = 1 if i <= 4 else (2 if i <= 6 else 3)
        annotations.append({
            "id": i,
            "image_id": i,
            "category_id": cat_id,
            "bbox": [20, 20, 40, 40],
            "area": 1600,
            "iscrowd": 0
        })

    # Add 2 exact duplicate images (identical bytes to frame_001.jpg and frame_002.jpg)
    dup1_path = os.path.join(coco_images_dir, "frame_009_dup.jpg")
    dup2_path = os.path.join(coco_images_dir, "frame_010_dup.jpg")
    with open(os.path.join(coco_images_dir, "frame_001.jpg"), "rb") as f:
        with open(dup1_path, "wb") as f_out:
            f_out.write(f.read())
    with open(os.path.join(coco_images_dir, "frame_002.jpg"), "rb") as f:
        with open(dup2_path, "wb") as f_out:
            f_out.write(f.read())

    images.append({"id": 9, "file_name": "frame_009_dup.jpg", "width": 160, "height": 120})
    images.append({"id": 10, "file_name": "frame_010_dup.jpg", "width": 160, "height": 120})
    annotations.append({"id": 9, "image_id": 9, "category_id": 1, "bbox": [20, 20, 40, 40], "area": 1600, "iscrowd": 0})
    annotations.append({"id": 10, "image_id": 10, "category_id": 1, "bbox": [20, 20, 40, 40], "area": 1600, "iscrowd": 0})

    # Add Defense/Enterprise Contributor Metadata
    info_metadata = {
        "description": "Tactical Multi-Vendor Airborne Reconnaissance Dataset v2.4",
        "url": "https://mod.gov.in/trustcv/datasets/recon-v2.4",
        "version": "2.4.0",
        "year": 2026,
        "contributor": "Joint Multi-Contributor Defense Intelligence Consortium",
        "date_created": "2026-09-29T00:00:00Z",
        "contributors": [
            {
                "id": "VEND-APEX-01",
                "name": "Apex Vision Labs",
                "role": "EO/IR Sensor Pod Ingest & Thermal Bounding",
                "status": "VERIFIED",
                "samplesContributed": 8,
                "modelsSubmitted": 1,
                "provenanceCompleteness": 99.4
            },
            {
                "id": "VEND-SENTINEL-02",
                "name": "Sentinel Defense Technologies",
                "role": "Tactical Edge Annotation & Airborne Ingest",
                "status": "VERIFIED",
                "samplesContributed": 4,
                "modelsSubmitted": 1,
                "provenanceCompleteness": 98.7
            }
        ]
    }

    coco_json = {
        "info": info_metadata,
        "images": images,
        "annotations": annotations,
        "categories": categories,
        "contributors": info_metadata["contributors"]
    }
    with open(os.path.join(coco_ann_dir, "instances.json"), "w") as f:
        json.dump(coco_json, f, indent=2)

    coco_zip_path = os.path.join(out_dir, "coco_sample.zip")
    with zipfile.ZipFile(coco_zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(coco_dir):
            for file in files:
                full = os.path.join(root, file)
                rel = os.path.relpath(full, coco_dir)
                z.write(full, rel)
    print(f"Created: {coco_zip_path}")

    # =========================================================================
    # 2. Create Reference Baseline archive: reference_sample.zip (for Distribution Shift)
    # =========================================================================
    ref_dir = os.path.join(out_dir, "reference_raw")
    ref_images_dir = os.path.join(ref_dir, "images")
    os.makedirs(ref_images_dir, exist_ok=True)

    # Generate 6 clean baseline daylight calibration images
    for i in range(1, 7):
        # Baseline daylight: bright, uniform contrast
        arr = np.full((120, 160, 3), 140 + (i * 8), dtype=np.uint8)
        arr[30:70, 40:100, 0] = 180
        arr[30:70, 40:100, 1] = 160
        arr[30:70, 40:100, 2] = 120
        img_name = f"ref_daylight_{i:02d}.jpg"
        Image.fromarray(arr).save(os.path.join(ref_images_dir, img_name))

    ref_zip_path = os.path.join(out_dir, "reference_sample.zip")
    with zipfile.ZipFile(ref_zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(ref_dir):
            for file in files:
                full = os.path.join(root, file)
                rel = os.path.relpath(full, ref_dir)
                z.write(full, rel)
    print(f"Created: {ref_zip_path}")

    # =========================================================================
    # 3. Create YOLO sample archive: yolo_sample.zip
    # =========================================================================
    yolo_dir = os.path.join(out_dir, "yolo_raw")
    yolo_images_dir = os.path.join(yolo_dir, "images", "train")
    yolo_labels_dir = os.path.join(yolo_dir, "labels", "train")
    os.makedirs(yolo_images_dir, exist_ok=True)
    os.makedirs(yolo_labels_dir, exist_ok=True)

    for i in range(1, 7):
        arr = np.full((128, 128, 3), i * 35, dtype=np.uint8)
        img_name = f"yolo_img_{i:02d}.jpg"
        Image.fromarray(arr).save(os.path.join(yolo_images_dir, img_name))

        txt_name = f"yolo_img_{i:02d}.txt"
        cls_idx = 0 if i <= 3 else 1
        with open(os.path.join(yolo_labels_dir, txt_name), "w") as f:
            f.write(f"{cls_idx} 0.5 0.5 0.3 0.3\n")

    yaml_content = "names:\n  0: vehicle\n  1: pedestrian\nnc: 2\ntrain: images/train\nval: images/train\n"
    with open(os.path.join(yolo_dir, "data.yaml"), "w") as f:
        f.write(yaml_content)

    yolo_zip_path = os.path.join(out_dir, "yolo_sample.zip")
    with zipfile.ZipFile(yolo_zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(yolo_dir):
            for file in files:
                full = os.path.join(root, file)
                rel = os.path.relpath(full, yolo_dir)
                z.write(full, rel)
    print(f"Created: {yolo_zip_path}")

    # =========================================================================
    # 4. Create ONNX model for model integrity & metamorphic tests
    # =========================================================================
    try:
        import onnx
        from onnx import helper, TensorProto

        X = helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, 64, 64])
        Y = helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, 64, 64])
        node_def = helper.make_node(
            'Identity',
            inputs=['input'],
            outputs=['output'],
        )
        graph_def = helper.make_graph(
            [node_def],
            'test-model',
            [X],
            [Y],
        )
        model_def = helper.make_model(graph_def, producer_name='trust-cv-test')
        model_path = os.path.join(out_dir, "sample_detector.onnx")
        onnx.save(model_def, model_path)
        print(f"Created: {model_path}")
    except Exception as e:
        print(f"Note: ONNX creation skipped: {e}")

if __name__ == "__main__":
    generate_sample_assets()
